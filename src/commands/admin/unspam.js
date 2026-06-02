// src/commands/admin/unspam.js
import { clearUserSpamTracker } from "../../utils/antispam.js";
import { getBotConfig } from "../../config/botConfig.js";

/**
 * Extrai o número de um JID
 */
function extractNumber(jid) {
  if (!jid) return null;
  return jid
    .replace(/@s\.whatsapp\.net/g, "")
    .replace(/:.*@lid$/g, "")
    .replace(/@lid/g, "")
    .replace(/@g\.us/g, "");
}

export default {
  name: "unspam",
  aliases: ["removespam", "despam"],
  description: "Remove um usuário do bloqueio de spam",
  usage: ".unspam @user ou responda uma mensagem",
  category: "admin",

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const botConfig = getBotConfig();
    const metadata = await sock.groupMetadata(jid);

    // Verifica se é admin
    const isAdmin = metadata.participants.find(p => p.id === sender && p.admin);
    const isCreator = sender === botConfig.botCreator;

    // Tenta extrair target de menção ou resposta
    let target = null;

    // Se foi marcado/mencionado
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    if (ctx?.mentionedJid?.length) {
      target = ctx.mentionedJid[0];
    } else if (ctx?.participant) {
      // Se respondeu a mensagem
      target = ctx.participant;
    }

    if (!target) {
      return sock.sendMessage(jid, {
        text: "❌ Marque um usuário ou responda a mensagem dele.",
        quoted: msg
      });
    }

    const number = extractNumber(target);

    try {
      // Limpa o tracker de spam do usuário
      clearUserSpamTracker(jid, target);

      return sock.sendMessage(jid, {
        text: `✅ Usuário @${number} foi removido do bloqueio de spam.`,
        mentions: [target]
      }, { quoted: msg });
    } catch (err) {
      console.error("Erro ao remover spam:", err);
      return sock.sendMessage(jid, {
        text: "❌ Erro ao remover usuário do bloqueio de spam.",
        quoted: msg
      });
    }
  }
};
