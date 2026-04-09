import fs from "fs";
import path from "path";
import { getGroupConfig } from "../../utils/groups.js";
import { getBotConfig } from "../../config/botConfig.js";
import { getShopItems } from "../../utils/economyManager.js";

const dbPath = path.resolve("src/database/lucky.json");

function loadDB() {
  if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({}, null, 2));
  return JSON.parse(fs.readFileSync(dbPath));
}

function saveDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// IGUAL AO COMPRAR
function durationToMs(duration) {
  if (!duration) return 0;
  const d = String(duration).toLowerCase().trim();

  const hoursMatch = d.match(/(\d+)\s*h/);
  if (hoursMatch) return parseInt(hoursMatch[1], 10) * 60 * 60 * 1000;

  const daysMatch = d.match(/(\d+)\s*dia/);
  if (daysMatch) return parseInt(daysMatch[1], 10) * 24 * 60 * 60 * 1000;

  return 0;
}

// IGUAL AO COMPRAR
function applyTimedItem(user, key, ms, now) {
  if (!user.items) user.items = {};
  user.items[key] =
    user.items[key] && user.items[key] > now
      ? user.items[key] + ms
      : now + ms;
}

// IGUAL AO COMPRAR
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
  name: "addvip",
  aliases: ["givevip"],
  description: "Concede VIP a um usuário (mesmo efeito do comprar) 👑",
  showInMenu: false,

  async run({ sock, msg, args }) {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;

    const groupConfig = getGroupConfig(from);
    const botOwners = groupConfig?.botOwners || [];
    const prefix = groupConfig?.prefix || "!";

    const botConfig = getBotConfig();
    const isCreator = sender === botConfig.botCreator;
    const isBotMaster = sender === botConfig.botMaster;
    const isOwner = botOwners.includes(sender);

    if (!isCreator && !isBotMaster && !isOwner) {
      return sock.sendMessage(
        from,
        { text: "❌ Você não tem permissão para usar esse comando." },
        { quoted: msg }
      );
    }

    const contextInfo =
      msg.message?.extendedTextMessage?.contextInfo ||
      msg.message?.imageMessage?.contextInfo ||
      msg.message?.videoMessage?.contextInfo ||
      msg.message?.documentMessage?.contextInfo ||
      msg.message?.buttonsResponseMessage?.contextInfo ||
      msg.message?.listResponseMessage?.contextInfo;

    const mentioned = contextInfo?.mentionedJid?.[0];
    const replied = contextInfo?.participant;
    const target = mentioned || replied;

    if (!target) {
      return sock.sendMessage(
        from,
        {
          text:
            `❌ Use:\n` +
            `• *${prefix}addvip @usuario <dias>*\n` +
            `• ou responda a msg do usuário: *${prefix}addvip <dias>*\n` +
            `• ou sem dias (usa o default da loja): *${prefix}addvip @usuario*\n\n` +
            `Ex: *${prefix}addvip @joao 15*\n` +
            `Ex (reply): *${prefix}addvip 15*`,
        },
        { quoted: msg }
      );
    }

    // Pega o item VIP da loja (pra ficar igual ao comprar)
    const vipItem = getShopItems().find((i) => i.key === "vip_profile");
    if (!vipItem) {
      return sock.sendMessage(
        from,
        { text: "❌ Item VIP (vip_profile) não encontrado na SHOP_ITEMS." },
        { quoted: msg }
      );
    }

    // dias: com menção, geralmente args[1]; sem menção (reply), args[0]
    const daysIndex = mentioned ? 1 : 0;
    const daysArg = args?.[daysIndex]; // pode ser undefined

    const now = Date.now();

    // Se informou dias, usa dias → ms
    // Se não informou, usa a duração default da loja (ex.: "15 dias")
    let ms = 0;

    if (daysArg !== undefined) {
      const days = parseInt(daysArg, 10);
      if (!days || days <= 0) {
        return sock.sendMessage(
          from,
          { text: "❌ Informe uma quantidade válida de dias." },
          { quoted: msg }
        );
      }
      ms = days * 24 * 60 * 60 * 1000;
    } else {
      ms = durationToMs(vipItem.duration || "15 dias");
      if (ms <= 0) {
        return sock.sendMessage(
          from,
          { text: "❌ Duração padrão do VIP inválida na loja." },
          { quoted: msg }
        );
      }
    }

    const db = loadDB();
    if (!db[from]) db[from] = {};
    if (!db[from][target]) {
      db[from][target] = {
        money: 0,
        lastDaily: null,
        items: {},
        dailyDoubleDays: 0,
        customPhrase: "",
      };
    }

    const user = db[from][target];

    // garante campos (igual estilo do comprar)
    if (!user.items) user.items = {};
    if (!user.customPhrase) user.customPhrase = "";
    if (!user.dailyDoubleDays) user.dailyDoubleDays = 0;

    // ✅ EXATAMENTE O MESMO “EFEITO” DO COMPRAR VIP
    clearShopBuffsForVip(user);
    applyTimedItem(user, vipItem.key, ms, now);

    saveDB(db);

    // Texto de duração: se veio por arg, mostra dias; senão, mostra duration do item
    const durationText =
      daysArg !== undefined ? `*${parseInt(daysArg, 10)} dia(s)*` : `*${vipItem.duration}*`;

    await sock.sendMessage(
      from,
      {
        text:
          `👑 *VIP concedido com sucesso!*\n\n` +
          `👤 Usuário: @${target.split("@")[0]}\n` +
          `⏳ Duração: ${durationText}\n` +
          `🧹 Buffs antigos removidos (ficou só VIP).`,
        mentions: [target],
      },
      { quoted: msg }
    );
  },
};
