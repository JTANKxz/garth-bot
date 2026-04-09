import fs from "fs";
import path from "path";
import { getGroupConfig, isGroupVip } from "../../utils/groups.js";
import { getBotConfig } from "../../config/botConfig.js";

const dbJobsPath = path.resolve("src/database/jobs.json");

/**
 * =========================
 * CONFIG (edite aqui fácil)
 * =========================
 */
const JOB_QUIT_COOLDOWN_MS = 0.01 * 60 * 60 * 1000; // 0.01h (36s) de cooldown para pegar outro emprego após pedir demissão (pode ajustar para 24h: 24 * 60 * 60 * 1000)

/**
 * =========================
 * Helpers
 * =========================
 */
function loadJSON(filePath) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify({}, null, 2));
  }
  return JSON.parse(fs.readFileSync(filePath));
}

function saveJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function ensureJobsUser(db, groupId, userId) {
  if (!db[groupId]) db[groupId] = {};
  if (!db[groupId][userId]) {
    db[groupId][userId] = {
      job: null,
      quitUntil: 0,
      workCooldownUntil: 0,
      jobXP: 0,
      jobLevel: 1
    };
  }
  const u = db[groupId][userId];
  if (!("job" in u)) u.job = null;
  if (typeof u.quitUntil !== "number") u.quitUntil = 0;
  if (typeof u.workCooldownUntil !== "number") u.workCooldownUntil = 0;
  if (typeof u.jobXP !== "number") u.jobXP = 0;
  if (typeof u.jobLevel !== "number") u.jobLevel = 1;
  return u;
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
  name: "demitir",
  aliases: ["demissao", "demissão", "sairdoemprego"],
  description: "Peça demissão do seu emprego (só pode pegar outro após 24h)",
  category: "fun",
  vipOnly: true,

  async run({ sock, msg }) {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const pushName = msg.pushName || "Usuário";
    const botConfig = getBotConfig();
    const groupConfig = getGroupConfig(from);
    const prefix = groupConfig.prefix || "!";

    const groupVip = isGroupVip(from);
    const isCreator = sender === botConfig.botCreator;

    // 🔒 Se não for VIP e não for o criador → bloqueia
    if (!groupVip && !isCreator) {
      return sock.sendMessage(from, {
        text: `❌ Este comando é exclusivo para grupos VIP.`
      }, { quoted: msg });
    }

    try {
      const now = Date.now();

      const jobsDB = loadJSON(dbJobsPath);
      const user = ensureJobsUser(jobsDB, from, sender);

      // Não tem emprego
      if (!user.job) {
        // Se ele estiver no cooldown (sem emprego), mostra também
        if (user.quitUntil && user.quitUntil > now) {
          const left = user.quitUntil - now;
          await sock.sendMessage(
            from,
            {
              text:
                `💼 *${pushName}*, você não tem emprego no momento.\n` +
                `⏳ Você poderá pegar um novo emprego em *${formatTimeLeft(left)}*.`
            },
            { quoted: msg }
          );
          return;
        }

        await sock.sendMessage(
          from,
          {
            text:
              `💼 *${pushName}*, você não tem emprego no momento.\n` +
              `Use *${prefix}emprego* para ver as opções.`
          },
          { quoted: msg }
        );
        return;
      }

      const oldJob = user.job;

      // Demite e aplica cooldown
      user.job = null;
      user.quitUntil = now + JOB_QUIT_COOLDOWN_MS;

      // reseta cooldown de trabalho e progresso (se quiser manter XP, é só remover as 2 linhas abaixo)
      user.workCooldownUntil = 0;
      user.jobXP = 0;
      user.jobLevel = 1;

      saveJSON(dbJobsPath, jobsDB);

      await sock.sendMessage(
        from,
        {
          text:
            `📝 *${pushName}* pediu demissão do emprego *${oldJob}*.\n` +
            `⏳ Você poderá escolher outro emprego em *24h*.`
        },
        { quoted: msg }
      );
    } catch (err) {
      console.error("Erro no comando demitir:", err);
      await sock.sendMessage(
        from,
        { text: "❌ Ocorreu um erro ao executar o comando demitir." },
        { quoted: msg }
      );
    }
  }
};
