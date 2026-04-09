import { getGroupConfig, isGroupVip } from "../../utils/groups.js";
import { getBotConfig } from "../../config/botConfig.js";

export default {
  name: "brasileirao",
  description: "Mostra a tabela completa do Brasileirão (SofaScore)",
  usage: "brasileirao",
  aliases: ["br", "seriea", "tabela"],
  category: "utils",
  vipOnly: true,

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;

    const groupConfig = getGroupConfig(jid);
    const botConfig = getBotConfig();

    const isGroup = jid.endsWith("@g.us");
    const groupVip = isGroup ? isGroupVip(jid) : false;
    const isCreator = sender === botConfig.botCreator;

    if (isGroup && !groupVip && !isCreator) {
      return sock.sendMessage(
        jid,
        { text: `❌ Este comando é exclusivo para grupos VIP.` },
        { quoted: msg }
      );
    }

    try {
      const url =
        "https://www.sofascore.com/api/v1/unique-tournament/325/season/87678/standings/total";

      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (GarthBot)",
          "Accept": "application/json",
          "Accept-Language": "pt-BR,pt;q=0.9",
        },
      });

      if (!res.ok) {
        return sock.sendMessage(
          jid,
          { text: `❌ Erro ao buscar tabela (HTTP ${res.status}).` },
          { quoted: msg }
        );
      }

      const data = await res.json();
      const st =
        data?.standings?.find((s) => s?.type === "total") ||
        data?.standings?.[0];

      const rows = st?.rows || [];

      if (!rows.length) {
        return sock.sendMessage(
          jid,
          { text: "❌ Não encontrei a tabela no momento." },
          { quoted: msg }
        );
      }

      const tournamentName =
        st?.name || st?.tournament?.name || "Brasileirão";

      const updatedTs = st?.updatedAtTimestamp;
      const updatedText = updatedTs
        ? new Date(updatedTs * 1000).toLocaleString("pt-BR")
        : null;

      const fmtLine = (r) => {
        const pos = String(r.position).padStart(2, "0");
        const name = r.team?.shortName || r.team?.name || "—";
        const pts = String(r.points ?? 0).padStart(2, " ");
        const v = String(r.wins ?? 0).padStart(2, " ");
        const e = String(r.draws ?? 0).padStart(2, " ");
        const d = String(r.losses ?? 0).padStart(2, " ");
        const sg = r.scoreDiffFormatted ?? "0";

        return `> ${pos}. *${name}* — ${pts}pts _(V${v} E${e} D${d})_ | SG ${sg}`;
      };

      const header = groupVip
        ? `🏆 *${tournamentName} (VIP💎)*`
        : `🏆 *${tournamentName}*`;

      let text =
        `${header}\n` +
        (updatedText ? `🕒 Atualizado: ${updatedText}\n` : "") +
        `════════════════════\n\n` +
        rows.slice(0, 20).map(fmtLine).join("\n") +
        `\n\n════════════════════\n` +
        `> By GARTH-BOT V4`;

      return sock.sendMessage(jid, { text }, { quoted: msg });

    } catch {
      return sock.sendMessage(
        jid,
        { text: "❌ Erro ao consultar o Brasileirão. Tente novamente." },
        { quoted: msg }
      );
    }
  },
};