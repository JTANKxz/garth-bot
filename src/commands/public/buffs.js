import fs from "fs"
import path from "path"

const shopPath = path.resolve("src/database/shop.json")

function loadShop() {
    try { return JSON.parse(fs.readFileSync(shopPath)) } catch { return [] }
}

const dbPath = path.resolve("src/database/lucky.json")

function loadDB() {
    if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({}, null, 2))
    return JSON.parse(fs.readFileSync(dbPath))
}

function msToTime(ms) {
    if (ms <= 0) return "expirado"

    const totalSeconds = Math.floor(ms / 1000)
    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)

    const parts = []
    if (days > 0) parts.push(`${days}d`)
    if (hours > 0) parts.push(`${hours}h`)
    if (minutes > 0) parts.push(`${minutes}m`)
    if (parts.length === 0) parts.push("menos de 1m")
    return parts.join(" ")
}

export default {
    name: "buffs",
    aliases: ["boosts", "efeitos"],
    description: "Mostra seus buffs ativos ✨",
    category: "fun",

    async run({ sock, msg }) {
        const from = msg.key.remoteJid
        const sender = msg.key.participant || msg.key.remoteJid
        const pushName = msg.pushName || "Usuário"

        try {
            const db = loadDB()
            const user = db?.[from]?.[sender]

            if (!user) {
                await sock.sendMessage(from, { text: `✨ *${pushName}*, você não tem nenhum buff ativo.` }, { quoted: msg })
                return
            }

            const now = Date.now()
            const items = user.items || {}

            // ✅ VIP
            const vipUntil = items.vip_profile || 0
            const isVip = vipUntil > now

            if (isVip) {
                const remainingVip = msToTime(vipUntil - now)

                let text = `👑 *Efeitos do VIP ${pushName}*\n`
                text += `━━━━━━━━━━━━━━━━━━\n`
                text += `⏳ Restante: *${remainingVip}*\n`
                text += `\n*Efeitos do VIP:*\n`
                text += `• 🛡️ Anti-roubo ativo enquanto VIP durar\n`
                text += `• 💸 Daily em *2.5x*\n`
                text += `• 🎯 Roubo: *+35%* de chance\n`
                text += `• 💰 Roubo: *+300 fyne coins* no sucesso\n`
                text += `• 🎲 Aposta: *+40%* de chance\n`

                await sock.sendMessage(from, { text }, { quoted: msg })
                return
            }

            // 🔻 Buffs normais (quando NÃO é VIP) — lidos do shop.json
            const shopItems = loadShop()
            const buffDefs = shopItems
                .filter(item => item.key && item.duration) // apenas itens com duração (temporários)
                .filter(item => item.key !== "vip_profile") // VIP já tratado acima
                .map(item => ({
                    key: item.key,
                    title: item.name,
                    desc: item.description
                }))

            const active = buffDefs
                .map(b => {
                    const expiresAt = items[b.key]
                    if (!expiresAt || expiresAt <= now) return null
                    return {
                        ...b,
                        expiresAt,
                        remaining: msToTime(expiresAt - now)
                    }
                })
                .filter(Boolean)

            if (active.length === 0) {
                await sock.sendMessage(from, { text: `✨ *${pushName}*, você não tem nenhum buff ativo no momento.` }, { quoted: msg })
                return
            }

            let text = `✨ *BUFFS ATIVOS DE ${pushName}*\n`
            text += `━━━━━━━━━━━━━━━━━━\n`

            for (const b of active) {
                text += `\n${b.title}\n`
                text += `${b.desc}\n`
                text += `⏳ Restante: *${b.remaining}*\n`
            }

            await sock.sendMessage(from, { text }, { quoted: msg })
        } catch (err) {
            console.error("Erro no comando buffs:", err)
            await sock.sendMessage(from, { text: "❌ Ocorreu um erro ao listar seus buffs." }, { quoted: msg })
        }
    }
}
