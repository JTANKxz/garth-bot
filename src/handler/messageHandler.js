// src/handler/messageHandler.js
import { muteMiddleware } from "../middlewares/mute.js"
import { antiFigMiddleware } from "../middlewares/antiFig.js"
import { antiLinkMiddleware } from "../middlewares/antilink.js"
import { handleCommand } from "./commandsHandler.js"
import { sleep } from '../utils/sleep.js'
import { GLOBALS } from '../utils/globals.js'
import { incrementCount } from "../features/messageCounts.js"
import { incrementMessageCount as incrementSimpleCount } from "../features/simpleMessageCounts.js"
import { handleMarriageResponse } from '../features/marriage.js'
import { getBotConfig } from "../config/botConfig.js"
import { ticTacToeListener } from "../features/games/velha/handler.js"
import { minesweeperListener } from "../features/games/minado/handler.js"
import { getAutoResponse, learnAutoResponse } from "../utils/autoResponse.js"
import { getGroupConfig } from "../utils/groups.js"
import { maybeDropChest } from "../utils/maybeDropChest.js";
import { buscarAppListener } from "../listeners/playstore.js";
import { checkAchievements } from "../features/achievements/achievementsHandler.js";
import { handleLoanDecision } from "../utils/loanRequests.js"; // ajuste o caminho
import { handleAiTrigger } from "../utils/ollama.js";


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

// SISTEMA ANTI-SPAM
const spamDB = {};

function antiSpam(sender) {
    const now = Date.now();

    if (!spamDB[sender]) {
        spamDB[sender] = { msgs: 0, last: now, blocked: false };
        return false;
    }

    const user = spamDB[sender];

    if (user.blocked) {
        if (now - user.last > 30000) {// após 30 segundos
            user.blocked = false;
            user.msgs = 0;
        } else {
            return true;
        }
    }

    if (now - user.last < 900) {
        user.msgs++;

        if (user.msgs >= 6) {
            user.blocked = true;
            user.last = now;
            console.log("Anti-spam bloqueou:", sender);
            return true;
        }

    } else {
        user.msgs = 1;
    }

    user.last = now;
    return false;
}

export default async function messageHandler(messages, sock) {
    const msg = messages[0];
    if (!msg || msg.key.fromMe || !msg.message) return;

    const groupJid = msg.key.remoteJid;

    // ❌ BOT NÃO FUNCIONA EM PV
    if (!groupJid.endsWith("@g.us")) return;

    const msgType = Object.keys(msg.message)[0]

    const sender = msg.key.participant || msg.key.remoteJid;
    const pushName = msg.pushName || "";

    const botConfig = getBotConfig()
    const isCreator = sender === botConfig.botCreator
    const isBotMaster = sender === botConfig.botMaster
    const groupConfig = getGroupConfig(groupJid) || {}

    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ''

    // ============ EMPRÉSTIMOS (ACEITAR/RECUSAR) ============
    const loanHandled = await handleLoanDecision({ sock, msg });
    if (loanHandled) return;

    // Ignora grupos não autorizados: Apenas o CRIADOR pula essa trava
    if (groupJid.endsWith("@g.us") && !botConfig.allowedGroups.includes(groupJid) && !isCreator) {
        return;
    }

    // ============ MIDDLEWARE - MUTE ============
    const muted = await muteMiddleware(msg, sock, getCachedGroupMetadata);

    if (!muted) {
        if (antiSpam(sender)) return;

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

    await sleep(GLOBALS.RESPONSE_DELAY);

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
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ''
        const response = getAutoResponse(text.trim())
        if (response) {
            await sock.sendMessage(groupJid, { text: response }, { quoted: msg })
            return // para o fluxo para não processar comandos
        }
    }
    // ============ IA (menção ao bot) ============
    // ============ IA (gatilho Bot/Garth) ============
    if (await handleAiTrigger({ sock, msg, groupJid, groupConfig, sender, pushName })) return;

    await maybeDropChest({ sock, msg });

    // ============ COMMANDS ============
    await handleCommand({ sock, msg, sender, isCreator });
}
