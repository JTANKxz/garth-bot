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
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h <= 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rollHackRewardLimit() {
  const luck = randInt(1, 100);
  if (luck <= 75) return randInt(100, 500);
  if (luck <= 95) return randInt(501, 800);
  return randInt(801, 1000);
}

export default {
  name: "hackear",
  aliases: ["invadir"],
  description: "Hacker tenta roubar dinheiro de contas bancárias (ignora proteção), com alto risco",
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
      if (userJob !== "hacker") {
        return sock.sendMessage(from, { text: `💻 *${pushName}*, apenas um *Hacker* sabe como invadir contas bancárias.` }, { quoted: msg });
      }

      const hackerJobData = jobsDB[from][sender];
      
      // Cooldown de 40 min
      if (hackerJobData.lastHackAt && now - hackerJobData.lastHackAt < 40 * 60 * 1000) {
        const left = 40 * 60 * 1000 - (now - hackerJobData.lastHackAt);
        return sock.sendMessage(from, { text: `⏳ *${pushName}*, os servidores estão monitorando sua rede! Aguarde *${formatTimeLeft(left)}* para tentar de novo.` }, { quoted: msg });
      }

      let target;
      if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
        target = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
      } else if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
        target = msg.message.extendedTextMessage.contextInfo.participant;
      }

      if (!target || target === sender) {
        return sock.sendMessage(from, { text: "👤 Mencione o usuário que deseja hackear." }, { quoted: msg });
      }

      const vitima = luckyDB[from]?.[target] || { money: 0 };
      
      if (vitima.money < 100) {
        return sock.sendMessage(from, { text: `📉 A conta de @${target.split("@")[0]} tem saldo insuficiente para hackear.`, mentions: [target] }, { quoted: msg });
      }

      hackerJobData.lastHackAt = now;

      // 65% de chance de sucesso
      const success = randInt(0, 99) < 65;

      if (!success) {
        hackerJobData.workCooldownUntil = now + (4 * 60 * 60 * 1000);
        if (!luckyDB[from][sender]) luckyDB[from][sender] = { money: 0 };
        luckyDB[from][sender].wantedUntil = now + (20 * 60 * 1000);
        luckyDB[from][sender].wantedCaseId = `${from}-${sender}-${now}`;

        saveJSON(dbJobsPath, jobsDB);
        saveJSON(dbLuckyPath, luckyDB);
        return sock.sendMessage(from, {
          text: "Hack falhou. Bloqueio: 4h | Procurado: 20min.",
          mentions: [target]
        }, { quoted: msg });
      }

      const percent = randInt(5, 12) / 100;
      const potential = Math.floor(vitima.money * percent);
      const roubado = Math.min(vitima.money, potential, rollHackRewardLimit());

      vitima.money -= roubado;
      if (!luckyDB[from][sender]) luckyDB[from][sender] = { money: 0 };
      luckyDB[from][sender].money = (luckyDB[from][sender].money || 0) + roubado;

      saveJSON(dbLuckyPath, luckyDB);
      saveJSON(dbJobsPath, jobsDB);

      const text = `Hack concluido. @${sender.split("@")[0]} roubou ${formatMoney(roubado)} coins de @${target.split("@")[0]}. Saldo do alvo: ${formatMoney(vitima.money)}.`;
      await sock.sendMessage(from, { text, mentions: [sender, target] }, { quoted: msg });

      await grantJobActionAchievement({
        sock, groupId: from, user: sender,
        actionStat: "hackear_success",
        targetIds: ["ja_hack_1", "ja_hack_10"],
        quoted: msg, pushName
      });

    } catch (err) {
      console.error("Erro no comando hackear:", err);
      await sock.sendMessage(from, { text: "❌ Erro ao tentar hackear." }, { quoted: msg });
    }
  }
};
