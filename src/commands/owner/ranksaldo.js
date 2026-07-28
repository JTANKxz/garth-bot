import fs from "fs";
import path from "path";

const dbPath = path.resolve("src/database/lucky.json");

function loadDB() {
  if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({}, null, 2));
  return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

function isGroupJid(value) {
  return /^\d+-\d+@g\.us$/.test(value || "");
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("pt-BR");
}

export default {
  name: "ranksaldo",
  aliases: ["ricos"],
  description: "Mostra os maiores saldos; o criador pode informar o ID de outro grupo",
  category: "owner",

  async run({ sock, msg, args }) {
    const from = msg.key.remoteJid;
    const targetGroup = isGroupJid(args[0]) ? args[0] : from;

    try {
      const db = loadDB();
      const users = db[targetGroup] || {};
      const ranking = Object.entries(users)
        .filter(([, data]) => data && typeof data.money === "number")
        .sort(([, a], [, b]) => b.money - a.money)
        .slice(0, 30);

      if (!ranking.length) {
        return sock.sendMessage(from, { text: "Nenhum usuario com saldo encontrado nesse grupo." }, { quoted: msg });
      }

      let groupName = targetGroup;
      try {
        const metadata = await sock.groupMetadata(targetGroup);
        groupName = metadata.subject || targetGroup;
      } catch {}

      const lines = ranking.map(([jid, data], index) => {
        const kind = jid.endsWith("@lid") ? "LID" : "ID";
        return [
          `${index + 1}. ${jid.split("@")[0]}`,
          `   ${kind}: ${jid}`,
          `   Saldo: ${formatMoney(data.money)} fyne coins`
        ].join("\n");
      }).join("\n--------------------\n");

      const date = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
      const text = [
        "TOP 30 RICOS",
        `Grupo: ${groupName}`,
        `Grupo ID: ${targetGroup}`,
        `Data: ${date}`,
        "--------------------",
        lines
      ].join("\n");

      await sock.sendMessage(from, { text }, { quoted: msg });
    } catch (err) {
      console.error("Erro no comando ranksaldo:", err);
      await sock.sendMessage(from, { text: "Ocorreu um erro ao gerar o ranking." }, { quoted: msg });
    }
  }
};
