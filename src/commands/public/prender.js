import fs from "fs";
import path from "path";

const dbLuckyPath = path.resolve("src/database/lucky.json");
const dbJobsPath = path.resolve("src/database/jobs.json");

/**
 * =========================
 * CONFIG (prender)
 * =========================
 */
const ARREST_COOLDOWN_MS = 10 * 60 * 1000; // 10 min

// chance fixa (não depende de VIP/itens)
const ARREST_CHANCE_BASE = 10;   // %
const ARREST_CHANCE_FRESH = 10;  // se roubo foi < 10 min
const ARREST_CHANCE_LATE = 10;   // se roubo foi > 25 min

const REPORT_WINDOW_MS = 20 * 60 * 1000;   // tem que ser roubo recente
const WANTED_DURATION_MS = 20 * 60 * 1000; // boletim válido por 20 min

// prisão aplicada no prender (modelo simples)
const ARREST_JAIL_MS = 60 * 60 * 1000; // 1h

// multa leve ao ser preso via !prender (separada da multa do roubar)
const ARREST_FINE_PERCENT = 2;
const ARREST_FINE_MIN = 80;
const ARREST_FINE_MAX = 500;

// recompensa pequena pro policial
const ARREST_REWARD_MIN = 30;
const ARREST_REWARD_MAX = 100;

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

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
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

function ensureLuckyUser(db, groupId, userId) {
  if (!db[groupId]) db[groupId] = {};
  if (!db[groupId][userId]) {
    db[groupId][userId] = {
      money: 0,
      items: {},
      lastroubo: 0,
      jailUntil: 0,
      jailStrikes: 0,
      bailCost: 0,
      lastJailAt: 0,
      robberySuccess: 0,

      lastRobberyAt: 0,
      lastRobberyVictim: null,
      lastRobberyAmount: 0,
      lastRobberyCaseId: null,

      wantedUntil: 0,
      wantedCaseId: null,
      lastReportAt: 0,

      // cooldown do policial em lucky
      lastArrestAt: 0
    };
  }

  const u = db[groupId][userId];
  if (!u.items) u.items = {};
  if (typeof u.money !== "number") u.money = 0;
  if (typeof u.jailUntil !== "number") u.jailUntil = 0;
  if (typeof u.jailStrikes !== "number") u.jailStrikes = 0;
  if (typeof u.lastJailAt !== "number") u.lastJailAt = 0;

  if (typeof u.lastRobberyAt !== "number") u.lastRobberyAt = 0;
  if (typeof u.lastRobberyVictim !== "string" && u.lastRobberyVictim !== null) u.lastRobberyVictim = null;
  if (typeof u.lastRobberyAmount !== "number") u.lastRobberyAmount = 0;
  if (typeof u.lastRobberyCaseId !== "string" && u.lastRobberyCaseId !== null) u.lastRobberyCaseId = null;

  if (typeof u.wantedUntil !== "number") u.wantedUntil = 0;
  if (typeof u.wantedCaseId !== "string" && u.wantedCaseId !== null) u.wantedCaseId = null;

  if (typeof u.lastArrestAt !== "number") u.lastArrestAt = 0;

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
  name: "prender",
  aliases: ["arrestar"],
  description: "Polícia tenta prender um suspeito que foi denunciado recentemente",
  category: "fun",

  async run({ sock, msg }) {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const pushName = msg.pushName || "Usuário";

    try {
      const luckyDB = loadJSON(dbLuckyPath);
      const jobsDB = loadJSON(dbJobsPath);
      const now = Date.now();

      const policeJob = ensureJobsUser(jobsDB, from, sender);
      const policeLucky = ensureLuckyUser(luckyDB, from, sender);

      // só polícia
      if (policeJob.job !== "policia") {
        await sock.sendMessage(from, { text: `👮 *${pushName}*, apenas *Polícia* pode usar este comando.` }, { quoted: msg });
        return;
      }

      // cooldown
      if (policeLucky.lastArrestAt && now - policeLucky.lastArrestAt < ARREST_COOLDOWN_MS) {
        const left = ARREST_COOLDOWN_MS - (now - policeLucky.lastArrestAt);
        await sock.sendMessage(
          from,
          { text: `⏳ *${pushName}*, você já tentou prender recentemente.\nTente novamente em *${formatTimeLeft(left)}*.` },
          { quoted: msg }
        );
        return;
      }

      // pega alvo
      let target;
      if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
        target = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
      } else if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
        target = msg.message.extendedTextMessage.contextInfo.participant;
      }

      if (!target) {
        await sock.sendMessage(from, { text: "👤 Marque um usuário ou responda a mensagem dele para prender." }, { quoted: msg });
        return;
      }

      if (target === sender) {
        await sock.sendMessage(from, { text: "🚫 Você não pode prender a si mesmo." }, { quoted: msg });
        return;
      }

      const suspect = ensureLuckyUser(luckyDB, from, target);

      // suspeito já preso
      if (suspect.jailUntil && suspect.jailUntil > now) {
        const left = suspect.jailUntil - now;
        await sock.sendMessage(
          from,
          { text: `🚔 O suspeito já está preso.\n⏳ Tempo restante: *${formatTimeLeft(left)}*` },
          { quoted: msg }
        );
        return;
      }

      // precisa estar denunciado (boletim ativo)
      if (!suspect.wantedUntil || suspect.wantedUntil <= now) {
        await sock.sendMessage(
          from,
          { text: `📌 Esse usuário não está com boletim ativo.\nUse *!denunciar @usuário* antes.` },
          { quoted: msg }
        );
        return;
      }

      // precisa bater com o último boletim
      if (!suspect.lastRobberyCaseId || suspect.wantedCaseId !== suspect.lastRobberyCaseId) {
        await sock.sendMessage(
          from,
          { text: `⚠️ Boletim inconsistente/antigo.\nPeça para alguém registrar um novo boletim com *!denunciar*.` },
          { quoted: msg }
        );
        return;
      }

      // roubo tem que ter sido recente (segurança extra)
      if (!suspect.lastRobberyAt || now - suspect.lastRobberyAt > REPORT_WINDOW_MS) {
        await sock.sendMessage(
          from,
          { text: `⌛ Esse boletim expirou (roubo não é mais recente).\nRegistre outro boletim com *!denunciar* se houver novo roubo.` },
          { quoted: msg }
        );
        return;
      }

      // chance conforme “frescura” do crime
      const elapsed = now - suspect.lastRobberyAt;
      let arrestChance = ARREST_CHANCE_BASE;
      if (elapsed <= 10 * 60 * 1000) arrestChance = ARREST_CHANCE_FRESH;
      else if (elapsed >= 25 * 60 * 1000) arrestChance = ARREST_CHANCE_LATE;

      // rolagem
      const roll = randInt(0, 99);
      const success = roll < arrestChance;

      // cooldown do policial (sempre)
      policeLucky.lastArrestAt = now;

      const mentions = [sender, target];
      let text = "";

      if (!success) {
        saveJSON(dbLuckyPath, luckyDB);
        saveJSON(dbJobsPath, jobsDB);

        const leftWanted = suspect.wantedUntil - now;

        text =
          `👮‍♂️ @${sender.split("@")[0]} tentou prender @${target.split("@")[0]}... mas o suspeito escapou! 🏃‍♂️💨\n` +
          `📌 Boletim ainda ativo por: *${formatTimeLeft(leftWanted)}*`;

        await sock.sendMessage(from, { text, mentions }, { quoted: msg });
        return;
      }

      /**
       * ✅ SUCESSO
       * - prende
       * - devolve dinheiro ATÉ o saldo atual do suspeito
       * - se não tiver dinheiro com ele: avisa
       * - multa leve
       * - recompensa pequena
       */
      const victimId = suspect.lastRobberyVictim;
      const amountStolen = suspect.lastRobberyAmount || 0;

      // devolução: até o saldo atual do suspeito
      let refund = 0;
      let refundNote = "";

      if (victimId && amountStolen > 0) {
        const suspectBalanceBeforeRefund = Math.max(0, suspect.money || 0);

        refund = Math.min(amountStolen, suspectBalanceBeforeRefund);

        if (refund <= 0) {
          refundNote = `⚠️ Não foi encontrado dinheiro com o suspeito para devolver à vítima.`;
        } else if (refund < amountStolen) {
          refundNote = `ℹ️ Devolução *parcial*: o suspeito só tinha *${formatMoney(refund)} fyne coins* (roubo foi *${formatMoney(amountStolen)}*).`;
        } else {
          refundNote = `✅ Devolução *total*: *${formatMoney(refund)} fyne coins*.`;
        }

        // aplica refund (se tiver)
        if (refund > 0) {
          suspect.money = Math.max(0, (suspect.money || 0) - refund);

          const victim = ensureLuckyUser(luckyDB, from, victimId);
          victim.money = (victim.money || 0) + refund;

          mentions.push(victimId);
        }
      } else {
        refundNote = `⚠️ Não foi possível devolver (vítima/valor não registrados).`;
      }

      // multa leve (depois do refund)
      const fineRaw = Math.floor((suspect.money || 0) * (ARREST_FINE_PERCENT / 100));
      const fine = clamp(fineRaw, ARREST_FINE_MIN, ARREST_FINE_MAX);
      suspect.money = Math.max(0, (suspect.money || 0) - fine);

      // recompensa pequena pro policial
      const reward = randInt(ARREST_REWARD_MIN, ARREST_REWARD_MAX);
      policeLucky.money = (policeLucky.money || 0) + reward;

      // prisão 1h e strike +1
      suspect.jailStrikes = (suspect.jailStrikes || 0) + 1;
      suspect.lastJailAt = now;
      suspect.jailUntil = now + ARREST_JAIL_MS;

      // limpa estado de procurado (caso encerrado)
      suspect.wantedUntil = 0;
      suspect.wantedCaseId = null;

      // fecha o caso pra não reaproveitar o mesmo boletim
      suspect.lastRobberyCaseId = null;

      saveJSON(dbLuckyPath, luckyDB);
      saveJSON(dbJobsPath, jobsDB);

      text =
        `🚔 Prisão efetuada! ✅\n\n` +
        `👮‍♂️ Policial: @${sender.split("@")[0]}\n` +
        `🕵️ Suspeito: @${target.split("@")[0]}\n` +
        `🎲 Chance: *${arrestChance}%* | Rolagem: *${roll}*\n` +
        `⛓️ Prisão: *${formatTimeLeft(ARREST_JAIL_MS)}*\n\n` +
        (victimId ? `💰 Devolução: *${formatMoney(refund)} fyne coins*\n` : `💰 Devolução: *0 fyne coins*\n`) +
        `${refundNote}\n` +
        `💸 Multa: *${formatMoney(fine)} fyne coins*\n` +
        `🏆 Recompensa policial: *${formatMoney(reward)} fyne coins*`;

      await sock.sendMessage(from, { text, mentions }, { quoted: msg });
    } catch (err) {
      console.error("Erro no comando prender:", err);
      await sock.sendMessage(from, { text: "❌ Ocorreu um erro ao executar o comando prender." }, { quoted: msg });
    }
  }
};