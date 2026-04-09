import fs from "fs";
import path from "path";

const dbLuckyPath = path.resolve("src/database/lucky.json");
const dbJobsPath = path.resolve("src/database/jobs.json");

/**
 * =========================
 * CONFIG (denunciar)
 * =========================
 */
const REPORT_WINDOW_MS = 20 * 60 * 1000;   // 30 min
const WANTED_DURATION_MS = 20 * 60 * 1000; // 30 min
const REPORT_COOLDOWN_MS = 3 * 60 * 1000;  // 3 min

/**
 * =========================
 * Helpers
 * =========================
 */
function loadJSON(filePath) {
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify({}, null, 2));
  try {
    return JSON.parse(fs.readFileSync(filePath));
  } catch {
    fs.writeFileSync(filePath, JSON.stringify({}, null, 2));
    return {};
  }
}

function saveJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function formatNumber(valor) {
  return valor.toLocaleString("pt-BR");
}

function formatMoney(valor) {
  if (valor >= 1_000_000_000) return `${formatNumber(valor)}B`;
  if (valor >= 1_000_000) return `${formatNumber(valor)}M`;
  if (valor >= 1_000) return `${formatNumber(valor)}K`;
  return formatNumber(valor);
}

function formatTimeLeft(ms) {
  const totalMinutes = Math.ceil(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h <= 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

/**
 * ✅ ATUALIZADO: inclui reportsMade (para requisito de Polícia no !emprego)
 */
function ensureLuckyUser(db, groupId, userId) {
  if (!db[groupId]) db[groupId] = {};
  if (!db[groupId][userId]) {
    db[groupId][userId] = {
      money: 0,
      lastroubo: 0,
      items: {},
      jailUntil: 0,
      jailStrikes: 0,
      bailCost: 0,
      lastJailAt: 0,
      robberySuccess: 0,

      // ✅ NOVO: contador de denúncias válidas feitas pelo usuário
      reportsMade: 0,

      // boletim do último roubo bem-sucedido
      lastRobberyAt: 0,
      lastRobberyVictim: null,
      lastRobberyAmount: 0,
      lastRobberyCaseId: null,

      // estado de denúncia/procurado
      wantedUntil: 0,
      wantedCaseId: null,
      lastReportAt: 0
    };
  }

  const u = db[groupId][userId];
  if (!u.items) u.items = {};
  if (typeof u.money !== "number") u.money = 0;
  if (typeof u.robberySuccess !== "number") u.robberySuccess = 0;

  // ✅ defaults / compat
  if (typeof u.reportsMade !== "number") u.reportsMade = 0;

  if (typeof u.lastRobberyAt !== "number") u.lastRobberyAt = 0;
  if (typeof u.lastRobberyVictim !== "string" && u.lastRobberyVictim !== null) u.lastRobberyVictim = null;
  if (typeof u.lastRobberyAmount !== "number") u.lastRobberyAmount = 0;
  if (typeof u.lastRobberyCaseId !== "string" && u.lastRobberyCaseId !== null) u.lastRobberyCaseId = null;

  if (typeof u.wantedUntil !== "number") u.wantedUntil = 0;
  if (typeof u.wantedCaseId !== "string" && u.wantedCaseId !== null) u.wantedCaseId = null;
  if (typeof u.lastReportAt !== "number") u.lastReportAt = 0;

  return u;
}

function ensureJobsUser(db, groupId, userId) {
  if (!db[groupId]) db[groupId] = {};
  if (!db[groupId][userId]) {
    db[groupId][userId] = {
      job: null,
      quitUntil: 0,
      workCooldownUntil: 0,
      jobXP: 0,
      jobLevel: 1,

      thiefJailBuffUntil: 0,
      thiefJailReduction: 0,
      bossPendingIncome: 0
    };
  }
  const u = db[groupId][userId];
  if (!("job" in u)) u.job = null;
  return u;
}

export default {
  name: "denunciar",
  aliases: ["boletim", "reportar"],
  description: "Registre um boletim contra alguém que roubou recentemente (gera procurado por 30 min)",
  category: "fun",

  async run({ sock, msg }) {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const pushName = msg.pushName || "Usuário";

    try {
      const luckyDB = loadJSON(dbLuckyPath);
      const jobsDB = loadJSON(dbJobsPath);
      const now = Date.now();

      // garante usuário
      ensureJobsUser(jobsDB, from, sender);
      const reporter = ensureLuckyUser(luckyDB, from, sender);

      // pega alvo
      let target;
      if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
        target = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
      } else if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
        target = msg.message.extendedTextMessage.contextInfo.participant;
      }

      if (!target) {
        await sock.sendMessage(
          from,
          { text: "👤 Marque um usuário ou responda a mensagem dele para denunciar." },
          { quoted: msg }
        );
        return;
      }

      if (target === sender) {
        await sock.sendMessage(from, { text: "🚫 Você não pode denunciar a si mesmo." }, { quoted: msg });
        return;
      }

      // anti-spam (cooldown do denunciante)
      if (reporter.lastReportAt && now - reporter.lastReportAt < REPORT_COOLDOWN_MS) {
        const left = REPORT_COOLDOWN_MS - (now - reporter.lastReportAt);
        await sock.sendMessage(
          from,
          { text: `⏳ *${pushName}*, você já registrou um boletim recentemente.\nTente novamente em *${formatTimeLeft(left)}*.` },
          { quoted: msg }
        );
        return;
      }

      const suspect = ensureLuckyUser(luckyDB, from, target);

      // precisa ter roubo bem-sucedido recente
      if (!suspect.lastRobberyAt || now - suspect.lastRobberyAt > REPORT_WINDOW_MS) {
        reporter.lastReportAt = now;
        saveJSON(dbLuckyPath, luckyDB);

        await sock.sendMessage(
          from,
          {
            text:
              `📝 *Boletim não registrado.*\n` +
              `Não encontrei um roubo bem-sucedido recente desse usuário (últimos *${formatTimeLeft(REPORT_WINDOW_MS)}*).`,
            mentions: [target]
          },
          { quoted: msg }
        );
        return;
      }

      // evita denunciar alguém já procurado (mesmo caso)
      if (suspect.wantedUntil && suspect.wantedUntil > now && suspect.wantedCaseId === suspect.lastRobberyCaseId) {
        reporter.lastReportAt = now;
        saveJSON(dbLuckyPath, luckyDB);

        const left = suspect.wantedUntil - now;
        await sock.sendMessage(
          from,
          {
            text:
              `📌 Esse suspeito já está com boletim ativo.\n` +
              `⏳ Validade restante: *${formatTimeLeft(left)}*`,
            mentions: [target]
          },
          { quoted: msg }
        );
        return;
      }

      // registra procurado
      suspect.wantedUntil = now + WANTED_DURATION_MS;
      suspect.wantedCaseId = suspect.lastRobberyCaseId;

      // ✅ NOVO: conta denúncia válida pro denunciante (requisito de Polícia)
      reporter.reportsMade = (reporter.reportsMade || 0) + 1;

      reporter.lastReportAt = now;

      // info pra mensagem
      const victimId = suspect.lastRobberyVictim;
      const amount = suspect.lastRobberyAmount || 0;
      const elapsed = now - suspect.lastRobberyAt;

      saveJSON(dbLuckyPath, luckyDB);

      const mentions = [target];
      if (victimId) mentions.push(victimId);

      await sock.sendMessage(
        from,
        {
          text:
            `📝 *Boletim registrado!* ✅\n\n` +
            `👤 Denunciante: *${pushName}*\n` +
            `🚨 Suspeito: @${target.split("@")[0]}\n` +
            (victimId ? `💥 Vítima: @${victimId.split("@")[0]}\n` : "") +
            `💸 Valor do roubo: *${formatMoney(amount)} fyne coins*\n` +
            `🕒 Roubo ocorreu há: *${formatTimeLeft(elapsed)}*\n\n` +
            `📌 Status: *PROCURADO*\n` +
            `⏳ Duração: *${formatTimeLeft(WANTED_DURATION_MS)}*\n\n` +
            `👮 Polícia pode usar *!prender @suspeito* enquanto durar o boletim.\n` +
            `📊 Você já fez *${reporter.reportsMade}* denúncia(s) válida(s).`,
          mentions
        },
        { quoted: msg }
      );
    } catch (err) {
      console.error("Erro no comando denunciar:", err);
      await sock.sendMessage(from, { text: "❌ Ocorreu um erro ao executar o comando denunciar." }, { quoted: msg });
    }
  }
};