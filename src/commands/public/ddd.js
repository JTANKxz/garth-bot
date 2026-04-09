import { getGroupConfig, isGroupVip } from "../../utils/groups.js";
import { getBotConfig } from "../../config/botConfig.js";

export default {
  name: "ddd",
  description: "Consulta DDD (UF e cidades) via BrasilAPI",
  usage: "ddd 79",
  aliases: ["dddinfo"],
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

    // 🔒 Se não for VIP e não for criador → bloqueia
    if (!groupVip && !isCreator) {
      return sock.sendMessage(
        jid,
        { text: `❌ Este comando é exclusivo para grupos VIP.` },
        { quoted: msg }
      );
    }

    // valida ddd
    if (!args[0]) {
      return sock.sendMessage(
        jid,
        { text: `❌ Use: ${prefix}ddd 79` },
        { quoted: msg }
      );
    }

    const ddd = String(args[0]).replace(/\D/g, "");
    if (!/^\d{2}$/.test(ddd)) {
      return sock.sendMessage(
        jid,
        { text: "❌ DDD inválido. Informe 2 dígitos.\nEx: 79" },
        { quoted: msg }
      );
    }

    try {
      const url = `https://brasilapi.com.br/api/ddd/v1/${ddd}`;
      const res = await fetch(url);

      // ✅ trata 404 como "DDD não encontrado"
      if (res.status === 404) {
        return sock.sendMessage(
          jid,
          { text: `❌ DDD *${ddd}* não encontrado na BrasilAPI.` },
          { quoted: msg }
        );
      }

      if (!res.ok) {
        return sock.sendMessage(
          jid,
          { text: `❌ Erro ao consultar DDD (HTTP ${res.status}).` },
          { quoted: msg }
        );
      }

      const data = await res.json();

      if (!data?.state || !Array.isArray(data?.cities)) {
        return sock.sendMessage(
          jid,
          { text: "❌ Resposta inválida da API. Tente novamente." },
          { quoted: msg }
        );
      }

      // ✅ ordena alfabeticamente
      const sortedCities = [...data.cities].sort((a, b) =>
        a.localeCompare(b, "pt-BR", { sensitivity: "base" })
      );

      const firstFifty = sortedCities.slice(0, 50);
      const remaining = Math.max(0, sortedCities.length - firstFifty.length);

      const header = groupVip
        ? "📞 *Consulta de DDD (VIP💎)*"
        : "📞 *Consulta de DDD*";

      // ✅ lista vertical com ">" em cada linha
      const cityList = firstFifty.map((city) => `> • ${city}`).join("\n");

      const text =
        `${header}\n\n` +
        `> *DDD:* ${ddd}\n` +
        `> *UF:* ${data.state}\n\n` +
        `🏙️ *Cidades (ordem alfabética):*\n\n` +
        `${cityList}` +
        `${remaining > 0 ? `\n\n> + ${remaining} cidades restantes...` : ""}\n\n` +
        `> By GARTH-BOT V4`;

      return sock.sendMessage(jid, { text }, { quoted: msg });
    } catch (err) {
      console.error("Erro no comando DDD:", err);
      return sock.sendMessage(
        jid,
        { text: "❌ Ocorreu um erro ao consultar o DDD. Tente novamente." },
        { quoted: msg }
      );
    }
  },
};