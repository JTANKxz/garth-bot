import { getQuotedMessageInfo } from "../../utils/adminActions.js";

const DURATIONS = {
  "1": 86400,
  "1d": 86400,
  "24h": 86400,
  "7": 604800,
  "7d": 604800,
  "30": 2592000,
  "30d": 2592000
};

const DURATION_LABELS = {
  "1": "1 dia",
  "1d": "1 dia",
  "24h": "1 dia",
  "7": "7 dias",
  "7d": "7 dias",
  "30": "30 dias",
  "30d": "30 dias"
};

export default {
  name: "pin",
  aliases: ["fixar"],
  description: "Fixa uma mensagem por 1, 7 ou 30 dias",
  usage: "responda uma mensagem com .pin 1|7|30",
  category: "admin",

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;
    const quoted = getQuotedMessageInfo(msg);
    const option = String(args[0] || "1").toLowerCase();
    const time = DURATIONS[option];
    const label = DURATION_LABELS[option];

    if (!quoted) {
      return sock.sendMessage(jid, { text: "⚠️ Responda a mensagem que você quer fixar." }, { quoted: msg });
    }

    if (!time) {
      return sock.sendMessage(jid, { text: "❌ Use: .pin 1, .pin 7 ou .pin 30" }, { quoted: msg });
    }

    try {
      await sock.sendMessage(jid, {
        pin: quoted.key,
        type: 1,
        time
      });

      return sock.sendMessage(jid, { text: `✅ Mensagem fixada por ${label}.` }, { quoted: msg });
    } catch (err) {
      console.error("Erro ao fixar mensagem:", err);
      return sock.sendMessage(jid, { text: "❌ Não consegui fixar a mensagem. Verifique se o bot é admin." }, { quoted: msg });
    }
  }
};
