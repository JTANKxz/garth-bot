import fs from "fs";
import path from "path";

const dbPath = path.resolve("src/database/lucky.json");

/**
 * =========================
 * CONFIG (edite aqui fácil)
 * =========================
 */
const BAIL_COSTS = [800, 1600, 3000, 5500, 10000, 18000];

function loadDB() {
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({}, null, 2));
  }
  return JSON.parse(fs.readFileSync(dbPath));
}

function saveDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
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

function ensureUser(db, groupId, userId) {
  if (!db[groupId]) db[groupId] = {};
  if (!db[groupId][userId]) {
    db[groupId][userId] = {
      money: 0,
      lastroubo: 0,
      items: {},
      jailUntil: 0,
      jailStrikes: 0,
      bailCost: 0,
      lastJailAt: 0
    };
  }
  const u = db[groupId][userId];
  if (!u.items) u.items = {};
  if (typeof u.jailUntil !== "number") u.jailUntil = 0;
  if (typeof u.jailStrikes !== "number") u.jailStrikes = 0;
  if (typeof u.bailCost !== "number") u.bailCost = 0;
  if (typeof u.lastJailAt !== "number") u.lastJailAt = 0;
  return u;
}

function getBailCost(strikes) {
  const idx = Math.min(Math.max(strikes - 1, 0), BAIL_COSTS.length - 1);
  return BAIL_COSTS[idx];
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
  name: "fianca",
  aliases: ["fiança", "bail"],
  description: "Pague a fiança para sair da prisão",
  category: "fun",

  async run({ sock, msg }) {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const pushName = msg.pushName || "Usuário";

    try {
      const db = loadDB();
      const user = ensureUser(db, from, sender);

      const now = Date.now();

      // Se não estiver preso
      if (!user.jailUntil || user.jailUntil <= now) {
        await sock.sendMessage(
          from,
          { text: `✅ *${pushName}*, você não está preso no momento.` },
          { quoted: msg }
        );
        return;
      }

      // Calcula fiança: usa bailCost salvo, senão calcula por strikes
      const bail = user.bailCost > 0 ? user.bailCost : getBailCost(user.jailStrikes || 0);

      // Sem strikes e sem bailCost (caso muito raro)
      if (!bail || bail <= 0) {
        await sock.sendMessage(
          from,
          { text: `⚠️ *${pushName}*, não consegui calcular sua fiança. Tente novamente.` },
          { quoted: msg }
        );
        return;
      }

      // Checa dinheiro
      if ((user.money || 0) < bail) {
        const falta = bail - (user.money || 0);
        const left = user.jailUntil - now;

        await sock.sendMessage(
          from,
          {
            text:
              `🚔 *${pushName}*, você está preso.\n` +
              `⏳ Tempo restante: *${formatTimeLeft(left)}*\n` +
              `🧾 Fiança: *${formatMoney(bail)} fyne coins*\n` +
              `💰 Seu saldo: *${formatMoney(user.money || 0)} fyne coins*\n` +
              `❌ Falta: *${formatMoney(falta)} fyne coins*`
          },
          { quoted: msg }
        );
        return;
      }

      // Paga e solta
      user.money -= bail;
      user.jailUntil = 0;

      // opcional: ao pagar fiança, você pode zerar bailCost (recomendado)
      user.bailCost = 0;

      // (não mexe em jailStrikes aqui — a “ficha” continua, e o decay cuida disso)
      saveDB(db);

      await sock.sendMessage(
        from,
        {
          text:
            `🧾 *${pushName}* pagou a fiança de *${formatMoney(bail)} fyne coins* e foi liberado! ✅\n` +
            `💰 Saldo atual: *${formatMoney(user.money)} fyne coins*`
        },
        { quoted: msg }
      );
    } catch (err) {
      console.error("Erro no comando fianca:", err);
      await sock.sendMessage(
        from,
        { text: "❌ Ocorreu um erro ao executar o comando fiança." },
        { quoted: msg }
      );
    }
  }
};
