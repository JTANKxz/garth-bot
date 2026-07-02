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

export default {
  name: "curar",
  aliases: ["medico", "socorrer"],
  description: "Médico socorre um trabalhador acidentado recentemente, recuperando o dinheiro perdido",
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
      if (userJob !== "medico") {
        return sock.sendMessage(from, { text: `👨‍⚕️ *${pushName}*, apenas *Médicos* podem curar acidentados.` }, { quoted: msg });
      }

      let target;
      if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
        target = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
      } else if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
        target = msg.message.extendedTextMessage.contextInfo.participant;
      }

      if (!target || target === sender) {
        return sock.sendMessage(from, { text: "👤 Mencione o usuário acidentado que deseja curar." }, { quoted: msg });
      }

      const client = luckyDB[from]?.[target];
      if (!client || !client.lastAccidentAt) {
        return sock.sendMessage(from, { text: `✅ Este usuário não tem histórico de acidentes de trabalho recentes.` }, { quoted: msg });
      }

      // Acidente deve ter ocorrido nos últimos 15 minutos
      const ACIDENTE_WINDOW = 15 * 60 * 1000;
      if (now - client.lastAccidentAt > ACIDENTE_WINDOW) {
        return sock.sendMessage(from, { text: `⌛ Já faz muito tempo desde o acidente. O atendimento médico precisa ser feito em até 15 minutos após o ocorrido.` }, { quoted: msg });
      }

      if (client.curado) {
        return sock.sendMessage(from, { text: `🏥 O paciente já foi atendido e curado deste acidente!` }, { quoted: msg });
      }

      client.curado = true; // marca como curado para evitar duplo farm

      // 30% de chance de falhar
      const failed = Math.random() < 0.30;

      if (failed) {
        saveJSON(dbLuckyPath, luckyDB);
        const text = `🚑 *ATENDIMENTO DE EMERGÊNCIA FALHOU!*\n\nO Dr(a). @${sender.split("@")[0]} tentou socorrer @${target.split("@")[0]}, mas o procedimento foi mal sucedido!\n\n` +
                     `💔 O paciente não conseguiu recuperar os fyne coins perdidos no acidente.`;
        return sock.sendMessage(from, { text, mentions: [target, sender] }, { quoted: msg });
      }

      // Recupera o valor perdido pelo paciente
      const refund = client.lastAccidentLoss || 0;
      client.money = (client.money || 0) + refund;

      // Médico cobra os custos do plano de saúde direto da prefeitura (recompensa extra)
      const medicReward = Math.floor(refund * 0.20) + 50; // 20% do valor + base
      
      if (!luckyDB[from][sender]) luckyDB[from][sender] = { money: 0 };
      luckyDB[from][sender].money = (luckyDB[from][sender].money || 0) + medicReward;

      saveJSON(dbLuckyPath, luckyDB);

      const mentions = [target, sender];
      const text = `🚑 *ATENDIMENTO DE EMERGÊNCIA!*\n\nO Dr(a). @${sender.split("@")[0]} socorreu @${target.split("@")[0]} a tempo!\n\n` +
                   `💖 O seguro cobriu o acidente e o trabalhador recuperou *${formatMoney(refund)} fyne coins* perdidos!\n` +
                   `💼 O médico recebeu um repasse de *${formatMoney(medicReward)} fyne coins* pelo atendimento!`;

      await sock.sendMessage(from, { text, mentions }, { quoted: msg });

      // Conquista de cura
      await grantJobActionAchievement({
          sock, groupId: from, user: sender,
          actionStat: "curar_count",
          targetIds: ["ja_curar_5"],
          quoted: msg, pushName
      });

    } catch (err) {
      console.error("Erro no comando curar:", err);
      await sock.sendMessage(from, { text: "❌ Erro ao atender o paciente." }, { quoted: msg });
    }
  }
};
