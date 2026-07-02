import fs from "fs";
import path from "path";
import { grantJobActionAchievement } from "../../features/achievements/jobAchievements.js";

const dbLuckyPath = path.resolve("src/database/lucky.json");
const dbJobsPath = path.resolve("src/database/jobs.json");

function loadJSON(filePath) {
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify({}, null, 2));
  try {
    return JSON.parse(fs.readFileSync(filePath));
  } catch {
    return {};
  }
}

function saveJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function formatMoney(valor) {
  if (valor >= 1_000_000_000) return `${(valor).toLocaleString("pt-BR")}B`;
  if (valor >= 1_000_000) return `${(valor).toLocaleString("pt-BR")}M`;
  if (valor >= 1_000) return `${(valor).toLocaleString("pt-BR")}K`;
  return (valor).toLocaleString("pt-BR");
}

export default {
  name: "fuga",
  aliases: ["fugir", "subornar"],
  description: "Ladrão paga um suborno alto para limpar seu boletim de ocorrência antes de ser preso",
  category: "fun",

  async run({ sock, msg }) {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const pushName = msg.pushName || "Usuário";

    try {
      const luckyDB = loadJSON(dbLuckyPath);
      const jobsDB = loadJSON(dbJobsPath);
      const now = Date.now();

      const userJob = jobsDB[from]?.[sender]?.job;
      if (userJob !== "ladrao") {
        return sock.sendMessage(from, { text: `🥷 *${pushName}*, apenas o *Ladrão* tem contatos para armar uma fuga.` }, { quoted: msg });
      }

      const ladrao = luckyDB[from]?.[sender];
      if (!ladrao || !ladrao.wantedUntil || ladrao.wantedUntil <= now) {
        return sock.sendMessage(from, { text: `✅ Você não está sendo procurado pela polícia no momento.` }, { quoted: msg });
      }

      // Cooldown de 2 horas para fugas
      if (ladrao.lastFugaAt && now - ladrao.lastFugaAt < 2 * 60 * 60 * 1000) {
        const left = 2 * 60 * 60 * 1000 - (now - ladrao.lastFugaAt);
        const totalMinutes = Math.ceil(left / 60000);
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        const timeStr = h > 0 ? `${h}h ${m}min` : `${m}min`;
        return sock.sendMessage(from, { text: `⏳ Você já armou uma fuga recentemente. Aguarde *${timeStr}* para tentar de novo.` }, { quoted: msg });
      }

      // Preço da fuga
      const bribeCost = 1000; 

      if ((ladrao.money || 0) < bribeCost) {
        return sock.sendMessage(from, { text: `💸 Você precisa de *${formatMoney(bribeCost)} fyne coins* para pagar o suborno da fuga!` }, { quoted: msg });
      }

      // Paga o suborno, limpa o boletim e reseta o cooldown de roubo
      ladrao.money -= bribeCost;
      ladrao.wantedUntil = 0;
      ladrao.wantedCaseId = null;
      ladrao.arrestAttempts = 0;
      ladrao.lastRobberyCaseId = null; // fecha o caso
      ladrao.lastroubo = 0; // Zera o cooldown do roubo
      ladrao.lastFugaAt = now;

      saveJSON(dbLuckyPath, luckyDB);

      const text = `🏃‍♂️💨 *FUGA BEM-SUCEDIDA!*\n\n` +
                   `@${sender.split("@")[0]} pagou um suborno de *${formatMoney(bribeCost)} fyne coins* para apagar as câmeras de segurança!\n\n` +
                   `🚔 A polícia perdeu o seu rastro. Seu boletim de ocorrência foi cancelado.\n` +
                   `🥷 _O seu tempo de espera para roubar foi zerado!_`;

      await sock.sendMessage(from, { text, mentions: [sender] }, { quoted: msg });

      // Conquista de fuga
      await grantJobActionAchievement({
          sock, groupId: from, user: sender,
          actionStat: "fuga_count",
          targetIds: ["ja_fuga_3"],
          quoted: msg, pushName
      });

    } catch (err) {
      console.error("Erro no comando fuga:", err);
      await sock.sendMessage(from, { text: "❌ Erro ao tentar fugir." }, { quoted: msg });
    }
  }
};
