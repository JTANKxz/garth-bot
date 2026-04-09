// src/features/achievements/achievementsHandler.js
import { ACHIEVEMENTS } from "./achievements.js";
import {
    hasAchievement,
    addAchievement,
    getStat
} from "../progress/progressStore.js";
import { addUserBalance } from "../../utils/saldo.js";
import { messageCount } from "../messageCounts.js";

export async function checkAchievements({
    sock,
    groupId,
    user,
    type,
    quoted,
    pushName
}) {
    const list = ACHIEVEMENTS[type];
    if (!list) return;

    const username = pushName || user.split("@")[0];

    // 🔥 fonte oficial do progresso
    let value = 0;

    if (type === "send_messages") {
        value = messageCount?.[groupId]?.[user]?.messages || 0;
    }

    if (type === "sticker_create") {
        value = getStat(groupId, user, "stickers");
    }

    if (!value) return;

    for (const ach of list) {
        if (value < ach.count) continue;
        if (hasAchievement(groupId, user, ach.id)) continue;

        addAchievement(groupId, user, ach.id);

        const reward = ach.reward || 0;

        if (reward > 0) {
            addUserBalance(groupId, user, reward);
        }

        await sock.sendMessage(
            groupId,
            {
                text:
`══🏆 *NOVA CONQUISTA* 🏆══

👤 Usuário: ${username}
🎖️ ${ach.name}
📊 ${ach.text}

${reward ? `💰 +${reward} fyne coins 💸` : ""}
═══════════════`
            },
            { quoted }
        );
    }
}
