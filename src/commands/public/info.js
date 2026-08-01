import { readJSON } from "../../utils/readJSON.js";
import { commands } from "../../handler/commandsHandler.js";
import { JOBS } from "../../features/jobs/catalog.js";
import { getBotConfig } from "../../config/botConfig.js";

function normalizeText(value = "") {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function findJob(query) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return null;

  return JOBS.find(job => {
    const names = [job.key, job.name, String(job.id)];
    return names.some(name => normalizeText(name) === normalizedQuery);
  });
}


function getJobInfoText(job, prefix) {
  return (
    `*${job.name}*\n\n` +
    `O que faz: ${job.info}\n` +
    (job.salaryRange ? `Pagamento: ${job.salaryRange[0]} a ${job.salaryRange[1]} fyne coins por trabalho.\n` : "") +
    `XP por trabalho: ${job.xpGain}\n\n` +
    `Para escolher: *${prefix}emprego ${job.id}*`
  );
}

function getBotInfoText() {
  const botName = getBotConfig().botName;
  const messageCounts = readJSON("database/messageCounts.json") || {};
  const allGroups = Object.keys(messageCounts);
  let totalUsers = 0;

  allGroups.forEach(groupId => {
    totalUsers += Object.keys(messageCounts[groupId]).length;
  });

  const uptimeSeconds = process.uptime();
  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);

  const usage = readJSON("database/commandUsage.json") || {};
  const topCmds = Object.entries(usage)
    .filter(([name]) => {
      const cmd = commands.get(name);
      return cmd && cmd.category !== "owner" && cmd.category !== "creator";
    })
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => `> *${name}*: ${count}x`)
    .join("\n");

  return (
    `*Estatisticas do bot*\n` +
    `Usuarios registrados: ${totalUsers}\n` +
    `Grupos registrados: ${allGroups.length}\n` +
    `Online ha: ${hours}h ${minutes}min\n` +
    (topCmds ? `\n*Comandos mais usados:*\n${topCmds}\n` : "") +
    `\n> *${botName}*`
  );
}

export default {
  name: "info",
  aliases: ["botinfo", "stats"],
  description: "Mostra informacoes do bot ou de uma profissao",
  category: "utils",

  async run({ sock, msg, args }) {
    const from = msg.key.remoteJid;
    const prefix = msg.groupConfig?.prefix || "!";
    const query = args.join(" ");

    try {
      if (query) {
        const job = findJob(query);

        if (!job) {
          const jobs = JOBS.map(j => j.name).join(", ");
          return sock.sendMessage(from, {
            text: `Nao encontrei essa profissao.\nDisponiveis: ${jobs}`
          }, { quoted: msg });
        }

        return sock.sendMessage(from, { text: getJobInfoText(job, prefix) }, { quoted: msg });
      }

      await sock.sendMessage(from, { text: getBotInfoText() }, { quoted: msg });
    } catch (err) {
      console.error("Erro no comando info:", err);
      await sock.sendMessage(from, { text: "Erro ao carregar as informacoes." }, { quoted: msg });
    }
  }
};
