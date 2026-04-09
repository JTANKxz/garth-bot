//src/features/marriage.js
import fs from 'fs'
import path from 'path'

const DATABASE_DIR = path.join('./src', 'database')
const DATABASE_FILE = path.join(DATABASE_DIR, 'casamentos.json')
if (!fs.existsSync(DATABASE_DIR)) fs.mkdirSync(DATABASE_DIR)

export const activeSessions = {} // sessões esperando resposta

// Carrega ou cria o banco de dados
export function loadDatabase() {
    if (!fs.existsSync(DATABASE_FILE)) return {}
    try {
        return JSON.parse(fs.readFileSync(DATABASE_FILE, 'utf-8'))
    } catch {
        return {}
    }
}

// Salva o banco de dados
export function saveDatabase(db) {
    fs.writeFileSync(DATABASE_FILE, JSON.stringify(db, null, 2))
}

// Inicia um pedido de casamento
export async function startMarriage({ sock, msg, target }) {
    const from = msg.key.remoteJid
    const sender = msg.key.participant || from

    if (!target) return
    if (target === sender) {
        await sock.sendMessage(from, { text: '❌ Você não pode casar consigo mesmo!' }, { quoted: msg })
        return
    }

    // Cria sessão ativa aguardando resposta
    activeSessions[target] = {
        from: sender,
        group: from,
        messageId: msg.key.id,
        timeout: setTimeout(async () => {
            if (activeSessions[target]) {
                await sock.sendMessage(from, { 
                    text: `⌛ O pedido de casamento de @${sender.split('@')[0]} para @${target.split('@')[0]} expirou!`, 
                    mentions: [sender, target] 
                }, { quoted: msg })
                delete activeSessions[target]
            }
        }, 30000) // expira em 30 segundos
    }

    await sock.sendMessage(from, {
        text: `💍 @${sender.split('@')[0]} pediu você em casamento, @${target.split('@')[0]}!\nDigite *1* para aceitar ou *2* para recusar.`,
        mentions: [sender, target]
    }, { quoted: msg })
}

// Processa resposta do usuário (1 = aceitar, 2 = recusar)
export async function handleMarriageResponse({ sock, msg, text }) {
    const sender = msg.key.participant || msg.key.remoteJid
    if (!activeSessions[sender]) return false

    const session = activeSessions[sender]
    const groupId = session.group
    const requester = session.from
    const target = sender

    if (text === '1') {
        const db = loadDatabase()

        // cria objeto do grupo se não existir
        if (!db[groupId]) db[groupId] = {}

        // timestamp em horário de Brasília
        const brasiliaTime = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })

        // chave única do casamento no grupo
        const casamentoKey = `${requester}_${target}`

        db[groupId][casamentoKey] = {
            requester,
            target,
            timestamp: brasiliaTime
        }

        saveDatabase(db)

        await sock.sendMessage(groupId, {
            text: `💖 Parabéns! @${target.split('@')[0]} aceitou o pedido de @${requester.split('@')[0]}!\nData do casamento: ${brasiliaTime}`,
            mentions: [requester, target]
        })

        delete activeSessions[sender]
        return true
    } else if (text === '2') {
        await sock.sendMessage(session.group, {
            text: `💔 @${target.split('@')[0]} recusou o pedido de @${requester.split('@')[0]}.`,
            mentions: [requester, target]
        })
        delete activeSessions[sender]
        return true
    }

    return false
}

// Função auxiliar para pegar casamentos de um grupo
export function getMarriagesByGroup(groupId) {
    const db = loadDatabase()
    return db[groupId] || {}
}

// Remove todos os casamentos envolvendo um usuário do grupo
export function removeUserMarriages(groupId, userJid) {
    const db = loadDatabase()

    if (db[groupId]) {
        // Remove casamentos onde o usuário é participante
        for (let key in db[groupId]) {
            const marriage = db[groupId][key]
            if (marriage.requester === userJid || marriage.target === userJid) {
                delete db[groupId][key]
            }
        }

        // se o grupo ficar vazio, limpa também
        if (Object.keys(db[groupId]).length === 0) {
            delete db[groupId]
        }

        saveDatabase(db)
    }
}
