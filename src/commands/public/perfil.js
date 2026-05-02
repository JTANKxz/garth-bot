import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { messageCount, initializeAttributes } from "../../features/messageCounts.js";
import { getGroupConfig } from "../../utils/groups.js";
import { getBotConfig } from "../../config/botConfig.js";
import { generateProfileCard } from "../../utils/cardprofile.js";
import { calculateLevel, getXPProgressBar } from "../../features/progress/levelSystem.js";
import { getJobsUser } from "../../features/jobs/service.js";
import { getJobByKey } from "../../features/jobs/catalog.js";
import { readJSON } from "../../utils/readJSON.js";
import { formatMoney } from "../../utils/saldo.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LUCKY_DB = "database/lucky.json";

export default {
  name: "perfil",
  aliases: ["p", "me"],
  description: "Mostra seu perfil com nível, economia e emprego",
  category: "utils",

  async run({ sock, msg }) {
    const from = msg.key.remoteJid;
    const botConfig = getBotConfig();
    const senderId = msg.key.participant || msg.key.remoteJid;

    await sock.sendMessage(from, { react: { text: "⏳", key: msg.key } });

    try {
      const mentionedJid = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
      const targetId = mentionedJid || senderId;
      const pushName = (targetId === senderId) ? msg.pushName : null;

      // 1. Carregar Dados de Mensagens/XP
      initializeAttributes(from, targetId);
      const userData = messageCount[from][targetId];
      const xp = userData.xp || 0;
      const level = calculateLevel(xp);
      const progress = getXPProgressBar(xp);

      // 2. Carregar Dados de Emprego
      const jobData = getJobsUser(from, targetId);
      const currentJob = jobData.job ? getJobByKey(jobData.job) : null;

      // 3. Carregar Lucky (Dinheiro/VIP)
      const luckyDB = readJSON(LUCKY_DB);
      const luckyUser = luckyDB[from]?.[targetId] || { money: 0, items: {} };
      const isVip = (luckyUser.items?.vip_profile || 0) > Date.now();

      // 4. Metadata do Grupo e Check de Privilégios
      let status = "👤 Membro";
      let displayName = pushName || targetId.split("@")[0];
      let isGroupAdmin = false;

      try {
        const metadata = await sock.groupMetadata(from);
        const part = metadata.participants.find(p => p.id === targetId);
        if (part) {
          if (part.admin === "superadmin") {
            status = "👑 Fundador";
            isGroupAdmin = true;
          } else if (part.admin === "admin") {
            status = "⭐ Admin";
            isGroupAdmin = true;
          }
          displayName = part.notify || part.name || displayName;
        }
      } catch { }

      // 5. Determinar se usa Layout VIP (Item VIP ou Staff do Bot)
      const isVipItem = (luckyUser.items?.vip_profile || 0) > Date.now();
      const isBotStaff = targetId === botConfig.botCreator || targetId === botConfig.botMaster;
      const isVipStyle = isVipItem || isBotStaff;

      // 5. Casamento
      let casadoCom = null;
      let spouseIdForMention = null;
      try {
        const casaDB = readJSON("database/casamentos.json");
        const groupCasa = casaDB[from] || {};
        const marriage = Object.values(groupCasa).find(c => c.requester === targetId || c.target === targetId);
        if (marriage) {
          spouseIdForMention = marriage.requester === targetId ? marriage.target : marriage.requester;
          casadoCom = spouseIdForMention.split("@")[0];
        }
      } catch { }

      // 6. Foto de Perfil
      let imageBuffer;
      try {
        const url = await sock.profilePictureUrl(targetId, "image");
        const response = await fetch(url);
        imageBuffer = Buffer.from(await response.arrayBuffer());
      } catch {
        imageBuffer = fs.readFileSync(path.join(__dirname, "../../../assets/images/boi.png"));
      }

      // 6. Gerar Card (se Estilo VIP)
      const renderVipCard = isVipStyle;

      let legend = `> ───⟪ *${isVipStyle ? "PERFIL VIP" : "PERFIL DE USUÁRIO"}* ⟫───\n`;
      legend += `> 👤 *Nome:* ${displayName}\n`;
      legend += `> *Cargo:* ${status}\n`;
      if (casadoCom) {
        legend += `> 💍 *Casado(a) com:* @${casadoCom}\n`;
      }
      legend += `> ──────────────\n`;

      // RPG STATUS (Nível e XP) - Sempre visível
      legend += `> *Nível:* ${level}\n`;
      legend += `> *XP:* ${xp}\n`;
      legend += `> *Progresso:* [${progress.bar}] ${progress.percent}%\n`;
      legend += `> ──────────────\n`;

      legend += `> *Emprego:* ${currentJob ? currentJob.name : "Desempregado"}\n`;

      // Regra: Normal vê Mensagens e Stats RPG, Estilo VIP não vê
      if (!isVipStyle) {
        legend += `> 💬 *Mensagens:* ${userData.messages}\n`;
        legend += `> ──────────────\n`;
        legend += `> 💪 FOR: ${userData.forca} | ❤️ VID: ${userData.life}\n`;
        legend += `> 🛡️ PRO: ${userData.protection} | ⚡ AGI: ${userData.agility}\n`;
      }

      legend = legend.trim();

      const mentionsArray = [targetId];
      if (spouseIdForMention) {
        mentionsArray.push(spouseIdForMention);
      }

      if (renderVipCard) {
        const cardPng = await generateProfileCard({
          avatarBuffer: imageBuffer,
          username: displayName,
          messages: userData.messages,
          popularity: userData.popularity,
          victories: userData.victories || 0,
          defeats: userData.defeats || 0,
          phrase: luckyUser.customPhrase || "",
        });

        await sock.sendMessage(from, { image: cardPng, caption: legend, mentions: mentionsArray }, { quoted: msg });
      } else {
        await sock.sendMessage(from, { image: imageBuffer, caption: legend, mentions: mentionsArray }, { quoted: msg });
      }

      await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });

    } catch (err) {
      console.error("Erro no comando perfil:", err);
      await sock.sendMessage(from, { text: "❌ Erro ao carregar perfil." }, { quoted: msg });
    }
  }
};
