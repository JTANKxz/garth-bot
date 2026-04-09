import fs from "fs";
import path from "path";

const dbPath = path.resolve("src/database/lucky.json");

function loadDB() {
  if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({}, null, 2));
  return JSON.parse(fs.readFileSync(dbPath));
}

function saveDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// acumulável (mesma lógica do comprar)
function applyTimedItem(user, key, ms, now) {
  if (!user.items) user.items = {};
  user.items[key] =
    user.items[key] && user.items[key] > now
      ? user.items[key] + ms
      : now + ms;
}

// remove buffs quando vira VIP (mesmo padrão)
function clearShopBuffsForVip(user) {
  if (!user.items) user.items = {};

  const keysToRemove = [
    "anti_roubo",
    "roubo_bonus_cash",
    "roubo_bonus_chance",
    "bet_bonus",
    "daily_double",
  ];

  for (const k of keysToRemove) {
    if (k in user.items) delete user.items[k];
  }

  user.dailyDoubleDays = 0;
}

export default {
  name: "getvip",
  aliases: ["vip", "pegarvip"],
  description: "Ativa VIP para você por X dias 👑",
  category: "fun",

  async run({ sock, msg, args }) {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const pushName = msg.pushName || "Usuário";

    const days = parseInt(args?.[0], 10);
    if (!days || days <= 0) {
      return sock.sendMessage(
        from,
        { text: `❌ Use: *getvip <dias>*\nEx: *getvip 2*` },
        { quoted: msg }
      );
    }

    const ms = days * 24 * 60 * 60 * 1000;
    const now = Date.now();

    const db = loadDB();
    if (!db[from]) db[from] = {};
    if (!db[from][sender]) {
      db[from][sender] = {
        money: 0,
        lastDaily: null,
        items: {},
        dailyDoubleDays: 0,
        customPhrase: "",
      };
    }

    const user = db[from][sender];
    if (!user.items) user.items = {};
    if (!user.customPhrase) user.customPhrase = "";
    if (!user.dailyDoubleDays) user.dailyDoubleDays = 0;

    // ✅ mesmo "efeito" do VIP: limpa buffs antigos e aplica VIP
    clearShopBuffsForVip(user);
    applyTimedItem(user, "vip_profile", ms, now);

    // ✅ garante que os buffs do VIP realmente apliquem nos seus outros comandos
    // (porque muitos comandos checam esses keys, não o vip_profile)
    const vipUntil = user.items.vip_profile;
    user.items.anti_roubo = vipUntil;
    user.items.roubo_bonus_chance = vipUntil;
    user.items.roubo_bonus_cash = vipUntil;
    user.items.bet_bonus = vipUntil;
    user.items.daily_double = vipUntil;

    saveDB(db);

    await sock.sendMessage(
      from,
      {
        text:
          `*VIP ativado!*`,
      },
      { quoted: msg }
    );
  },
};