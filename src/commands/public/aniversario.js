import { readJSON, writeJSON } from "../../utils/readJSON.js";
import { getBotConfig } from "../../config/botConfig.js";

const DB_BIRTHDAYS = "database/birthdays.json";

export default {
  name: "aniversario",
  aliases: ["niver", "bday"],
  description: "Gerencia as datas de aniversário dos membros",
  category: "utils",

  async run({ sock, msg, args }) {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const botConfig = getBotConfig();

    const subCommand = args[0]?.toLowerCase();

    if (subCommand === "set") {
      const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
      let target = sender;
      let dateIdx = 1;

      if (mentioned) {
        // Apenas Admin ou Criador pode setar para outros
        const meta = await sock.groupMetadata(from);
        const isAdmin = meta.participants.find(p => p.id === sender)?.admin;
        if (!isAdmin && sender !== botConfig.botCreator) {
          return sock.sendMessage(from, { text: "❌ Apenas administradores podem setar o aniversário de outros membros." }, { quoted: msg });
        }
        target = mentioned;
        dateIdx = 2;
      }

      const dateStr = args[dateIdx];
      if (!dateStr || !/^\d{1,2}\/\d{1,2}$/.test(dateStr)) {
        return sock.sendMessage(from, { text: "❌ Formato inválido! Use: !aniversario set dd/mm\nEx: !aniversario set 15/05" }, { quoted: msg });
      }

      const db = readJSON(DB_BIRTHDAYS) || {};
      db[target] = dateStr;
      writeJSON(DB_BIRTHDAYS, db);

      return sock.sendMessage(from, { 
        text: `✅ Aniversário de @${target.split("@")[0]} definido para *${dateStr}*!`,
        mentions: [target]
      }, { quoted: msg });
    }

    if (subCommand === "delete" || subCommand === "remover") {
      const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
      let target = sender;

      if (mentioned) {
        const meta = await sock.groupMetadata(from);
        const isAdmin = meta.participants.find(p => p.id === sender)?.admin;
        if (!isAdmin && sender !== botConfig.botCreator) {
          return sock.sendMessage(from, { text: "❌ Apenas administradores podem deletar aniversários de outros." }, { quoted: msg });
        }
        target = mentioned;
      }

      const db = readJSON(DB_BIRTHDAYS) || {};
      if (!db[target]) return sock.sendMessage(from, { text: "❌ Nenhum aniversário encontrado para este usuário." }, { quoted: msg });

      delete db[target];
      writeJSON(DB_BIRTHDAYS, db);

      return sock.sendMessage(from, { text: `✅ Aniversário removido com sucesso.` }, { quoted: msg });
    }

    if (subCommand === "list" || subCommand === "lista") {
      const db = readJSON(DB_BIRTHDAYS) || {};
      const metadata = await sock.groupMetadata(from);
      const participants = metadata.participants.map(p => p.id);

      const list = Object.entries(db)
        .filter(([jid]) => participants.includes(jid))
        .sort(([, a], [, b]) => {
            const [da, ma] = a.split("/").map(Number);
            const [db, mb] = b.split("/").map(Number);
            return ma !== mb ? ma - mb : da - db;
        });

      if (list.length === 0) return sock.sendMessage(from, { text: "🎂 Nenhum aniversário registrado neste grupo." }, { quoted: msg });

      let text = `🎂 *ANIVERSARIANTES DO GRUPO*\n\n`;
      list.forEach(([jid, date]) => {
        text += `> @${jid.split("@")[0]} — *${date}*\n`;
      });

      return sock.sendMessage(from, { text, mentions: list.map(([jid]) => jid) }, { quoted: msg });
    }

    // Default: Ver específico ou ajuda
    const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || sender;
    const db = readJSON(DB_BIRTHDAYS) || {};
    
    if (db[mentioned]) {
        return sock.sendMessage(from, { 
            text: `🎂 O aniversário de @${mentioned.split("@")[0]} é dia *${db[mentioned]}*!`,
            mentions: [mentioned]
        }, { quoted: msg });
    }

    return sock.sendMessage(from, { 
        text: `🎂 *SISTEMA DE ANIVERSÁRIOS*\n\n` +
              `👉 !aniversario set dd/mm - Define sua data\n` +
              `👉 !aniversario list - Lista todos do grupo\n` +
              `👉 !aniversario delete - Remove sua data\n\n` +
              `*Admins podem setar/remover de outros mencionando.*`
    }, { quoted: msg });
  }
};
