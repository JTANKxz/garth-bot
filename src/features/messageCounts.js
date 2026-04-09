// src/features/messageCounts.js
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const countsPath = path.join(__dirname, '../database/messageCounts.json')

if (!fs.existsSync(path.dirname(countsPath))) {
    fs.mkdirSync(path.dirname(countsPath), { recursive: true })
}

if (!fs.existsSync(countsPath)) {
    fs.writeFileSync(countsPath, '{}')
}

export let messageCount = {}

try {
    const content = fs.readFileSync(countsPath, 'utf-8')
    messageCount = content.trim() ? JSON.parse(content) : {}
} catch (error) {
    console.error('❌ Erro ao carregar messageCounts.json:', error.message)
    messageCount = {}
}

export function saveCounts() {
    try {
        fs.writeFileSync(countsPath, JSON.stringify(messageCount, null, 2))
    } catch (error) {
        console.error('❌ Erro ao salvar messageCounts.json:', error.message)
    }
}

// Inicializa atributos do usuário
export function initializeAttributes(groupJid, userJid) {
    if (!messageCount[groupJid]) messageCount[groupJid] = {}

    if (!messageCount[groupJid][userJid]) {
        messageCount[groupJid][userJid] = {
            name: "",
            messages: 0,
            xp: 0,
            popularity: 0,
            forca: 0,
            victories: 0,
            defeats: 0,
            spentPopularity: 0,
            life: 100,
            protection: 0,
            agility: 0
        }
    }
}

// Incrementa mensagens (automático)
export function incrementCount(groupJid, userJid, name = '') {
    initializeAttributes(groupJid, userJid)
    const user = messageCount[groupJid][userJid]

    user.messages++
    user.xp = (user.xp || 0) + 1
    
    if (isNaN(user.messages) || user.messages < 0) user.messages = 0

    if (name && user.name !== name) user.name = name

    // Cada 100 mensagens → +1 popularidade
    if (user.messages % 100 === 0) {
        user.popularity++
    }

    saveCounts()
}

// Ranking por mensagens
export function getRanking(groupJid) {
    const users = messageCount[groupJid] || {}

    const sorted = Object.entries(users)
        .filter(([, data]) => data && typeof data === "object")
        .sort(([, a], [, b]) => b.messages - a.messages)

    if (sorted.length === 0) {
        return { text: "📊 Ninguém enviou mensagens ainda.", mentions: [] }
    }

    const lines = sorted.map(([jid, data], index) => {
        const displayName = data.name || `@${jid.split('@')[0]}`
        return `${index + 1}. *${displayName}* — *${data.messages}* msgs`
    })

    return {
        text: `🏆 *Ranking dos Mais Ativos*\n\n${lines.join('\n')}`,
        mentions: sorted.map(([jid]) => jid)
    }
}

// Ranking por popularidade
export function getPopularityRanking(groupJid) {
    const users = messageCount[groupJid] || {}

    const sorted = Object.entries(users)
        .filter(([, data]) => data && typeof data === "object")
        .sort(([, a], [, b]) => b.popularity - a.popularity)

    if (sorted.length === 0) {
        return { text: "⭐ Ninguém tem popularidade ainda.", mentions: [] }
    }

    const lines = sorted.map(([jid, data], index) => {
        const displayName = data.name || `@${jid.split('@')[0]}`
        return `${index + 1}. *${displayName}* — ⭐ ${data.popularity}`
    })

    return {
        text: `🌟 *Ranking de Popularidade*\n\n${lines.join('\n')}`,
        mentions: sorted.map(([jid]) => jid)
    }
}

// Adiciona popularidade (para shop)
export function addPopularity(groupJid, userJid, amount = 1) {
    initializeAttributes(groupJid, userJid)
    const user = messageCount[groupJid][userJid]

    user.popularity += amount
    if (user.popularity < 0) user.popularity = 0

    saveCounts()
}

// Adiciona mensagens (para shop)
export function addMessages(groupJid, userJid, amount = 100) {
    initializeAttributes(groupJid, userJid)
    const user = messageCount[groupJid][userJid]

    user.messages += amount
    if (user.messages < 0) user.messages = 0

    saveCounts()
}

// Remove usuário do ranking
export function removeUser(groupJid, userJid) {
    if (messageCount[groupJid]?.[userJid]) {
        delete messageCount[groupJid][userJid]

        if (Object.keys(messageCount[groupJid]).length === 0) {
            delete messageCount[groupJid]
        }

        saveCounts()
    }
}

// Remove grupo inteiro
export function removeGroup(groupJid) {
    if (messageCount[groupJid]) {
        delete messageCount[groupJid]
        saveCounts()
    }
}
