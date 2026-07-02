// src/handler/messageHandler.js
import { muteMiddleware } from "../middlewares/mute.js"
import { antiFigMiddleware } from "../middlewares/antiFig.js"
import { antiLinkMiddleware } from "../middlewares/antilink.js"
import { ausenteMiddleware } from "../middlewares/ausente.js"
import { handleCommand } from "./commandsHandler.js"
import { sleep } from '../utils/sleep.js'
import { GLOBALS } from '../utils/globals.js'
import { incrementCount } from "../features/messageCounts.js"
import { incrementMessageCount as incrementSimpleCount } from "../features/simpleMessageCounts.js"
import { handleMarriageResponse } from '../features/marriage.js'
import { getBotConfig } from "../config/botConfig.js"
import { ticTacToeListener } from "../features/games/velha/handler.js"
import { minesweeperListener } from "../features/games/minado/handler.js"
import { termoListener } from "../features/games/termo/handler.js"
import { getAutoResponse, learnAutoResponse } from "../utils/autoResponse.js"
import { getGroupConfig } from "../utils/groups.js"
import { maybeDropChest } from "../utils/maybeDropChest.js";
import { buscarAppListener } from "../listeners/playstore.js";
import { checkAchievements } from "../features/achievements/achievementsHandler.js";
import { handleLoanDecision } from "../utils/loanRequests.js";
import { checkSpam, clearUserSpamTracker } from "../utils/antispam.js";
import { logMessage } from "../utils/messageLogger.js";
import { applyWarning } from "../features/warning.js";
import { handleAiTrigger } from "../utils/ollama.js";
import { maybeSpawnCarroForte } from "../utils/carroForte.js";


const groupMetadataCache = new Map()

export async function getCachedGroupMetadata(sock, jid) {
    const now = Date.now()
    const cache = groupMetadataCache.get(jid)

    if (cache && now - cache.time < 10000) {
        return cache.data
    }

    const metadata = await sock.groupMetadata(jid)

    groupMetadataCache.set(jid, {
        time: now,
        data: metadata
    })

    return metadata
}

export default async function messageHandler(messages, sock) {
    const msg = messages[0];
    if (!msg || msg.key.fromMe || !msg.message) return;

    const groupJid = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;

    const botConfig = getBotConfig()
    const isCreator = sender === botConfig.botCreator

    // ❌ BOT NÃO FUNCIONA EM PV (a não ser que seja o criador)
    if (!groupJid.endsWith("@g.us") && !isCreator) return;

    // ===== LOG DE MENSAGENS =====
    logMessage(msg);

    const msgType = Object.keys(msg.message)[0]
    const pushName = msg.pushName || "";

    const isBotMaster = sender === botConfig.botMaster
    const groupConfig = groupJid.endsWith("@g.us") ? (getGroupConfig(groupJid) || {}) : {}

    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ''

    // ============ EMPRÉSTIMOS (ACEITAR/RECUSAR) ============
    const loanHandled = await handleLoanDecision({ sock, msg });
    if (loanHandled) return;

    // Ignora grupos não autorizados: Apenas o CRIADOR pula essa trava
    if (groupJid.endsWith("@g.us") && !botConfig.allowedGroups.includes(groupJid) && !isCreator) {
        return;
    }

    // ===== VERIFICAÇÃO DE ALUGUEL EXPIRADO =====
    const isExpired = groupJid.endsWith("@g.us") && groupConfig.authExpiresAt && Date.now() >= groupConfig.authExpiresAt;
    if (isExpired && !isCreator) {
        const prefix = groupConfig.prefix || "!";
        if (text.startsWith(prefix)) {
            // Se for comando, envia para handleCommand tratar o aviso de expirado
            await handleCommand({ sock, msg, sender, isCreator });
        }
        return; // não processa mais nada
    }

    // ============ MIDDLEWARE - MUTE ============
    const muted = await muteMiddleware(msg, sock, getCachedGroupMetadata);

    if (!muted) {
        // ===== NOVO ANTISPAM =====
        const spamCheck = checkSpam(groupJid, sender);
        if (spamCheck.isSpam) {
            // Deletar a mensagem do usuário que caiu no spam
            try {
                await sock.sendMessage(groupJid, { delete: msg.key });
            } catch (err) {
                console.error("Erro ao deletar mensagem de spam:", err);
            }

            // Se deve aplicar advertência
            if (spamCheck.warned) {
                try {
                    const metadata = await getCachedGroupMetadata(sock, groupJid);
                    const isSenderAdmin = metadata.participants.find(p => p.id === sender && p.admin);
                    
                    if (!isSenderAdmin) {
                        // Aplica advertência por spam
                        const spamConfig = groupConfig.antispam || {};
                        const botJid = sock.user.id.split(":")[0] + "@s.whatsapp.net";
                        await applyWarning(
                            sock,
                            groupJid,
                            sender,
                            botJid, // Bot aplica a advertência
                            `Spam detectado - ${spamConfig.maxMessages || 6} mensagens em menos de ${spamConfig.timeWindow || 900}ms`,
                            3 // limite padrão
                        );
                    }
                } catch (err) {
                    console.error("Erro ao aplicar advertência por spam:", err);
                }
            }
            return;
        }

        // ============ MIDDLEWARE - AUSENTE ============
        await ausenteMiddleware(msg, sock);

        // ❌ ignora reações e mensagens técnicas
        const ignoredTypes = [
            'reactionMessage',
            'protocolMessage',
            'pollUpdateMessage',
            'senderKeyDistributionMessage'
        ]

        if (!ignoredTypes.includes(msgType)) {
            incrementCount(groupJid, sender, pushName);

            // 🏆 CONQUISTAS DE MENSAGENS
            await checkAchievements({
                sock,
                groupId: groupJid,
                user: sender,
                type: "send_messages",
                quoted: msg,
                pushName
            });

            incrementSimpleCount(groupJid, sender);
        }
    }

    //await sleep(GLOBALS.RESPONSE_DELAY);

    // ============ MIDDLEWARE - ANTIFIG ============
    const wasHandled = await antiFigMiddleware(msg, sock, getCachedGroupMetadata);
    if (wasHandled) return;

    // ============ MIDDLEWARE - ANTILINK ============
    const linkHandled = await antiLinkMiddleware(msg, sock, getCachedGroupMetadata);
    if (linkHandled) return;

    // ============ CASAMENTO ============
    const responded = await handleMarriageResponse({ sock, msg, text: text.trim() })
    if (responded) return;

    if (await ticTacToeListener(sock, msg, text)) return; // Jogo da velha
    if (await minesweeperListener(sock, msg, text)) return; // Campo minado
    if (await termoListener(sock, msg, text)) return; // Termo (Wordle)
    if (await buscarAppListener(sock, msg, text)) return; // Play Store

    // AUTO LEARN
    const context = msg.message.extendedTextMessage?.contextInfo
    if (groupConfig.autoLearn && context?.quotedMessage) {
        const originalText =
            context.quotedMessage.conversation ||
            context.quotedMessage.extendedTextMessage?.text ||
            ''
        const replyText = text

        if (originalText && replyText) {
            learnAutoResponse(originalText, replyText)
        }
    }

    if (groupConfig.auto === true) {
        const textStr = msg.message.conversation || msg.message.extendedTextMessage?.text || ''
        const prefix = groupConfig.prefix || "!";
        
        if (!textStr.trim().startsWith(prefix)) {
            const response = getAutoResponse(textStr.trim())
            if (response) {
                await sock.sendMessage(groupJid, { text: response }, { quoted: msg })
                return // para o fluxo para não processar comandos
            }
        }
    }
    // ============ IA (menção ao bot) ============
    // ============ IA (gatilho Bot/Garth) ============
    // Desativado: IA nao sera mais chamada por "bot" ou "garth".
    if (await handleAiTrigger({ sock, msg, groupJid, groupConfig, sender, pushName })) return;

    await maybeDropChest({ sock, msg });
    await maybeSpawnCarroForte({ sock, msg });

    // ============ COMMANDS ============
    await handleCommand({ sock, msg, sender, isCreator });
}
