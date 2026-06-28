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

    if (type === "termo_win") {
        value = getStat(groupId, user, "termo_wins");
    }

    if (type === "work_count") {
        value = getStat(groupId, user, "work_count");
    }

    if (type === "robbery_success") {
        value = getStat(groupId, user, "robberySuccess");
    }

    if (type === "job_action") {
        // Cada sub-conquista usa uma stat diferente; aqui checamos qual ID está sendo avaliado
        // A verificação é individual por ID, então passamos o stat diretamente
        value = getStat(groupId, user, "job_action_total");
    }

    if (type === "arrests_made") {
        value = getStat(groupId, user, "arrests_made");
    }

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
