// src/features/achievements/jobAchievements.js
// Gerencia conquistas específicas de empregos, onde cada conquista tem sua própria stat.

import { ACHIEVEMENTS } from "./achievements.js";
import { hasAchievement, addAchievement, incrementStat, getStat } from "../progress/progressStore.js";
import { addUserBalance } from "../../utils/saldo.js";
import { getGroupConfig } from "../../utils/groups.js";
import { isRpgEnabled } from "../../utils/rpg.js";

/**
 * Checa e concede uma conquista de emprego específica por stat individual.
 * @param {object} opts
 * @param {object} opts.sock
 * @param {string} opts.groupId
 * @param {string} opts.user
 * @param {string} opts.stat - nome da stat a incrementar (ex: "work_count", "arrests_made")
 * @param {string} opts.achievementType - chave em ACHIEVEMENTS (ex: "work_count", "arrests_made")
 * @param {object} [opts.quoted] - mensagem para quotar na notificação
 * @param {string} [opts.pushName]
 */
export async function grantJobAchievement({ sock, groupId, user, stat, achievementType, quoted, pushName }) {
    try {
        if (!isRpgEnabled(getGroupConfig(groupId))) return;

        const newVal = incrementStat(groupId, user, stat);
        const list = ACHIEVEMENTS[achievementType];
        if (!list) return;

        const username = pushName || user.split("@")[0];

        for (const ach of list) {
            if (newVal < ach.count) continue;
            if (hasAchievement(groupId, user, ach.id)) continue;

            addAchievement(groupId, user, ach.id);

            const reward = ach.reward || 0;
            if (reward > 0) addUserBalance(groupId, user, reward);

            await sock.sendMessage(groupId, {
                text:
`══🏆 *NOVA CONQUISTA* 🏆══

👤 Usuário: ${username}
🎖️ ${ach.name}
📊 ${ach.text}

${reward ? `💰 +${reward} fyne coins 💸` : ""}
═══════════════`
            }, { quoted });
        }
    } catch (err) {
        console.error("Erro ao verificar conquista de emprego:", err);
    }
}

/**
 * Conquistas de ação especial por classe (hackear, lavar, defender, curar, fuga, pressa).
 * Cada tipo de ação tem seu próprio stat e ID de conquista para checar.
 */
export async function grantJobActionAchievement({ sock, groupId, user, actionStat, targetIds, quoted, pushName }) {
    try {
        if (!isRpgEnabled(getGroupConfig(groupId))) return;

        const newVal = incrementStat(groupId, user, actionStat);
        const list = ACHIEVEMENTS["job_action"];
        if (!list) return;

        const username = pushName || user.split("@")[0];

        // Filtra apenas as conquistas cujos IDs estão na lista de targetIds desta ação
        const relevant = list.filter(a => targetIds.includes(a.id));

        for (const ach of relevant) {
            if (newVal < ach.count) continue;
            if (hasAchievement(groupId, user, ach.id)) continue;

            addAchievement(groupId, user, ach.id);

            const reward = ach.reward || 0;
            if (reward > 0) addUserBalance(groupId, user, reward);

            await sock.sendMessage(groupId, {
                text:
`══🏆 *NOVA CONQUISTA* 🏆══

👤 Usuário: ${username}
🎖️ ${ach.name}
📊 ${ach.text}

${reward ? `💰 +${reward} fyne coins 💸` : ""}
═══════════════`
            }, { quoted });
        }
    } catch (err) {
        console.error("Erro ao verificar conquista de ação de emprego:", err);
    }
}
