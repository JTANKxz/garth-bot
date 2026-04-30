import { getBotConfig } from "../../config/botConfig.js";
import { getGroupConfig, updateGroupConfig } from "../../utils/groups.js";
import { readJSON } from "../../utils/readJSON.js";

// Chaves booleanas do grupo (para converter "true"/"false" automaticamente)
const BOOLEAN_KEYS = [
  "onlyAdmins", "welcomeGroup", "leaveGroupMessage",
  "antilink", "antifig", "auto", "autoLearn", "ai"
];

// Chaves de texto direto do grupo
const STRING_KEYS = ["prefix", "welcomeMessage"];

// Todas as chaves de config diretas
const DIRECT_KEYS = [...BOOLEAN_KEYS, ...STRING_KEYS];

function parseValue(key, rawValue) {
  if (BOOLEAN_KEYS.includes(key)) {
    return rawValue.toLowerCase() === "true";
  }
  if (STRING_KEYS.includes(key)) {
    return rawValue;
  }
  const num = parseFloat(rawValue);
  return isNaN(num) ? rawValue : num;
}

export default {
  name: "setgroup",
  aliases: ["configgrupo", "sg"],
  description: "Altera configurações de um grupo (Apenas Criador)",
  category: "creator",

  async run({ sock, msg, args }) {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const botConfig = getBotConfig();

    if (sender !== botConfig.botCreator) {
      return sock.sendMessage(from, { text: "❌ Apenas o Criador pode usar este comando." }, { quoted: msg });
    }

    // Detectar se o primeiro argumento é um ID de grupo ou uma chave
    let targetJid, key, isRemote;

    if (args[0] && args[0].endsWith("@g.us")) {
      targetJid = args[0];
      key = args[1];
      isRemote = true;
    } else {
      targetJid = from;
      key = args[0];
      isRemote = false;
    }

    const value = args.slice(isRemote ? 2 : 1).join(" ");

    if (!key || value === undefined || value === "") {
      const prefix = getGroupConfig(from)?.prefix || "!";
      return sock.sendMessage(from, {
        text:
          `⚙️ *CONFIGURAÇÃO DE GRUPO*\n\n` +
          `📌 *Modo local (grupo atual):*\n` +
          `> *${prefix}setgroup [chave] [valor]*\n` +
          `> Ex: *${prefix}setgroup prefix /*\n` +
          `> Ex: *${prefix}setgroup antilink true*\n` +
          `> Ex: *${prefix}setgroup economy win_rate_base 60*\n` +
          `> Ex: *${prefix}setgroup shop anti_roubo 1200*\n\n` +
          `📌 *Modo remoto (outro grupo):*\n` +
          `> *${prefix}setgroup [ID] [chave] [valor]*\n` +
          `> Ex: *${prefix}setgroup 120363xxx@g.us prefix /*\n\n` +
          `📋 Use *${prefix}menucriador* para ver todas as chaves disponíveis.`
      }, { quoted: msg });
    }

    try {
      // Garante que a config existe no cache
      const config = getGroupConfig(targetJid);
      const groupName = config.groupName || targetJid;
      let resultText = "";

      // ===== CONFIG DIRETA DO GRUPO =====
      if (DIRECT_KEYS.includes(key)) {
        const parsedValue = parseValue(key, value);
        updateGroupConfig(targetJid, { [key]: parsedValue });
        resultText = `✅ *${groupName}*\n> *${key}* = *${parsedValue}*`;
      }
      // ===== ECONOMIA DO GRUPO (economy.*) =====
      else if (key === "economy") {
        const econKey = args[isRemote ? 2 : 1];
        const econValue = args[isRemote ? 3 : 2];

        if (!econKey || econValue === undefined) {
          return sock.sendMessage(from, {
            text: "❌ Use: setgroup economy [chave] [valor]\nEx: setgroup economy win_rate_base 60"
          }, { quoted: msg });
        }

        const numVal = parseFloat(econValue);
        const economy = { ...(config.economy || {}), [econKey]: isNaN(numVal) ? econValue : numVal };
        updateGroupConfig(targetJid, { economy });

        resultText = `✅ *${groupName}*\n> *economy.${econKey}* = *${econValue}*`;
      }
      // ===== PREÇOS DA LOJA POR GRUPO (shop.*) =====
      else if (key === "shop") {
        const itemKey = args[isRemote ? 2 : 1];
        const priceValue = args[isRemote ? 3 : 2];

        if (!itemKey || priceValue === undefined) {
          return sock.sendMessage(from, {
            text: "❌ Use: setgroup shop [item_key] [preço]\nEx: setgroup shop anti_roubo 1200"
          }, { quoted: msg });
        }

        const price = parseInt(priceValue);
        if (isNaN(price) || price < 0) {
          return sock.sendMessage(from, { text: "❌ Preço inválido." }, { quoted: msg });
        }

        // Valida se o item existe no shop global
        const shopItems = readJSON("database/shop.json") || [];
        const itemExists = shopItems.find(i => i.key === itemKey);
        if (!itemExists) {
          const validKeys = shopItems.map(i => `*${i.key}*`).join(", ");
          return sock.sendMessage(from, {
            text: `❌ Item *${itemKey}* não encontrado.\n\n📋 Itens válidos: ${validKeys}`
          }, { quoted: msg });
        }

        const shopOverrides = { ...(config.shopOverrides || {}), [itemKey]: price };
        updateGroupConfig(targetJid, { shopOverrides });

        resultText = `✅ *${groupName}*\n> Preço de *${itemExists.name}* = *${price} fyne coins*`;
      }
      // ===== CHAVE DESCONHECIDA =====
      else {
        return sock.sendMessage(from, {
          text: `❌ Chave *${key}* não reconhecida.\n\nUse *!menucriador* para ver as chaves disponíveis.`
        }, { quoted: msg });
      }

      await sock.sendMessage(from, { text: resultText }, { quoted: msg });

    } catch (err) {
      console.error("Erro no setgroup:", err);
      await sock.sendMessage(from, { text: "❌ Erro ao atualizar o grupo." }, { quoted: msg });
    }
  }
};
