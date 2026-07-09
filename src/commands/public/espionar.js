import fs from "fs";
import path from "path";

const dbLuckyPath = path.resolve("src/database/lucky.json");
const dbJobsPath  = path.resolve("src/database/jobs.json");

function loadJSON(filePath) {
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify({}, null, 2));
  try { return JSON.parse(fs.readFileSync(filePath)); } catch { return {}; }
}

function formatMoney(v) { return v.toLocaleString("pt-BR"); }

function msToStr(ms) {
  if (ms <= 0) return "agora";
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}min`;
  return `${m}min`;
}


export default {
  name: "espionar",
  aliases: ["spy"],
  description: "Hacker espiona dados de um alvo",
  category: "fun",

  async run({ sock, msg }) {
    const from    = msg.key.remoteJid;
    const sender  = msg.key.participant || msg.key.remoteJid;
    const now     = Date.now();

    // Só hacker pode usar
    const jobsDB = loadJSON(dbJobsPath);
    const myJob  = jobsDB[from]?.[sender]?.job;
    if (myJob !== "hacker") {
      return sock.sendMessage(from, { text: `💻 Apenas *Hackers* podem usar !espionar.` }, { quoted: msg });
    }

    // Precisa de menção
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const target = mentioned[0];
    if (!target || target === sender) {
      return sock.sendMessage(from, { text: `💡 Use: *!espionar @alvo*` }, { quoted: msg });
    }

    // Sem custo
    const luckyDB = loadJSON(dbLuckyPath);
    if (!luckyDB[from]) luckyDB[from] = {};
    if (!luckyDB[from][sender]) luckyDB[from][sender] = { money: 0 };

    // Dados do alvo
    const vitima = luckyDB[from]?.[target] || {};
    const vitimaJobs = jobsDB[from]?.[target] || {};

    const saldo = vitima.money || 0;

    // Buffs ativos
    const items = vitima.items || {};
    const buffKeys = ["anti_roubo", "roubo_bonus_chance", "roubo_bonus_cash", "daily_double", "bet_bonus", "vip_profile"];
    const activeBuffs = buffKeys.filter(k => items[k] && items[k] > now);
    const buffText = activeBuffs.length > 0
      ? activeBuffs.map(k => {
          const left = msToStr(items[k] - now);
          return `  • ${k.replace(/_/g, " ")} (${left})`;
        }).join("\n")
      : "  Nenhum buff ativo";

    // Cooldowns
    const workCooldown = vitimaJobs.workCooldownUntil || 0;
    const ROB_COOLDOWN_MS = 60 * 60 * 1000; // 1h default
    const robCooldown  = vitima.lastroubo ? vitima.lastroubo + ROB_COOLDOWN_MS : 0;
    const workLeft  = workCooldown > now ? msToStr(workCooldown - now) : "✅ Livre para trabalhar";
    const robLeft   = robCooldown  > now ? msToStr(robCooldown  - now) : "✅ Livre para roubar";
    const wanted    = vitima.wantedUntil && vitima.wantedUntil > now ? "🚨 PROCURADO" : "✅ Limpo";

    fs.writeFileSync(dbLuckyPath, JSON.stringify(luckyDB, null, 2));

    const tag = target.split("@")[0];
    const text =
      `🕵️ *RELATÓRIO DE ESPIONAGEM*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `🎯 Alvo: @${tag}\n\n` +
      `💰 Saldo no banco: *${formatMoney(saldo)} fyne coins*\n` +
      `🔎 Status: ${wanted}\n\n` +
      `🛡️ *Buffs ativos:*\n${buffText}\n\n` +
      `⏱️ *Cooldowns:*\n` +
      `  • Trabalho: ${workLeft}\n` +
      `  • Roubo: ${robLeft}`;

    await sock.sendMessage(from, { text, mentions: [target] }, { quoted: msg });
  }
}
