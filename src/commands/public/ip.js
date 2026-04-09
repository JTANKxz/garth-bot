import { getGroupConfig, isGroupVip } from "../../utils/groups.js";
import { getBotConfig } from "../../config/botConfig.js";

export default {
  name: "ip",
  description: "Geolocaliza um IP ou domínio",
  usage: "ip 8.8.8.8 | ip google.com",
  aliases: ["geoip", "ipinfo"],
  category: "utils",
  vipOnly: true,

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;

    // ✅ sender correto em grupo e privado
    const sender = msg.key.participant || msg.key.remoteJid;

    const groupConfig = getGroupConfig(jid);
    const botConfig = getBotConfig();
    const prefix = groupConfig.prefix || "!";

    const groupVip = jid.endsWith("@g.us") ? isGroupVip(jid) : false;
    const isCreator = sender === botConfig.botCreator;

    // 🔒 Se não for VIP e não for criador → bloqueia
    if (!groupVip && !isCreator) {
      return sock.sendMessage(
        jid,
        { text: `❌ Este comando é exclusivo para grupos VIP.` },
        { quoted: msg }
      );
    }

    // 🔎 Query obrigatória
    const query = args.join(" ").trim();

    // 🚫 Se não digitou nada após o comando
    if (!query) {
      return sock.sendMessage(
        jid,
        {
          text:
            `📌 *Uso correto do comando:*\n\n` +
            `> ${prefix}ip 8.8.8.8\n` +
            `> ${prefix}ip google.com`
        },
        { quoted: msg }
      );
    }

    try {
      const fields =
        "status,message,query,country,countryCode,regionName,region,city,zip,lat,lon,timezone,isp,org,as,mobile,proxy,hosting";

      const url = `http://ip-api.com/json/${encodeURIComponent(
        query
      )}?fields=${encodeURIComponent(fields)}&lang=pt-BR`;

      const res = await fetch(url);

      if (!res.ok) {
        return sock.sendMessage(
          jid,
          { text: `❌ Erro ao consultar IP (HTTP ${res.status}).` },
          { quoted: msg }
        );
      }

      const data = await res.json();

      if (data?.status !== "success") {
        const reason = data?.message ? ` (${data.message})` : "";
        return sock.sendMessage(
          jid,
          { text: `❌ Consulta falhou${reason}.` },
          { quoted: msg }
        );
      }

      const yn = (v) => (v === true ? "Sim" : v === false ? "Não" : "—");

      const header = groupVip
        ? "🌐 *Consulta IP (VIP)*"
        : "🌐 *Consulta IP*";

      const texto =
        `${header}\n\n` +
        `> *Query:* ${data.query || "—"}\n` +
        `> *País:* ${data.country || "—"} (${data.countryCode || "—"})\n` +
        `> *Região/Estado:* ${data.regionName || "—"} (${data.region || "—"})\n` +
        `> *Cidade:* ${data.city || "—"}\n` +
        `> *CEP:* ${data.zip || "—"}\n` +
        `> *Latitude/Longitude:* ${data.lat ?? "—"}, ${data.lon ?? "—"}\n` +
        `> *Fuso:* ${data.timezone || "—"}\n\n` +
        `> *ISP:* ${data.isp || "—"}\n` +
        `> *Org:* ${data.org || "—"}\n` +
        `> *AS:* ${data.as || "—"}\n\n` +
        `> *Mobile:* ${yn(data.mobile)}\n` +
        `> *Proxy/VPN/Tor:* ${yn(data.proxy)}\n` +
        `> *Hosting/DC:* ${yn(data.hosting)}\n\n` +
        `> By GARTH-BOT V4`;

      return sock.sendMessage(jid, { text: texto }, { quoted: msg });

    } catch (err) {
      console.error("Erro no comando IP:", err);
      return sock.sendMessage(
        jid,
        { text: "❌ Ocorreu um erro ao consultar o IP/domínio. Tente novamente." },
        { quoted: msg }
      );
    }
  },
};