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

function formatTimeLeft(ms) {
  const totalMinutes = Math.ceil(ms / 60000);
  const m = totalMinutes % 60;
  return `${m}min`;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default {
  name: "pressa",
  aliases: ["correr"],
  description: "Entregador faz uma corrida perigosa para ganhar dinheiro extra, mas com risco alto de acidente",
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
      if (userJob !== "entregador") {
        return sock.sendMessage(from, { text: `📦 *${pushName}*, apenas o *Entregador* pode fazer essas corridas com pressa.` }, { quoted: msg });
      }

      const entregador = jobsDB[from][sender];
      
      // Cooldown de 15 min
      if (entregador.lastPressaAt && now - entregador.lastPressaAt < 15 * 60 * 1000) {
        const left = 15 * 60 * 1000 - (now - entregador.lastPressaAt);
        return sock.sendMessage(from, { text: `⏳ *${pushName}*, sua moto está superaquecendo! Aguarde *${formatTimeLeft(left)}* para correr de novo.` }, { quoted: msg });
      }

      entregador.lastPressaAt = now;

      if (!luckyDB[from]) luckyDB[from] = {};
      if (!luckyDB[from][sender]) luckyDB[from][sender] = { money: 0 };
      
      // 40% de chance de bater (acidente grave)
      const acidente = randInt(0, 99) < 40;

      if (acidente) {
        const loss = randInt(100, 350);
        luckyDB[from][sender].money = Math.max(0, (luckyDB[from][sender].money || 0) - loss);
        
        // Registra o acidente para o médico poder curar
        luckyDB[from][sender].lastAccidentAt = now;
        luckyDB[from][sender].lastAccidentLoss = loss;
        luckyDB[from][sender].curado = false;

        saveJSON(dbLuckyPath, luckyDB);
        saveJSON(dbJobsPath, jobsDB);

        const text = `💥 *ACIDENTE GRAVE!*\n\n@${sender.split("@")[0]} passou no sinal vermelho e bateu a moto!\n` +
                     `💸 Custos médicos e conserto: *-${formatMoney(loss)} fyne coins*.\n\n` +
                     `_Dica: Um médico pode usar !curar para recuperar esse dinheiro._`;
        
        return sock.sendMessage(from, { text, mentions: [sender] }, { quoted: msg });
      }

      // Sucesso! Corrida extra rápida
      const extraPay = randInt(150, 350);
      luckyDB[from][sender].money = (luckyDB[from][sender].money || 0) + extraPay;

      saveJSON(dbLuckyPath, luckyDB);
      saveJSON(dbJobsPath, jobsDB);

      const text = `🛵💨 *ENTREGA A JATO!*\n\n@${sender.split("@")[0]} costurou o trânsito, cortou pelo corredor e entregou em tempo recorde!\n\n` +
                   `💸 Gorjeta extra recebida: *${formatMoney(extraPay)} fyne coins*!`;

      await sock.sendMessage(from, { text, mentions: [sender] }, { quoted: msg });

      // Conquista de entrega rápida sem acidente
      await grantJobActionAchievement({
          sock, groupId: from, user: sender,
          actionStat: "pressa_success",
          targetIds: ["ja_pressa_10"],
          quoted: msg, pushName
      });

    } catch (err) {
      console.error("Erro no comando pressa:", err);
      await sock.sendMessage(from, { text: "❌ Erro ao tentar correr com a entrega." }, { quoted: msg });
    }
  }
};
