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

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rollLaunderProfit() {
  const luck = randInt(1, 100);
  if (luck <= 70) return randInt(250, 800);
  if (luck <= 95) return randInt(801, 1200);
  return randInt(1201, 1500);
}

export default {
  name: "lavar",
  aliases: ["lavardinheiro"],
  description: "Chefe do Crime lava dinheiro sujo para lucrar, mas com alto risco de prisão",
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
      if (userJob !== "chefe_do_crime") {
        return sock.sendMessage(from, { text: `🕴️ *${pushName}*, apenas o *Chefe do Crime* sabe como lavar dinheiro.` }, { quoted: msg });
      }

      if (!luckyDB[from]) luckyDB[from] = {};
      if (!luckyDB[from][sender]) luckyDB[from][sender] = { money: 0 };
      
      const chefe = luckyDB[from][sender];

      // Cooldown de lavagem (1 hora)
      if (chefe.lastLavarAt && now - chefe.lastLavarAt < 60 * 60 * 1000) {
        const left = 60 * 60 * 1000 - (now - chefe.lastLavarAt);
        return sock.sendMessage(from, { text: `⏳ *${pushName}*, os esquemas estão quentes! Aguarde *${formatTimeLeft(left)}* para lavar dinheiro de novo.` }, { quoted: msg });
      }

      // Preço pra lavar
      const cost = 2500;
      if ((chefe.money || 0) < cost) {
        return sock.sendMessage(from, { text: `💸 Você precisa de pelo menos *${formatMoney(cost)} fyne coins* de dinheiro sujo para usar o esquema!` }, { quoted: msg });
      }

      chefe.lastLavarAt = now;
      
      // 30% de chance de dar merda (prisão direta de 8h, perde o investimento)
      const isArrested = randInt(0, 99) < 30;

      if (isArrested) {
        chefe.money -= cost;
        const jailTimeMs = 8 * 60 * 60 * 1000; // 8 horas direto
        chefe.jailUntil = now + jailTimeMs;
        chefe.lastJailAt = now;
        
        // strikes
        if (now - (chefe.lastJailAt || 0) >= ECONOMY_CONFIG.STRIKE_RESET_MS) {
            chefe.jailStrikes = 0;
        }
        chefe.jailStrikes = (chefe.jailStrikes || 0) + 1;
        
        saveJSON(dbLuckyPath, luckyDB);

        const text = `🚨 *OPERAÇÃO FEDERAL!*\n\nA casa caiu, @${sender.split("@")[0]}!\nA Receita Federal descobriu suas empresas fantasmas e confiscou seus *${formatMoney(cost)} fyne coins*!\n\n` +
                     `🚔 Você foi preso direto e ficará em regime fechado por *${formatTimeLeft(jailTimeMs)}*.`;
        return sock.sendMessage(from, { text, mentions: [sender] }, { quoted: msg });
      }

      // Sucesso! Dinheiro lavado volta com lucro
      const profit = rollLaunderProfit();
      chefe.money += profit; // Retorna o custo + lucro

      saveJSON(dbLuckyPath, luckyDB);

      const text = `🕴️💼 *DINHEIRO LAVADO!*\n\n@${sender.split("@")[0]} movimentou o dinheiro nas ilhas Cayman com sucesso!\n\n` +
                   `💸 Seu esquema gerou um lucro limpo de *${formatMoney(profit)} fyne coins*!`;

      await sock.sendMessage(from, { text, mentions: [sender] }, { quoted: msg });

      // Conquista de lavagem bem-sucedida
      await grantJobActionAchievement({
          sock, groupId: from, user: sender,
          actionStat: "lavar_success",
          targetIds: ["ja_lavar_5"],
          quoted: msg, pushName
      });

    } catch (err) {
      console.error("Erro no comando lavar:", err);
      await sock.sendMessage(from, { text: "❌ Erro ao tentar lavar dinheiro." }, { quoted: msg });
    }
  }
};
