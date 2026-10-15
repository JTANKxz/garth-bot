import fs from "fs";
import path from "path";
import { getBotConfig } from "../../config/botConfig.js";
import { removeUser as removeMsgCount } from "../../features/messageCounts.js";
import { removeUser as removeSimpleCount } from "../../features/simpleMessageCounts.js";
import { getGroupConfig, updateGroupConfig } from "../../utils/groups.js";

const dbPath = path.resolve(process.cwd(), "src", "database");
const SKIPPED_DATABASES = new Set(["botConfig.json", "globalSettings.json", "shop.json", "commandUsage.json"]);

function loadJSON(file) {
  try {
    const content = fs.readFileSync(path.join(dbPath, file), "utf-8").trim();
    return content ? JSON.parse(content) : {};
  } catch {
    return {};
  }
}

function saveJSON(file, data) {
  fs.writeFileSync(path.join(dbPath, file), JSON.stringify(data, null, 2), "utf-8");
}

function isJid(value) {
  return typeof value === "string" && /@(?:lid|s\.whatsapp\.net)$/.test(value);
}

function removeStaleGroupConfig(groupId, participants) {
  const config = getGroupConfig(groupId);
  const userLists = ["botOwners", "allowedUsers", "blockedUsers", "blacklisteds"];
  const userMaps = ["warnings", "muteds", "warnedByCreator"];
  const changes = {};
  let removed = 0;

  for (const field of userLists) {
    if (!Array.isArray(config[field])) continue;
    const kept = config[field].filter((jid) => !isJid(jid) || participants.has(jid));
    removed += config[field].length - kept.length;
    changes[field] = kept;
  }

  for (const field of userMaps) {
    if (!config[field] || typeof config[field] !== "object" || Array.isArray(config[field])) continue;
    const kept = {};
    for (const [jid, value] of Object.entries(config[field])) {
      if (!isJid(jid) || participants.has(jid)) kept[jid] = value;
      else removed++;
    }
    changes[field] = kept;
  }

  if (removed) updateGroupConfig(groupId, changes);
  return removed;
}

export default {
  name: "sync",
  description: "Remove todos os dados de usuários que saíram do grupo (apenas criador).",
  aliases: ["sincronizar"],
  category: "creator",

  async run({ sock, msg }) {
    const botConfig = getBotConfig();
    const sender = msg.key.participant || msg.key.remoteJid;
    const groupId = msg.key.remoteJid;

    if (sender !== botConfig.botCreator) {
      return sock.sendMessage(groupId, { text: "❌ Apenas o criador pode usar este comando!" }, { quoted: msg });
    }
    if (!groupId.endsWith("@g.us")) {
      return sock.sendMessage(groupId, { text: "❌ Este comando só funciona em grupos!" }, { quoted: msg });
    }

    try {
      await sock.sendMessage(groupId, { react: { text: "⏳", key: msg.key } });
      const metadata = await sock.groupMetadata(groupId);
      const currentParticipants = new Set();

      for (const participant of metadata.participants || []) {
        // O Baileys pode fornecer LID, número ou ambos dependendo da versão.
        for (const value of [participant.id, participant.lid, participant.phoneNumber, participant.pn, participant.jid]) {
          if (isJid(value)) currentParticipants.add(value);
        }
      }

      if (!currentParticipants.size) {
        throw new Error("não foi possível obter os participantes atuais do grupo");
      }

      const details = [];
      let totalRemoved = 0;
      const databases = fs.readdirSync(dbPath)
        .filter((file) => file.endsWith(".json") && !SKIPPED_DATABASES.has(file));

      for (const dbFile of databases) {
        const db = loadJSON(dbFile);
        const groupData = db[groupId];
        if (!groupData || typeof groupData !== "object" || Array.isArray(groupData)) continue;

        let removedInFile = 0;
        for (const key of Object.keys(groupData)) {
          if (key.startsWith("_")) continue;

          // Chaves de casamento contêm os dois JIDs separados por "_".
          const jids = key.includes("_") ? key.split("_").filter(isJid) : [key];
          if (!jids.length || jids.every((jid) => !isJid(jid) || currentParticipants.has(jid))) continue;

          delete groupData[key];
          removedInFile++;
          totalRemoved++;

          // Mantém os caches dos rankings iguais aos arquivos persistidos.
          if (dbFile === "messageCounts.json") removeMsgCount(groupId, key);
          if (dbFile === "simpleMessageCounts.json") removeSimpleCount(groupId, key);
        }

        if (removedInFile) {
          if (!Object.keys(groupData).length) delete db[groupId];
          saveJSON(dbFile, db);
          details.push(`> 📂 *${dbFile.replace(".json", "")}*: -${removedInFile}`);
        }
      }

      const removedFromConfig = removeStaleGroupConfig(groupId, currentParticipants);
      if (removedFromConfig) {
        totalRemoved += removedFromConfig;
        details.push(`> ⚙️ *configurações do grupo*: -${removedFromConfig}`);
      }

      const text = totalRemoved
        ? `✅ *SINCRONIZAÇÃO CONCLUÍDA*\n\n${details.join("\n")}\n\nTotal de registros removidos: *${totalRemoved}*\n> By ${botConfig.botName}`
        : "✅ O banco de dados já está sincronizado!";

      await sock.sendMessage(groupId, { text }, { quoted: msg });
      await sock.sendMessage(groupId, { react: { text: "✅", key: msg.key } });
    } catch (error) {
      console.error("Erro na sincronização:", error);
      await sock.sendMessage(groupId, { react: { text: "❌", key: msg.key } });
      await sock.sendMessage(groupId, { text: `❌ Erro crítico ao sincronizar: ${error.message}` }, { quoted: msg });
    }
  }
};
