// src/utils/messageLogger.js
import fs from "fs";
import path from "path";

const logsDir = path.join(process.cwd(), "logs");
const messageLogsFile = path.join(logsDir, "messages.log");

// Garante que o diretório existe
function ensureLogsDir() {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
}

/**
 * Extrai o número real do usuário do JID
 */
function extractNumber(jid) {
  if (!jid) return null;
  
  return jid
    .replace(/@s\.whatsapp\.net/g, "")
    .replace(/:.*@lid$/g, "")
    .replace(/@lid/g, "")
    .replace(/@g\.us/g, "");
}

/**
 * Log estruturado de mensagens recebidas
 */
export function logMessage(msg) {
  try {
    ensureLogsDir();

    const groupJid = msg.key.remoteJid || "unknown";
    const groupNumber = extractNumber(groupJid);
    
    // Extrai o sender com prioridade: participantAlt > participant
    const senderLid = msg.key.participant;
    const senderAlt = msg.key.participantAlt;
    const senderNumber = extractNumber(senderAlt || senderLid);
    
    const timestamp = new Date().toISOString();
    const pushName = msg.pushName || "Unknown";
    
    // Extrai texto da mensagem (simplificado)
    let messageText = "";
    if (msg.message?.conversation) {
      messageText = msg.message.conversation.substring(0, 100);
    } else if (msg.message?.extendedTextMessage?.text) {
      messageText = msg.message.extendedTextMessage.text.substring(0, 100);
    }

    const logEntry = {
      timestamp,
      groupJid,
      groupNumber,
      senderLid,
      senderAlt,
      senderNumber,
      senderName: pushName,
      messageType: Object.keys(msg.message || {})[0] || "unknown",
      messageText: messageText || "[sem texto]",
      addressingMode: msg.key.addressingMode || "unknown"
    };

    const logLine = JSON.stringify(logEntry) + "\n";
    fs.appendFileSync(messageLogsFile, logLine, "utf-8");

  } catch (err) {
    console.error("Erro ao fazer log de mensagem:", err);
  }
}

/**
 * Retorna últimas mensagens do log
 */
export function getRecentLogs(count = 50) {
  try {
    ensureLogsDir();
    
    if (!fs.existsSync(messageLogsFile)) {
      return [];
    }

    const content = fs.readFileSync(messageLogsFile, "utf-8");
    const lines = content.trim().split("\n").filter(l => l);
    const recent = lines.slice(-count);

    return recent.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);
  } catch (err) {
    console.error("Erro ao ler logs:", err);
    return [];
  }
}

/**
 * Limpa todos os logs
 */
export function clearLogs() {
  try {
    ensureLogsDir();
    if (fs.existsSync(messageLogsFile)) {
      fs.unlinkSync(messageLogsFile);
    }
  } catch (err) {
    console.error("Erro ao limpar logs:", err);
  }
}
