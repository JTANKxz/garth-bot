import { messageCount, saveCounts } from '../../features/messageCounts.js'
import { readJSON } from "../../utils/readJSON.js"

export default {
    name: "fight",
    aliases: [],
    description: "Inicia uma batalha entre dois membros do grupo",
    category: "fun",

    async run({ sock, msg }) {
        const from = msg.key.remoteJid;
        const sender = msg.key.participant || from;

        // ✅ Check AFK
        const afkDB = readJSON("database/afk.json") || {};
        
        await sock.sendMessage(from, { react: { text: "⏳", key: msg.key } });

        try {
            if (!messageCount[from]) messageCount[from] = {};

            const mentionedJid = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            
            if (!mentionedJid) {
                await sock.sendMessage(from, { text: "⚠️ Você precisa mencionar um usuário para desafiar." }, { quoted: msg });
                return await sock.sendMessage(from, { react: { text: "❌", key: msg.key } });
            }

            if (afkDB[sender]) {
                await sock.sendMessage(from, { text: "❌ Você não pode lutar enquanto estiver AFK! Saia do AFK com !afk off primeiro." }, { quoted: msg });
                return await sock.sendMessage(from, { react: { text: "❌", key: msg.key } });
            }

            if (afkDB[mentionedJid]) {
                const afkData = afkDB[mentionedJid];
                await sock.sendMessage(from, { 
                    text: `❌ @${mentionedJid.split("@")[0]} está AFK e não pode lutar agora!\n📝 Motivo: ${afkData.reason}`,
                    mentions: [mentionedJid]
                }, { quoted: msg });
                return await sock.sendMessage(from, { react: { text: "❌", key: msg.key } });
            }

            if (mentionedJid === sender) {
                await sock.sendMessage(from, { text: "⚠️ Você não pode lutar contra si mesmo!" }, { quoted: msg });
                await sock.sendMessage(from, { react: { text: "❌", key: msg.key } });
                return;
            }

            const initializePlayer = (id) => {
                if (!messageCount[from][id]) {
                    messageCount[from][id] = {
                        messages: 0,
                        popularity: 0,
                        forca: 0,
                        victories: 0,
                        defeats: 0,
                        life: 100,
                        protection: 0,
                        agility: 0
                    };
                }
            }

            initializePlayer(sender);
            initializePlayer(mentionedJid);

            const challenger = messageCount[from][sender];
            const opponent = messageCount[from][mentionedJid];

            let challengerName = sender.split('@')[0];
            let opponentName = mentionedJid.split('@')[0];
            try {
                const groupMeta = await sock.groupMetadata(from);
                const ch = groupMeta.participants.find(p => p.id === sender);
                const op = groupMeta.participants.find(p => p.id === mentionedJid);
                if (ch?.displayName) challengerName = ch.displayName;
                if (op?.displayName) opponentName = op.displayName;
            } catch {}

            const weakPlayers = [];
            if (challenger.forca <= 0) weakPlayers.push(`@${challengerName}`);
            if (opponent.forca <= 0) weakPlayers.push(`@${opponentName}`);
            if (weakPlayers.length > 0) {
                await sock.sendMessage(from, {
                    text: `⚠️ Não é possível iniciar a batalha. Jogador(es) sem força suficiente: ${weakPlayers.join(', ')}`,
                    mentions: [sender, mentionedJid]
                }, { quoted: msg });
                await sock.sendMessage(from, { react: { text: "❌", key: msg.key } });
                return;
            }

            let challengerLife = challenger.life;
            let opponentLife = opponent.life;

            await sock.sendMessage(from, {
                text: `⚔️ *Batalha Iniciada!*\n\n🏷️ @${challengerName.split('@')[0]}: ${challengerLife} HP\n🏷️ @${opponentName.split('@')[0]}: ${opponentLife} HP\n\n🔔 Preparem-se para o combate!`,
                mentions: [sender, mentionedJid]
            }, { quoted: msg });

            const calculateDamage = (attacker, defender) => {
                const critChance = 1 - (100 / (100 + attacker.agility));
                const isCritical = Math.random() < critChance;

                const baseDamage = attacker.forca * (5 + Math.random() * 5);
                const damageVariation = Math.random() * 0.4 + 0.8;
                let finalDamage = Math.floor(baseDamage * damageVariation);

                const protectionReduction = defender.protection / (defender.protection + 100);
                const protectionVariation = Math.random() * 0.4 + 0.8;
                const totalReduction = Math.min(protectionReduction * protectionVariation, 0.99);

                finalDamage = Math.max(1, Math.floor(finalDamage * (1 - totalReduction)));

                if (isCritical) finalDamage = Math.floor(finalDamage * (Math.random() * 1 + 1.5));

                if (Math.random() < 0.01) finalDamage *= 2; 

                return { finalDamage, isCritical };
            }

            while (challengerLife > 0 && opponentLife > 0) {
                await new Promise(r => setTimeout(r, 4000));

                const { finalDamage: dmgCh, isCritical: critCh } = calculateDamage(challenger, opponent);
                opponentLife -= dmgCh;

                await sock.sendMessage(from, {
                    text: `🛡️ *Turno de* @${challengerName.split('@')[0]}\n⚔️ Causou ${dmgCh} de dano${critCh ? ' (🔥 Crítico!)' : ''}\n❤️ Vida de @${opponentName.split('@')[0]}: ${Math.max(opponentLife, 0)} HP`,
                    mentions: [sender, mentionedJid]
                }, { quoted: msg });

                if (opponentLife <= 0) break;
                await new Promise(r => setTimeout(r, 4000));

                const { finalDamage: dmgOp, isCritical: critOp } = calculateDamage(opponent, challenger);
                challengerLife -= dmgOp;

                await sock.sendMessage(from, {
                    text: `🛡️ *Turno de* @${opponentName.split('@')[0]}\n⚔️ Causou ${dmgOp} de dano${critOp ? ' (🔥 Crítico!)' : ''}\n❤️ Vida de @${challengerName.split('@')[0]}: ${Math.max(challengerLife, 0)} HP`,
                    mentions: [sender, mentionedJid]
                }, { quoted: msg });
            }

            const winnerId = challengerLife > 0 ? sender : mentionedJid;
            const loserId = challengerLife <= 0 ? sender : mentionedJid;
            const winnerName = challengerLife > 0 ? challengerName : opponentName;
            const loserName = challengerLife <= 0 ? challengerName : opponentName;

            messageCount[from][winnerId].victories++;
            messageCount[from][loserId].defeats++;
            saveCounts();

            await sock.sendMessage(from, {
                text: `🏆 *Batalha Finalizada!*\n\n🥇 *Vencedor:* @${winnerName.split('@')[0]}\n💔 *Derrotado:* @${loserName.split('@')[0]}\n\n🔥 Que batalha incrível!`,
                mentions: [winnerId, loserId]
            }, { quoted: msg });

            await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("Erro no comando fight:", err);
            await sock.sendMessage(from, { react: { text: "❌", key: msg.key } });
            await sock.sendMessage(from, {
                text: "❌ Ocorreu um erro ao executar a batalha."
            }, { quoted: msg });
        }
    }
};
