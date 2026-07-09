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
        // Bloqueio de rede por 4h (impede trabalhar)
        hackerJobData.workCooldownUntil = now + (4 * 60 * 60 * 1000);
        saveJSON(dbJobsPath, jobsDB);

        // Coloca o hacker como procurado por 20 minutos
        if (!luckyDB[from][sender]) luckyDB[from][sender] = { money: 0 };
        luckyDB[from][sender].wantedUntil = now + (20 * 60 * 1000);
        luckyDB[from][sender].wantedCaseId = `${from}-${sender}-${now}`;
        saveJSON(dbLuckyPath, luckyDB);

        const text = `📡 *BLOQUEIO DE REDE E FLAGRANTE!*\n\n🚫 O firewall da conta de @${target.split("@")[0]} detectou sua invasão!\n` +
                     `🔒 Seu IP foi banido e você não poderá trabalhar nas próximas *4 horas*.\n` +
                     `🚔 A polícia cibernética rastreou você. Você está *PROCURADO* por 20 minutos!`;
        
        return sock.sendMessage(from, { text, mentions: [target] }, { quoted: msg });
      }

      // Rouba 15 a 25% do dinheiro da vítima ignorando proteções
      const percent = randInt(15, 25) / 100;
      const roubado = Math.floor(vitima.money * percent);

      vitima.money -= roubado;
      
      if (!luckyDB[from][sender]) luckyDB[from][sender] = { money: 0 };
      luckyDB[from][sender].money = (luckyDB[from][sender].money || 0) + roubado;

      saveJSON(dbLuckyPath, luckyDB);
      saveJSON(dbJobsPath, jobsDB);

      const text = `💻 *SISTEMA INVADIDO!*\n\n` +
                   `@${sender.split("@")[0]} furou todas as defesas digitais de @${target.split("@")[0]}!\n\n` +
                   `💸 Dinheiro transferido para offshore: *${formatMoney(roubado)} fyne coins*!\n` +
                   `🔍 _Análise do banco de dados revelou que o alvo ficou com exatos *${formatMoney(vitima.money)} fyne coins* na conta._`;

      await sock.sendMessage(from, { text, mentions: [sender, target] }, { quoted: msg });

      // Conquista de hack bem-sucedido
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
