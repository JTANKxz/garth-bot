import { readJSON, writeJSON } from "../utils/readJSON.js";

const DB_AUSENTES = "database/ausentes.json";

function formatTimeLeft(ms) {
    const totalMinutes = Math.floor(ms / 60000);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    
    if (h === 0 && m === 0) return "Agora mesmo";
    if (h <= 0) return `${m} min`;
    return `${h}h ${m}m`;
}

export async function ausenteMiddleware(msg, sock) {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    
    // Ignorar bots/msgs não formatadas
    if (!msg || msg.key.fromMe || !msg.message) return false;

    const db = readJSON(DB_AUSENTES) || {};
    let handled = false;

    // 1. O próprio usuário ausente falou algo? (Remove a ausência)
    const ownAbsence = db[from]?.[sender];
    // A ausencia so pode ser removida por uma mensagem no mesmo grupo.
    if (ownAbsence && (!ownAbsence.groupId || ownAbsence.groupId === from)) {
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        
        // Se a mensagem for o próprio comando ativando, ignoramos para não desativar no mesmo milissegundo
        const textLower = text.toLowerCase().trim();
        if (!textLower.startsWith("!ausente") && !textLower.startsWith("/ausente") && !textLower.startsWith(".ausente")) {
            delete db[from][sender];
            writeJSON(DB_AUSENTES, db);
            
            // Avisa o usuário que ele voltou, mas não bloqueia a execução normal do comando que ele possa ter digitado
            await sock.sendMessage(from, { 
                text: `👋 *Bem-vindo de volta!* O seu status de *ausente* foi removido automaticamente.`, 
                mentions: [sender] 
            }, { quoted: msg });
        }
    }

    // 2. Alguém mencionou ou respondeu um usuário ausente?
    let targetId = null;
    
    // Checa se marcou com @
    if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
        // Encontra o primeiro usuário mencionado que esteja na DB de ausentes
        for (const jid of msg.message.extendedTextMessage.contextInfo.mentionedJid) {
            if (db[from]?.[jid]) {
                targetId = jid;
                break;
            }
        }
    } 
    
    // Checa se respondeu uma mensagem
    if (!targetId && msg.message?.extendedTextMessage?.contextInfo?.participant) {
        const quotedParticipant = msg.message.extendedTextMessage.contextInfo.participant;
        if (db[from]?.[quotedParticipant]) {
            targetId = quotedParticipant;
        }
    }

    // Se marcou um ausente (e não foi o próprio ausente marcando a si mesmo)
    if (targetId && targetId !== sender && db[from]?.[targetId]) {
        const info = db[from][targetId];
        const tempo = formatTimeLeft(Date.now() - info.time);
        
        await sock.sendMessage(from, {
            text: `⚠️ *USUÁRIO AUSENTE*\n\nO usuário @${targetId.split("@")[0]} não está disponível no momento.\n\n📝 *Motivo:* ${info.reason}\n🕒 *Ausente há:* ${tempo}`,
            mentions: [targetId]
        }, { quoted: msg });
        
        handled = true; 
    }

    return handled;
}
