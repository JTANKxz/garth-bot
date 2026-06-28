import fs from "fs";
import path from "path";
import { ECONOMY_CONFIG } from "../../features/jobs/catalog.js";
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

function formatTimeLeft(ms) {
  const totalMinutes = Math.ceil(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h <= 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export default {
  name: "defender",
  aliases: ["advogar"],
  description: "Advogado usa seu poder legal para cortar a pena e fiança do cliente pela metade",
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
      if (userJob !== "advogado") {
        return sock.sendMessage(from, { text: `👨‍⚖️ *${pushName}*, apenas *Advogados* podem usar este comando.` }, { quoted: msg });
      }

      let target;
      if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
        target = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
      } else if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
        target = msg.message.extendedTextMessage.contextInfo.participant;
      }

      if (!target || target === sender) {
        return sock.sendMessage(from, { text: "👤 Mencione o cliente que deseja defender." }, { quoted: msg });
      }

      const client = luckyDB[from]?.[target];
      if (!client || !client.jailUntil || client.jailUntil <= now) {
        return sock.sendMessage(from, { text: `✅ Este usuário não está preso no momento.` }, { quoted: msg });
      }

      // Se já foi defendido
      if (client.defendido) {
        return sock.sendMessage(from, { text: `⚖️ Este cliente já teve sua pena reduzida por um advogado. Não é possível defender duas vezes pelo mesmo crime.` }, { quoted: msg });
      }

      // Calcula fiança original
      const strikes = client.jailStrikes || 0;
      const idx = Math.min(Math.max(strikes - 1, 0), ECONOMY_CONFIG.BAIL_COSTS.length - 1);
      const originalBail = client.bailCost > 0 ? client.bailCost : ECONOMY_CONFIG.BAIL_COSTS[idx];
      
      const newBail = Math.floor(originalBail / 2);
      client.bailCost = newBail;

      // Corta tempo de prisão restante pela metade
      const timeLeft = client.jailUntil - now;
      client.jailUntil = now + Math.floor(timeLeft / 2);
      client.defendido = true; // Marca pra não defender duas vezes

      // Advogado ganha uma taxa do cliente
      const fee = Math.floor(originalBail * 0.15); // 15% do valor da fiança
      
      // Cobra a taxa do cliente (se ele tiver)
      let feePaid = 0;
      if (client.money >= fee) {
        client.money -= fee;
        feePaid = fee;
      } else {
        feePaid = client.money || 0;
        client.money = 0;
      }

      if (!luckyDB[from][sender]) luckyDB[from][sender] = { money: 0 };
      luckyDB[from][sender].money = (luckyDB[from][sender].money || 0) + feePaid;

      saveJSON(dbLuckyPath, luckyDB);

      const mentions = [target, sender];
      const text = `👨‍⚖️ *HABEAS CORPUS CONCEDIDO!*\n\nO advogado @${sender.split("@")[0]} assumiu o caso de @${target.split("@")[0]} e fez um excelente trabalho na corte!\n\n` +
                   `⚖️ A pena e a fiança do cliente caíram pela metade!\n` +
                   `💸 Nova fiança: *${formatMoney(newBail)} fyne coins*\n` +
                   `⏳ Novo tempo preso: *${formatTimeLeft(client.jailUntil - now)}*\n\n` +
                   `💼 Honorários pagos ao advogado: *${formatMoney(feePaid)} fyne coins*`;

      await sock.sendMessage(from, { text, mentions }, { quoted: msg });

      // Conquista de defesa
      await grantJobActionAchievement({
          sock, groupId: from, user: sender,
          actionStat: "defender_count",
          targetIds: ["ja_defender_3"],
          quoted: msg, pushName
      });

    } catch (err) {
      console.error("Erro no comando defender:", err);
      await sock.sendMessage(from, { text: "❌ Erro ao defender cliente." }, { quoted: msg });
    }
  }
};
