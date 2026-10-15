import fs from "fs";
import path from "path";
import { getBotConfig } from "../../config/botConfig.js";
import { formatMoney } from "../../utils/saldo.js";

const dbPath = path.resolve("src/database/lucky.json");

function loadDB() {
  if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, "{}\n", "utf-8");
  const content = fs.readFileSync(dbPath, "utf-8").trim();
  return content ? JSON.parse(content) : {};
}

function isGroupJid(value) {
  return /^\d+-\d+@g\.us$/.test(value || "");
}

export default {
  name: "ranksaldo",
  aliases: ["ricos"],
  description: "Mostra o ranking de saldo do grupo",
  category: "owner",

  async run({ sock, msg, args }) {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || from;
    const botConfig = getBotConfig();
    const requestedGroup = isGroupJid(args[0]) ? args[0] : from;
    // Só o criador pode consultar o saldo de outro grupo.
    const targetGroup = sender === botConfig.botCreator ? requestedGroup : from;

    await sock.sendMessage(from, { react: { text: "⏳", key: msg.key } });

    try {
      const db = loadDB();
      const users = db[targetGroup] || {};
      const ranking = Object.entries(users)
        .filter(([, data]) => data && Number.isFinite(Number(data.money)) && Number(data.money) > 0)
        .sort(([, a], [, b]) => Number(b.money) - Number(a.money))
        .slice(0, 10);

      if (!ranking.length) {
        await sock.sendMessage(from, { text: "💰 Ninguém possui saldo ainda." }, { quoted: msg });
        return;
      }

      let groupName = "Grupo";
      if (targetGroup.endsWith("@g.us")) {
        try {
          groupName = (await sock.groupMetadata(targetGroup)).subject || groupName;
        } catch {}
      }

      const lines = ranking.map(([jid, data], index) => {
        return `│ ${index + 1} - @${jid.split("@")[0]}\n│ 💰 *${formatMoney(Number(data.money))}*`;
      }).join("\n│──────────────────\n");

      const date = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
      const text = [
        "╭──❰ 💰 *TOP 10 MAIS RICOS* ❱──╮",
        `│ *${groupName}* - ${date}`,
        "│──────────────────",
        lines,
        "╰──────────────────╯"
      ].join("\n");

      await sock.sendMessage(from, { text, mentions: ranking.map(([jid]) => jid) }, { quoted: msg });
      await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });
    } catch (err) {
      console.error("Erro no comando ranksaldo:", err);
      await sock.sendMessage(from, { react: { text: "❌", key: msg.key } });
      await sock.sendMessage(from, { text: "❌ Ocorreu um erro ao gerar o ranking de saldo." }, { quoted: msg });
    }
  }
};
