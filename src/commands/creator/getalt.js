// src/commands/creator/getalt.js
import { getRecentLogs } from "../../utils/messageLogger.js";

/**
 * Extrai número de um JID
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
  name: "getalt",
  aliases: ["alt", "getnum", "getuser"],
  description: "Obtém o número real (participantAlt) de um usuário a partir de uma mensagem",
  usage: ".getalt [quantidade] - responda uma mensagem ou veja logs",
  category: "creator",

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    // Se respondeu uma mensagem
    if (quoted) {
      const quotedSender = msg.message?.extendedTextMessage?.contextInfo?.participant;
      const quotedSenderAlt = msg.message?.extendedTextMessage?.contextInfo?.participantAlt;
      
      const number = extractNumber(quotedSenderAlt || quotedSender);
      
      let response = "🔍 **Dados do Usuário:**\n\n";
      response += `📱 **Número (participantAlt):** \`${quotedSenderAlt || "não disponível"}\`\n`;
      response += `📌 **LID (participant):** \`${quotedSender || "não disponível"}\`\n`;
      response += `🔢 **Número Extraído:** \`${number || "não encontrado"}\`\n`;
      
      return sock.sendMessage(jid, { text: response }, { quoted: msg });
    }

    // Caso contrário, mostra logs recentes
    const limit = parseInt(args[0]) || 20;
    const logs = getRecentLogs(limit);

    if (logs.length === 0) {
      return sock.sendMessage(jid, { text: "❌ Nenhum log de mensagens disponível." }, { quoted: msg });
    }

    let response = `📊 **Últimas ${Math.min(limit, logs.length)} Mensagens:**\n\n`;

    logs.forEach((log, idx) => {
      const num = extractNumber(log.senderAlt || log.senderLid);
      response += `${idx + 1}. **${log.senderName}** (${num})\n`;
      response += `   🏘️ Grupo: \`${log.groupNumber}\`\n`;
      response += `   📱 Alt: \`${log.senderAlt || "—"}\`\n`;
      response += `   📌 LID: \`${log.senderLid || "—"}\`\n`;
      response += `   ⏰ ${new Date(log.timestamp).toLocaleTimeString("pt-BR")}\n\n`;
    });

    // Se for muito longo, dividir em partes
    if (response.length > 4000) {
      const parts = response.match(/[\s\S]{1,4000}/g) || [];
      for (let i = 0; i < parts.length; i++) {
        await sock.sendMessage(jid, { text: parts[i] }, { quoted: i === 0 ? msg : undefined });
        if (i < parts.length - 1) await new Promise(resolve => setTimeout(resolve, 500));
      }
      return;
    }

    return sock.sendMessage(jid, { text: response }, { quoted: msg });
  }
};
