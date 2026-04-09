// src/features/simpleMessageCounts.js
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const countsPath = path.join(__dirname, '../database/simpleMessageCounts.json')

if (!fs.existsSync(path.dirname(countsPath))) {
    fs.mkdirSync(path.dirname(countsPath), { recursive: true })
}

if (!fs.existsSync(countsPath)) {
    fs.writeFileSync(countsPath, '{}')
}

export let simpleMessageCount = {}

try {
    const content = fs.readFileSync(countsPath, 'utf-8')
    simpleMessageCount = content.trim() ? JSON.parse(content) : {}
} catch (error) {
    console.error('❌ Erro ao carregar simpleMessageCounts.json:', error.message)
    simpleMessageCount = {}
}

export function saveCounts() {
    try {
        fs.writeFileSync(countsPath, JSON.stringify(simpleMessageCount, null, 2))
    } catch (error) {
        console.error('❌ Erro ao salvar simpleMessageCounts.json:', error.message)
    }
}

export function initializeUser(groupJid, userJid) {
    if (!simpleMessageCount[groupJid]) simpleMessageCount[groupJid] = {}
    if (!simpleMessageCount[groupJid][userJid]) simpleMessageCount[groupJid][userJid] = 0
}

export function incrementMessageCount(groupJid, userJid) {
    initializeUser(groupJid, userJid)
    simpleMessageCount[groupJid][userJid]++
    saveCounts()
}

export function getUserMessageCount(groupJid, userJid) {
    initializeUser(groupJid, userJid)
    return simpleMessageCount[groupJid][userJid]
}

export function getRanking(groupJid) {
    const users = simpleMessageCount[groupJid] || {}

    const sorted = Object.entries(users).sort(([, a], [, b]) => b - a)

    if (sorted.length === 0) {
        return { text: "📊 Ninguém enviou mensagens ainda.", mentions: [] }
    }

    const lines = sorted.map(([jid, count], index) => {
        const displayName = `@${jid.split('@')[0]}`
        return `${index + 1}. *${displayName}* — *${count}* msgs`
    })

    return {
        text: `🏆 *Ranking Semanal*\n\n${lines.join('\n')}`,
        mentions: sorted.map(([jid]) => jid)
    }
}

export function removeUser(groupJid, userJid) {
    if (simpleMessageCount[groupJid]?.[userJid]) {
        delete simpleMessageCount[groupJid][userJid]
        if (Object.keys(simpleMessageCount[groupJid]).length === 0) {
            delete simpleMessageCount[groupJid]
        }
        saveCounts()
    }
}

export function resetGroup(groupJid) {
    if (simpleMessageCount[groupJid]) {
        delete simpleMessageCount[groupJid]
        saveCounts()
    }
}
