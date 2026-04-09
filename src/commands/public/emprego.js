import { getGroupConfig, isGroupVip } from "../../utils/groups.js";
import { getBotConfig } from "../../config/botConfig.js";
import { JOBS, getJobById } from "../../features/jobs/catalog.js";
import { hire, getJobsUser } from "../../features/jobs/service.js";
import { calculateLevel } from "../../features/progress/levelSystem.js";
import { messageCount } from "../../features/messageCounts.js";
import { getUserBalance } from "../../utils/saldo.js";
import { readJSON } from "../../utils/readJSON.js";

const LUCKY_DB = "database/lucky.json";

function formatTimeLeft(ms) {
  const totalMinutes = Math.ceil(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h <= 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

function renderJobsList(groupId, userId) {
  const luckyDB = readJSON(LUCKY_DB);
  const userLucky = luckyDB[groupId]?.[userId] || {};
  const userXP = messageCount[groupId]?.[userId]?.xp || 0;
  const userLevel = calculateLevel(userXP);
  const userMoney = getUserBalance(groupId, userId);

  const lines = JOBS.map(j => {
    const req = j.requirement;
    if (!req) return `*${j.id}*) ${j.name}* — ${j.desc}`;

    let current = 0;
    let label = "";

    if (req.type === "level") {
        current = userLevel;
        label = "nível";
    } else if (req.type === "money") {
        current = userMoney;
        label = "fyne coins";
    } else {
        current = userLucky[req.type] || 0;
        label = req.type === "reportsMade" ? "denúncias" : "roubos";
    }

    const ok = current >= req.min ? "✅" : "🔒";
    return `*${j.id}*) ${j.name}* ${ok} — ${j.desc} (*${current}/${req.min} ${label}*)`;
  });

  return (
    `💼 *Empregos disponíveis:*\n\n` +
    lines.join("\n") +
    `\n\n👉 Use: *!emprego [número]* para escolher.\n` +
    `📌 Para sair do emprego: *!demitir*`
  );
}

export default {
  name: "emprego",
  aliases: ["empregos"],
  description: "Veja empregos disponíveis ou escolha um",
  category: "fun",

  async run({ sock, msg, args }) {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const pushName = msg.pushName || "Usuário";
    const groupConfig = getGroupConfig(from);
    const botConfig = getBotConfig();

    const groupVip = isGroupVip(from);
    const isCreator = sender === botConfig.botCreator;

    if (!groupVip && !isCreator) {
      return sock.sendMessage(from, { text: `❌ Este comando é exclusivo para grupos VIP.` }, { quoted: msg });
    }

    try {
      const chosenNumber = Number(args[0]);

      if (!chosenNumber) {
        return sock.sendMessage(from, { text: renderJobsList(from, sender) }, { quoted: msg });
      }

      const res = hire(from, sender, getJobById(chosenNumber)?.key);

      if (!res.ok) {
        if (res.reason === "ALREADY_EMPLOYED") {
          return sock.sendMessage(from, { text: `💼 *${pushName}*, você já possui um emprego! Use !demitir primeiro.` }, { quoted: msg });
        }
        if (res.reason === "QUIT_COOLDOWN") {
          return sock.sendMessage(from, { text: `⏳ *${pushName}*, você pediu demissão recentemente. Aguarde *${formatTimeLeft(res.time)}*.` }, { quoted: msg });
        }
        if (res.reason === "REQ_NOT_MET") {
          return sock.sendMessage(from, { text: `🔒 *${pushName}*, você não atende aos requisitos para este cargo (*${res.current}/${res.min}*).` }, { quoted: msg });
        }
        return sock.sendMessage(from, { text: `❌ Erro ao contratar: ${res.reason}` }, { quoted: msg });
      }

      await sock.sendMessage(from, { text: `✅ *${pushName}* agora é *${res.job.name}*!\nUse *!trabalhar* para começar.` }, { quoted: msg });

    } catch (err) {
      console.error("Erro no comando emprego:", err);
      await sock.sendMessage(from, { text: "❌ Ocorreu um erro ao processar o emprego." }, { quoted: msg });
    }
  }
};