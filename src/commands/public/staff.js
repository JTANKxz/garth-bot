import { getGroupConfig } from "../../utils/groups.js";
import { getBotConfig } from "../../config/botConfig.js";

export default {
    name: "staff",
    description: "Mostra a hierarquia do grupo",
    aliases: ["hierarquia"],
    category: "utils",

    async run({ sock, msg }) {
        const jid = msg.key.remoteJid;
        if (!jid.endsWith("@g.us")) return;

        const groupConfig = getGroupConfig(jid);
        const botConfig = getBotConfig();

        const meta = await sock.groupMetadata(jid);
        const participants = meta.participants;

        const creatorId = botConfig.botCreator;
        const botMaster = botConfig.botMaster;
        const botOwners = groupConfig.botOwners || [];

        const groupOwner = participants.filter(p => p.admin === "superadmin");
        const owners = participants.filter(p => botOwners.includes(p.id));
        const admins = participants.filter(p => p.admin === "admin");

        const formatUser = (jid) => `@${jid.split("@")[0]}`;

        let text = `╔═══✦ 🏰 HIERARQUIA ✦═══\n`;
        text += `║ 🏷️ GRUPO: ${meta.subject}\n\n`;

        const mentions = [];

        // ================= BOT =================
        if (creatorId || botMaster) {
            text += `║ </> Criador do bot:\n`;

            if (creatorId) {
                text += `║ └ ${formatUser(creatorId)}\n`;
                mentions.push(creatorId);
            }

            if (botMaster) {
                text += `║ └ Master: ${formatUser(botMaster)}\n`;
                mentions.push(botMaster);
            }

            text += "\n";
        }

        // ================= GRUPO =================
        if (groupOwner.length) {
            text += `║ 🏛️ Dono(s) do Grupo:\n`;
            groupOwner.forEach(o => {
                text += `║ └ ${formatUser(o.id)}\n`;
                mentions.push(o.id);
            });
            text += "\n";
        }

        if (owners.length) {
            text += `║ 🛡️ BotOwner(s):\n`;
            owners.forEach(o => {
                text += `║ └ ${formatUser(o.id)}\n`;
                mentions.push(o.id);
            });
            text += "\n";
        }

        if (admins.length) {
            text += `║ ⚔️ Admin(s):\n`;
            admins.forEach(a => {
                text += `║ └ ${formatUser(a.id)}\n`;
                mentions.push(a.id);
            });
            text += "\n";
        }

        text += `╚══════════════════`;

        await sock.sendMessage(jid, { text, mentions });
    }
};
