import { getGroupConfig } from "../utils/groups.js";
import { removeUser } from "../features/messageCounts.js";
import { removeUser as removeSimpleUser } from "../features/simpleMessageCounts.js";
import { removeLuckyUser } from "../utils/lucky.js";
import { removeUser as removeProgressUser } from "../features/progress/progressStore.js";
import { removeUserMarriages } from "../features/marriage.js";
import { removeJobsUser } from "../utils/jobs.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function groupHandler(sock, update) {
    try {
        const { id, participants, action } = update;
        const config = getGroupConfig(id);

        for (let p of participants) {
            const user = typeof p === "string" ? p : p.id || p.jid;
            if (!user) continue;

            const tag = `@${user.split("@")[0]}`;
            const formatMessage = (text) => text.replace(/{user}/g, tag);

            /* ====================== ADD ====================== */
            if (action === "add") {
                if (config.blacklisteds.includes(user)) {
                    await sock.groupParticipantsUpdate(id, [user], "remove");

                    await sock.sendMessage(id, {
                        text: formatMessage(`🚫 Usuário {user} está na blacklist e foi removido automaticamente.`),
                        mentions: [user]
                    });

                    continue;
                }

                if (config.welcomeGroup === true) {
                    let profilePicUrl = null;

                    try {
                        profilePicUrl = await sock.profilePictureUrl(user, "image");
                    } catch {
                        profilePicUrl = null;
                    }

                    // ✅ se vier vazio, força fallback
                    const useLocal = !profilePicUrl;

                    try {
                        if (useLocal) {
                            const localImagePath = path.join(__dirname, "../../assets/images/welcome.png");

                            await sock.sendMessage(id, {
                                // (opção A) mais garantida: Buffer
                                image: fs.readFileSync(localImagePath),
                                caption: formatMessage(config.welcomeMessage),
                                mentions: [user],
                            });
                        } else {
                            await sock.sendMessage(id, {
                                image: { url: profilePicUrl },
                                caption: formatMessage(config.welcomeMessage),
                                mentions: [user],
                            });
                        }
                    } catch (err) {
                        console.log("Erro ao enviar boas-vindas:", err);
                        await sock.sendMessage(id, {
                            text: formatMessage(config.welcomeMessage),
                            mentions: [user],
                        });
                    }
                }

            }

            /* ====================== REMOVE ====================== */
            if (action === "remove") {
                // contadores
                removeUser(id, user);
                removeSimpleUser(id, user);

                // 💰 remove do lucky.json
                removeLuckyUser(id, user);

                // 🏆 remove do conquistas.json
                removeProgressUser(id, user);

                // 💍 remove do casamentos.json
                removeUserMarriages(id, user);

                // 💼 remove do jobs.json
                removeJobsUser(id, user);

                // mensagem de saída opcional
                // if (config.leaveGroupMessage === true) {
                //     await sock.sendMessage(id, {
                //         text: formatMessage(`${tag} saiu do grupo...`),
                //         mentions: [user]
                //     });
                // }
            }
        }
    } catch (err) {
        console.log("Erro no groupHandler:", err);
    }
}
