import { getGroupConfig } from "../../utils/groups.js"
import { getBotConfig } from "../../config/botConfig.js"
import fs from "fs"
import path from "path"

const dbPath = path.resolve("src/database/lucky.json")

function loadDB() {
    if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({}, null, 2))
    return JSON.parse(fs.readFileSync(dbPath))
}

function saveDB(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2))
}

export default {
    name: "frase",
    aliases: ["phrase"],
    description: "Define uma frase personalizada (VIP ou Criador) 👑",
    category: "fun",

    async run({ sock, msg, args }) {
        const jid = msg.key.remoteJid
        const gConfig = getGroupConfig(jid)
        const prefix = gConfig.prefix || "!"

        const from = msg.key.remoteJid
        const sender = msg.key.participant || msg.key.remoteJid

        // ✅ Criador / Master (igual no perfil)
        const botConfig = getBotConfig()
        const isCreator = sender === botConfig.botCreator
        const isBotMaster = sender === botConfig.botMaster

        const phrase = args.join(" ").trim()
        if (!phrase) {
            return sock.sendMessage(
                from,
                { text: `❌ Use: *${prefix}frase <sua frase aqui>*\nEx: *${prefix}frase eu sou VIP 😎*` },
                { quoted: msg }
            )
        }

        try {
            const db = loadDB()
            if (!db[from]) db[from] = {}

            // garante estrutura do usuário (igual você faz no comprar)
            if (!db[from][sender]) {
                db[from][sender] = {
                    money: 0,
                    lastDaily: null,
                    items: {},
                    dailyDoubleDays: 0,
                    customPhrase: ""
                }
            }

            const user = db[from][sender]
            if (!user.items) user.items = {}
            if (!user.customPhrase) user.customPhrase = ""

            const now = Date.now()

            // ✅ Checagem VIP (mas criador/master passam)
            const vipUntil = user.items.vip_profile || 0
            const isVip = vipUntil > now

            if (!isVip && !isCreator && !isBotMaster) {
                return sock.sendMessage(
                    from,
                    { text: `❌ Este comando é exclusivo para *VIP* 👑\nCompre na loja: *${prefix}loja* → *${prefix}comprar 8*` },
                    { quoted: msg }
                )
            }

            // (Opcional) limite pra não virar spam/gigante
            const maxLen = 22
            if (phrase.length > maxLen) {
                return sock.sendMessage(
                    from,
                    { text: `❌ Sua frase é muito grande. Máximo: *${maxLen}* caracteres.` },
                    { quoted: msg }
                )
            }

            // salva a frase
            user.customPhrase = phrase
            saveDB(db)

            await sock.sendMessage(
                from,
                { text: `👑 Frase definida com sucesso!\n\n📝 *Sua frase:*\n“${phrase}”` },
                { quoted: msg }
            )
        } catch (err) {
            console.error("Erro no comando frase:", err)
            await sock.sendMessage(from, { text: "❌ Ocorreu um erro ao definir sua frase." }, { quoted: msg })
        }
    }
}
