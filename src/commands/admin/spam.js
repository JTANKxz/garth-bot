// src/commands/admin/spam.js
import { getGroupSpamConfig, setGroupSpamConfig, resetGroupSpamTracker } from "../../utils/antispam.js";
import { getGroupConfig } from "../../utils/groups.js";
import { getBotConfig } from "../../config/botConfig.js";

/**
 * Converte tempo para ms: "30s", "2m", "5h"
 */
function parseTime(str) {
  const num = parseInt(str);
  if (isNaN(num)) return null;
  
  if (str.includes("s")) return num * 1000;
  if (str.includes("m")) return num * 60 * 1000;
  if (str.includes("h")) return num * 60 * 60 * 1000;
  return num * 1000; // padrão: segundos
}

/**
 * Converte ms para string legível: "30s", "30s", "2m", etc
 */
function timeToString(ms) {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
  return `${Math.round(ms / 3600000)}h`;
}

export default {
  name: "spam",
  aliases: ["antispam", "spamfilter"],
  description: "Gerencia proteção contra spam no grupo",
  usage: ".spam on|off|config [opções]",
  category: "admin",

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const botConfig = getBotConfig();
    const groupConfig = getGroupConfig(jid);
    const metadata = await sock.groupMetadata(jid);
    const prefix = groupConfig.prefix || "!";
    // Verifica se é admin
    const isAdmin = metadata.participants.find(p => p.id === sender && p.admin);
    const isCreator = sender === botConfig.botCreator;

    if (!isAdmin && !isCreator) {
      return sock.sendMessage(jid, { text: "❌ Apenas admins podem usar este comando." }, { quoted: msg });
    }

    const action = (args[0] || "").toLowerCase();
    const spamConfig = getGroupSpamConfig(jid);

    // ===== LIGAR/DESLIGAR =====
    if (action === "on") {
      const newConfig = { ...spamConfig, enabled: true };
      setGroupSpamConfig(jid, newConfig);
      resetGroupSpamTracker(jid);

      let text = "✅ Antispam ativado!\n\n";
      text += `Configurações:\n`;
      text += `> Máximo de mensagens: ${newConfig.maxMessages}\n`;
      text += `> Janela de tempo: ${timeToString(newConfig.timeWindow)}\n`;
      text += `> Duração do bloqueio: ${timeToString(newConfig.blockDuration)}\n`;
      text += `> Aplicar advertência: ${newConfig.warnOnSpam ? "Sim" : "Não"}\n\n`;
      text += `Use \`${prefix}spam config\` para personalizar.`;

      return sock.sendMessage(jid, { text }, { quoted: msg });
    }

    if (action === "off") {
      const newConfig = { ...spamConfig, enabled: false };
      setGroupSpamConfig(jid, newConfig);
      resetGroupSpamTracker(jid);

      return sock.sendMessage(jid, { text: "❌ Antispam desativado." }, { quoted: msg });
    }

    // ===== CONFIGURAÇÃO =====
    if (action === "config" || action === "set") {
      const param = (args[1] || "").toLowerCase();
      const value = args[2];

      if (!param || !value) {
        let text = "⚙️ **Configuração de Antispam:**\n\n";
        text += `Uso: \`${prefix}spam config <param> <valor>\`\n\n`;
        text += `**Parâmetros:**\n`;
        text += `• \`${prefix}spam config max <número>\` - Máximo de mensagens (padrão: 6)\n`;
        text += `• \`${prefix}spam config window <tempo>\` - Janela de tempo em ms ou com sufixo (s/m/h). Ex: ".spam config window 1s" (padrão: 900ms)\n`;
        text += `• \`${prefix}spam config block <tempo>\` - Duração do bloqueio. Ex: ".spam config block 30s" (padrão: 30s)\n`;
        text += `• \`${prefix}spam config warn <on|off>\` - Aplicar advertência ao cair em spam (padrão: on)\n\n`;
        text += `**Configuração Atual:**\n`;
        text += `• Max: ${spamConfig.maxMessages}\n`;
        text += `• Window: ${timeToString(spamConfig.timeWindow)}\n`;
        text += `• Block: ${timeToString(spamConfig.blockDuration)}\n`;
        text += `• Warn: ${spamConfig.warnOnSpam ? "Ativado" : "Desativado"}\n`;
        text += `• Status: ${spamConfig.enabled ? "🟢 Ativado" : "🔴 Desativado"}`;

        return sock.sendMessage(jid, { text }, { quoted: msg });
      }

      const newConfig = { ...spamConfig };

      // maxMessages
      if (param === "max") {
        const num = parseInt(value);
        if (isNaN(num) || num < 1) {
          return sock.sendMessage(jid, { text: "❌ Digite um número válido (mínimo 1)." }, { quoted: msg });
        }
        newConfig.maxMessages = num;
        setGroupSpamConfig(jid, newConfig);
        return sock.sendMessage(jid, { text: `✅ Máximo de mensagens alterado para ${num}.` }, { quoted: msg });
      }

      // timeWindow
      if (param === "window") {
        const time = parseTime(value);
        if (!time || time < 100) {
          return sock.sendMessage(jid, { text: "❌ Tempo inválido. Use: 900ms, 1s, 2m, 1h" }, { quoted: msg });
        }
        newConfig.timeWindow = time;
        setGroupSpamConfig(jid, newConfig);
        return sock.sendMessage(jid, { text: `✅ Janela de tempo alterada para ${timeToString(time)}.` }, { quoted: msg });
      }

      // blockDuration
      if (param === "block") {
        const time = parseTime(value);
        if (!time || time < 100) {
          return sock.sendMessage(jid, { text: "❌ Tempo inválido. Use: 30s, 1m, 5m, 1h" }, { quoted: msg });
        }
        newConfig.blockDuration = time;
        setGroupSpamConfig(jid, newConfig);
        return sock.sendMessage(jid, { text: `✅ Duração do bloqueio alterada para ${timeToString(time)}.` }, { quoted: msg });
      }

      // warnOnSpam
      if (param === "warn") {
        const enabled = value.toLowerCase() === "on" || value.toLowerCase() === "true";
        newConfig.warnOnSpam = enabled;
        setGroupSpamConfig(jid, newConfig);
        return sock.sendMessage(jid, { text: `✅ Advertência ao spam ${enabled ? "ativada" : "desativada"}.` }, { quoted: msg });
      }

      return sock.sendMessage(jid, { text: `❌ Parâmetro desconhecido. Use ${prefix}spam config sem argumentos para ver opções.` }, { quoted: msg });
    }

    // ===== STATUS =====
    if (action === "status" || !action) {
      let text = "Status do Antispam: \n\n";
      text += `Status: ${spamConfig.enabled ? "🟢 Ativado" : "🔴 Desativado"}\n\n`;
      text += `Configuração:\n`;
      text += `> Máximo de mensagens: ${spamConfig.maxMessages}\n`;
      text += `> Janela de tempo: ${timeToString(spamConfig.timeWindow)}\n`;
      text += `> Duração do bloqueio: ${timeToString(spamConfig.blockDuration)}\n`;
      text += `> Advertência: ${spamConfig.warnOnSpam ? "Ativada" : "Desativada"}\n\n`;
      text += `📝 **Comandos:**\n`;
      text += `\`${prefix}spam on\` - Ativar\n`;
      text += `\`${prefix}spam off\` - Desativar\n`;
      text += `\`${prefix}spam config\` - Ver/editar configurações`;

      return sock.sendMessage(jid, { text }, { quoted: msg });
    }

    return sock.sendMessage(jid, { text: `❌ Uso: ${prefix}spam on|off|config|status` }, { quoted: msg });
  }
};
