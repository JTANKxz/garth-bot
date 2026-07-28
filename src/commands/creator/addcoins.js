import fs from "fs";
import path from "path";

const dbPath = path.resolve("src/database/lucky.json");

function loadDB() {
  if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({}, null, 2));
  return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

function saveDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("pt-BR");
}

function getMentionedUser(msg) {
  return msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
    || msg.message?.extendedTextMessage?.contextInfo?.participant;
}

function normalizeUserJid(value) {
  const raw = value?.trim();
  if (!raw) return null;
  if (/@(?:s\.whatsapp\.net|lid)$/.test(raw)) return raw;

  const number = raw.replace(/\D/g, "");
  return number.length >= 7 ? `${number}@s.whatsapp.net` : null;
}

function isGroupJid(value) {
  return /^\d+-\d+@g\.us$/.test(value || "");
}

function userLabel(userId) {
  return userId.split("@")[0];
}

function usage(prefix) {
  return [
    `Use atual: ${prefix}tank @membro <valor>`,
    "Para outro grupo, use o numero do membro (com DDI) ou o LID exibido no ranksaldo:",
    `${prefix}tank ver <id-do-grupo> <numero>`,
    `${prefix}tank add <id-do-grupo> <numero> <valor>`,
    `${prefix}tank remove <id-do-grupo> <numero> <valor>`
  ].join("\n");
}

export default {
  name: "tank",
  aliases: [],
  description: "Consulta, adiciona ou remove saldo; o criador pode escolher outro grupo",
  category: "owner",
  showInMenu: false,

  async run({ sock, msg, args }) {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || from;
    const prefix = msg.groupConfig?.prefix || "!";
    const mentionedUser = getMentionedUser(msg);
    const requestedAction = ["ver", "add", "remover", "remove"].includes(args[0]?.toLowerCase())
      ? args[0].toLowerCase()
      : null;
    const action = requestedAction || "add";
    const crossGroup = Boolean(requestedAction);
    const groupId = crossGroup ? args[1] : from;
    const rawTarget = crossGroup
      ? args[2]
      : (!mentionedUser && args.length >= 2 ? args[0] : null);
    const target = mentionedUser || normalizeUserJid(rawTarget) || (crossGroup ? null : sender);
    const amountArg = crossGroup
      ? args[3]
      : (rawTarget ? args[1] : args[args.length - 1]);

    if (crossGroup && !isGroupJid(groupId)) {
      return sock.sendMessage(from, { text: usage(prefix) }, { quoted: msg });
    }

    if (!target) {
      return sock.sendMessage(from, { text: "Informe o numero do membro com DDI ou mencione-o no grupo atual." }, { quoted: msg });
    }

    const db = loadDB();
    if (!db[groupId]) db[groupId] = {};
    if (!db[groupId][target]) db[groupId][target] = { money: 0, items: {} };

    const user = db[groupId][target];
    const balance = Number(user.money) || 0;

    if (action === "ver") {
      return sock.sendMessage(from, {
        text: `Saldo de ${userLabel(target)} no grupo ${groupId}: *${formatMoney(balance)} fyne coins*`
      }, { quoted: msg });
    }

    const amount = Number.parseInt(amountArg, 10);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      return sock.sendMessage(from, { text: usage(prefix) }, { quoted: msg });
    }

    const removing = action === "remover" || action === "remove";
    user.money = removing ? Math.max(0, balance - amount) : balance + amount;
    saveDB(db);

    const verb = removing ? "removido" : "adicionado";
    await sock.sendMessage(from, {
      text: `Saldo ${verb} para ${userLabel(target)}.\nGrupo: ${groupId}\nValor: *${formatMoney(amount)}*\nTotal atual: *${formatMoney(user.money)} fyne coins*`
    }, { quoted: msg });
  }
};
