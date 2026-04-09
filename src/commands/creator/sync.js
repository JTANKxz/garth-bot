import fs from "fs";
import path from "path";
import { getBotConfig } from "../../config/botConfig.js";

const dbPath = path.resolve(process.cwd(), "src", "database");

function loadJSON(file) {
  const filePath = path.join(dbPath, file);
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return {};
  }
}

function saveJSON(file, data) {
  const filePath = path.join(dbPath, file);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export default {
  name: "sync",
  description: "Remove dados de usuários que saíram do grupo (apenas criador).",
  aliases: ["sincronizar"],
  category: "creator",

  async run({ sock, msg }) {
    const botConfig = getBotConfig();
    const sender = msg.key.participant || msg.key.remoteJid;
    const groupId = msg.key.remoteJid;

    // ✅ Apenas criador
    if (sender !== botConfig.botCreator) {
      return sock.sendMessage(
        groupId,
        { text: "❌ Apenas o criador pode usar este comando!" },
        { quoted: msg }
      );
    }

    // ✅ Só em grupos
    if (!groupId.endsWith("@g.us")) {
      return sock.sendMessage(
        groupId,
        { text: "❌ Este comando só funciona em grupos!" },
        { quoted: msg }
      );
    }

    try {
      const metadata = await sock.groupMetadata(groupId);
      const currentParticipants = new Set(
        metadata.participants.map((p) => p.id)
      );

      const databases = ["lucky.json", "casamentos.json", "conquistas.json", "jobs.json"];
      let totalRemoved = 0;
      let statusText = "📊 *DETALHES DA SINCRONIZAÇÃO*\n\n";

      for (const dbFile of databases) {
        try {
          const db = loadJSON(dbFile);
          if (!db[groupId]) continue;

          const entries = Object.keys(db[groupId]);
          let removedInThisFile = 0;

          for (const key of entries) {
            // ✅ Ignora chaves internas que começam com "_" (ex: _pendingLoans)
            if (key.startsWith("_")) continue;

            let shouldDelete = false;

            // ✅ Lógica para chaves combinadas (casamentos: user1_user2)
            if (key.includes("_")) {
              const parts = key.split("_");
              // Deleta se PELO MENOS UM saiu do grupo
              const p1In = currentParticipants.has(parts[0]);
              const p2In = currentParticipants.has(parts[1]);
              
              if (!p1In || !p2In) {
                shouldDelete = true;
              }
            } else {
              // ✅ Lógica normal para JIDs individuais
              if (!currentParticipants.has(key)) {
                shouldDelete = true;
              }
            }

            if (shouldDelete) {
              delete db[groupId][key];
              removedInThisFile++;
              totalRemoved++;
            }
          }

          if (removedInThisFile > 0) {
            if (Object.keys(db[groupId]).length === 0) {
              delete db[groupId];
            }
            saveJSON(dbFile, db);
            statusText += `> 📂 *${dbFile}*: -${removedInThisFile}\n`;
          }

        } catch (fileErr) {
          console.error(`Erro ao processar ${dbFile}:`, fileErr);
          statusText += `> ⚠️ *${dbFile}*: Erro (${fileErr.message})\n`;
        }
      }

      let finalMsg;
      if (totalRemoved === 0) {
        finalMsg = "✅ O banco de dados já está sincronizado!";
      } else {
        finalMsg =
          `✅ *SINCRONIZAÇÃO CONCLUÍDA*\n\n` +
          statusText +
          `\nTotal de registros removidos: *${totalRemoved}*\n` +
          `> By GARTH-BOT V4`;
      }

      return sock.sendMessage(groupId, { text: finalMsg }, { quoted: msg });

    } catch (err) {
      console.error("Erro na sincronização:", err);
      return sock.sendMessage(
        groupId,
        { text: "❌ Erro crítico ao sincronizar: " + err.message },
        { quoted: msg }
      );
    }
  },
};