import { isGroupVip } from "../../utils/groups.js";
import { getBotConfig } from "../../config/botConfig.js";
import { JOBS, getJobById } from "../../features/jobs/catalog.js";
import { hire } from "../../features/jobs/service.js";
import { calculateLevel } from "../../features/progress/levelSystem.js";
import { messageCount } from "../../features/messageCounts.js";
import { getUserBalance } from "../../utils/saldo.js";
import { readJSON } from "../../utils/readJSON.js";

const LUCKY_DB = "database/lucky.json";

const REQUIREMENT_NAMES = {
  level: "nivel",
  money: "fyne coins",
  robberySuccess: "roubos bem-sucedidos",
  reportsMade: "denuncias feitas"
};

function getCurrentRequirement(groupId, userId, req) {
  const luckyDB = readJSON(LUCKY_DB) || {};
  const userLucky = luckyDB[groupId]?.[userId] || {};
  const userXP = messageCount[groupId]?.[userId]?.xp || 0;

  if (req.type === "level") return calculateLevel(userXP);
  if (req.type === "money") return getUserBalance(groupId, userId);
  return userLucky[req.type] || 0;
}

function formatTimeLeft(ms) {
  const totalMinutes = Math.ceil(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h <= 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

function renderJobsList(groupId, userId) {
  const lines = JOBS.map(job => {
    if (!job.requirement) return `*${job.id})* ${job.name} - Sem requisitos`;

    const current = getCurrentRequirement(groupId, userId, job.requirement);
    const name = REQUIREMENT_NAMES[job.requirement.type] || job.requirement.type;
    return `*${job.id})* ${job.name} (${current}/${job.requirement.min}) ${name}.`;
  });

  return (
    `*Empregos disponiveis*\n\n` +
    lines.join("\n") +
    `\n\nUse *!emprego [numero]* para escolher.` +
    `\nUse *!info [profissao]* para ver o que ela faz.` +
    `\nUse *!demitir* para sair do emprego atual.`
  );
}

function getRequirementText(res, job) {
  const name = REQUIREMENT_NAMES[res.type] || res.type;
  const missing = Math.max(0, res.min - res.current);
  const hint = job?.hint ? `\nComo fazer: ${job.hint}` : "";

  return (
    `Voce ainda nao tem os requisitos para virar *${job?.name || "essa profissao"}*.\n` +
    `Requisito: ${res.min} ${name}.\n` +
    `Seu progresso: ${res.current}/${res.min}.\n` +
    `Falta: ${missing} ${name}.${hint}`
  );
}

export default {
  name: "emprego",
  aliases: ["empregos"],
  description: "Veja empregos disponiveis ou escolha um",
  category: "fun",

  async run({ sock, msg, args }) {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const pushName = msg.pushName || "Usuario";
    const botConfig = getBotConfig();

    const groupVip = isGroupVip(from);
    const isCreator = sender === botConfig.botCreator;

    if (!groupVip && !isCreator) {
      return sock.sendMessage(from, { text: "Este comando e exclusivo para grupos VIP." }, { quoted: msg });
    }

    try {
      const chosenNumber = Number(args[0]);

      if (!chosenNumber) {
        return sock.sendMessage(from, { text: renderJobsList(from, sender) }, { quoted: msg });
      }

      const selectedJob = getJobById(chosenNumber);
      const res = hire(from, sender, selectedJob?.key);

      if (!res.ok) {
        if (res.reason === "ALREADY_EMPLOYED") {
          return sock.sendMessage(from, { text: `*${pushName}*, voce ja tem um emprego. Use *!demitir* primeiro.` }, { quoted: msg });
        }

        if (res.reason === "QUIT_COOLDOWN") {
          return sock.sendMessage(from, { text: `*${pushName}*, voce pediu demissao recentemente. Aguarde *${formatTimeLeft(res.time)}*.` }, { quoted: msg });
        }

        if (res.reason === "REQ_NOT_MET") {
          return sock.sendMessage(from, { text: getRequirementText(res, selectedJob) }, { quoted: msg });
        }

        if (res.reason === "JOB_NOT_FOUND") {
          return sock.sendMessage(from, { text: "Esse emprego nao existe. Use *!emprego* para ver a lista." }, { quoted: msg });
        }

        return sock.sendMessage(from, { text: `Erro ao contratar: ${res.reason}` }, { quoted: msg });
      }

      await sock.sendMessage(from, { text: `*${pushName}* agora trabalha como *${res.job.name}*.\nUse *!trabalhar* para comecar.` }, { quoted: msg });
    } catch (err) {
      console.error("Erro no comando emprego:", err);
      await sock.sendMessage(from, { text: "Ocorreu um erro ao processar o emprego." }, { quoted: msg });
    }
  }
};
