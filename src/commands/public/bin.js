import { getGroupConfig, isGroupVip } from "../../utils/groups.js";
import { getBotConfig } from "../../config/botConfig.js";

export default {
  name: "bin",
  description: "Consulta BIN usando lookup.binlist.net",
  usage: "bin 457173",
  aliases: ["bincheck"],
  category: "utils",
  vipOnly: true,

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;

    const groupConfig = getGroupConfig(jid);
    const botConfig = getBotConfig();
    const prefix = groupConfig.prefix || "!";

    const isGroup = jid.endsWith("@g.us");
    const groupVip = isGroup ? isGroupVip(jid) : false;
    const isCreator = sender === botConfig.botCreator;

    // 🔒 Regra VIP
    if (isGroup && !groupVip && !isCreator) {
      return sock.sendMessage(
        jid,
        { text: `❌ Este comando é exclusivo para grupos VIP.` },
        { quoted: msg }
      );
    }

    if (!args[0]) {
      return sock.sendMessage(
        jid,
        { text: `❌ Use: ${prefix}bin 457173` },
        { quoted: msg }
      );
    }

    const bin = args[0].replace(/\D/g, "").substring(0, 8);

    if (bin.length < 6) {
      return sock.sendMessage(
        jid,
        { text: "❌ Informe pelo menos os 6 primeiros dígitos do cartão." },
        { quoted: msg }
      );
    }

    try {
      const url = `https://lookup.binlist.net/${bin}`;

      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (GarthBot)",
          "Accept": "application/json"
        }
      });

      if (!res.ok) {
        return sock.sendMessage(
          jid,
          { text: `❌ BIN não encontrado (HTTP ${res.status}).` },
          { quoted: msg }
        );
      }

      const data = await res.json();

      const text =
        `💳 *Consulta BIN (VIP💎)*\n\n` +
        `> *BIN:* ${bin}\n` +
        `> *Bandeira:* ${data.scheme?.toUpperCase() || "—"}\n` +
        `> *Tipo:* ${data.type || "—"}\n` +
        `> *Categoria:* ${data.brand || "—"}\n\n` +
        `🌍 *País:* ${data.country?.emoji || ""} ${data.country?.name || "—"} (${data.country?.alpha2 || ""})\n` +
        `> *Moeda:* ${data.country?.currency || "—"}\n\n` +
        `🏦 *Banco:* ${data.bank?.name || "—"}\n\n` +
        `> By GARTH-BOT V4`;

      return sock.sendMessage(jid, { text }, { quoted: msg });

    } catch {
      return sock.sendMessage(
        jid,
        { text: "❌ Erro ao consultar BIN." },
        { quoted: msg }
      );
    }
  },
};