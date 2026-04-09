import { readJSON, writeJSON } from "../../utils/readJSON.js";
import { ECONOMY_CONFIG, getJobByKey } from "../../features/jobs/catalog.js";
import { addMoney, removeMoney, formatMoney } from "../../utils/saldo.js";
import { ensureJobsUser } from "../../features/jobs/service.js";

const DB_LUCKY = "database/lucky.json";
const DB_JOBS = "database/jobs.json";

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

export default {
  name: "roubar",
  aliases: [],
  description: "Tente roubar fyne coins de outro usuário",
  category: "fun",

  async run({ sock, msg }) {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const pushName = msg.pushName || "Usuário";

    try {
      const luckyDB = readJSON(DB_LUCKY);
      const jobsDB = readJSON(DB_JOBS);
      const now = Date.now();

      const userJobs = ensureJobsUser(jobsDB, from, sender);
      
      if (userJobs.job === "policia") {
        return sock.sendMessage(from, { text: `👮 *${pushName}*, policial não rouba, policial prende! Use !prender.` }, { quoted: msg });
      }

      let target;
      if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
        target = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
      } else if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
        target = msg.message.extendedTextMessage.contextInfo.participant;
      }

      if (!target || target === sender) {
        return sock.sendMessage(from, { text: "👤 Mencione alguém válido para roubar." }, { quoted: msg });
      }

      const ladrao = luckyDB[from]?.[sender] || { money: 0, lastroubo: 0 };
      const vitima = luckyDB[from]?.[target] || { money: 0 };

      // Cooldown
      if (now - (ladrao.lastroubo || 0) < ECONOMY_CONFIG.ROUBO_COOLDOWN_MS) {
        return sock.sendMessage(from, { text: `⏳ *${pushName}*, aguarde *${formatTimeLeft(ECONOMY_CONFIG.ROUBO_COOLDOWN_MS - (now - ladrao.lastroubo))}* para roubar de novo.` }, { quoted: msg });
      }

      // Proteção
      if (vitima.items?.anti_roubo > now || (vitima.items?.vip_profile > now)) {
        ladrao.lastroubo = now;
        writeJSON(DB_LUCKY, luckyDB);
        return sock.sendMessage(from, { text: `🛡️ @${target.split("@")[0]} está sob proteção e não pôde ser roubado!`, mentions: [target] }, { quoted: msg });
      }

      let chance = 25;
      if (userJobs.job === "ladrao") chance += ECONOMY_CONFIG.THIEF_SUCCESS_BONUS;
      
      const roll = randInt(0, 99);
      let text = "";

      if (roll < chance && vitima.money > 0) {
        const percent = userJobs.job === "ladrao" ? ECONOMY_CONFIG.THIEF_ROB_PERCENT : ECONOMY_CONFIG.NORMAL_ROB_PERCENT;
        const roubado = Math.floor(vitima.money * percent);
        
        addMoney(from, sender, roubado);
        removeMoney(from, target, roubado);
        
        text = `🕵️‍♂️ *${pushName}* roubou *${formatMoney(roubado)} fyne coins* de @${target.split("@")[0]}! 💰`;
      } else {
        const perda = Math.floor(ladrao.money * 0.05) || 50;
        removeMoney(from, sender, perda);
        text = `🚨 *${pushName}* falhou no roubo e perdeu *${formatMoney(perda)} fyne coins* na fuga!`;
      }

      ladrao.lastroubo = now;
      writeJSON(DB_LUCKY, luckyDB);
      await sock.sendMessage(from, { text, mentions: [target] }, { quoted: msg });

    } catch (err) {
      console.error("Erro no comando roubar:", err);
      await sock.sendMessage(from, { text: "❌ Erro ao tentar processar o roubo." }, { quoted: msg });
    }
  }
};
