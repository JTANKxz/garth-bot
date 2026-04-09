import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { connectBot } from './connection.js'
import messageHandler from './src/handler/messageHandler.js'

console.log('🤖 GARTH BOT v4 - INICIANDO')

async function askPhoneNumber() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    })

    return new Promise(resolve => {
        rl.question('📞 Digite o número para conectar (somente dígitos, ex: 55869999999): ', (num) => {
            rl.close()
            resolve(num.trim())
        })
    })
}

async function start() {
    const authPath = path.resolve('./auth/creds.json')
    const hasAuth = fs.existsSync(authPath)

    if (hasAuth) {
        console.log("🔁 Sessão detectada! Conectando automaticamente...")
        const sock = await connectBot(null, messageHandler)

        return
    }

    const authDir = path.dirname(authPath)
    if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true })

    // Pede número se não houver sessão
    const phoneNumber = await askPhoneNumber()
    const sock = await connectBot(phoneNumber, messageHandler)
}

start()
