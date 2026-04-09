import {
  getGroupConfig,
  setGroupVipForMs,
  disableGroupVip,
  isGroupVip,
  getVipRemainingMs
} from "../../utils/groups.js";

export default {
  name: "gpvip",
  description: "Ativa ou remove o VIP do grupo",
  usage: "gpvip 30 | gpvip cancel",
  aliases: ["vipgroup", "setvip"],
  category: "creator",
  showInMenu: false,

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;
    const groupConfig = getGroupConfig(jid);
    const prefix = groupConfig.prefix || "!";

    if (!jid.endsWith("@g.us")) {
      return sock.sendMessage(jid, {
        text: "❌ Esse comando só pode ser usado em grupos."
      }, { quoted: msg });
    }

    if (!args[0]) {
      return sock.sendMessage(jid, {
        text: `❌ Use:\n${prefix}gpvip 30 (dias)\n${prefix}gpvip cancel`
      }, { quoted: msg });
    }

    const arg = args[0].toLowerCase();

    // ✅ Cancelar VIP
    if (arg === "cancel") {
      if (!isGroupVip(jid)) {
        return sock.sendMessage(jid, {
          text: "❌ Esse grupo não possui VIP ativo."
        }, { quoted: msg });
      }

      disableGroupVip(jid);

      return sock.sendMessage(jid, {
        text: "✅ VIP do grupo foi removido com sucesso."
      }, { quoted: msg });
    }

    // ✅ Ativar VIP por X dias
    const days = parseInt(arg);

    if (isNaN(days) || days <= 0) {
      return sock.sendMessage(jid, {
        text: "❌ Informe um número válido de dias.\nExemplo: gpvip 30"
      }, { quoted: msg });
    }

    const durationMs = days * 24 * 60 * 60 * 1000;
    setGroupVipForMs(jid, durationMs);

    const remainingMs = getVipRemainingMs(jid);
    const expiresDate = new Date(Date.now() + remainingMs);

    const formattedDate = expiresDate.toLocaleString("pt-BR");

    await sock.sendMessage(jid, {
      text: `*VIP* do grupo ativado com sucesso!\n\n📅 Duração: ${days} dia(s)\n⏳ Expira em: ${formattedDate}`
    }, { quoted: msg });
  }
};