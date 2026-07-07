import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { connectBot } from './connection.js'
import messageHandler from './src/handler/messageHandler.js'

console.log('🤖 GARTH BOT v4 - INICIANDO')

async function askConnectionMethod() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    })

    return new Promise(resolve => {
        rl.question('\n🔐 Escolha o método de conexão:\n1 - QR Code\n2 - Código de Pareamento\n\nOpção (1 ou 2): ', (choice) => {
            rl.close()
            resolve(choice.trim())
        })
    })
}

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

    // Pede método de conexão
    const method = await askConnectionMethod()
    
    if (method === '1') {
        // Conexão via QR Code
        console.log('\n📱 Modo QR Code selecionado')
        const sock = await connectBot(null, messageHandler, 'qr')
    } else if (method === '2') {
        // Conexão via Código de Pareamento
        console.log('\n📲 Modo Código de Pareamento selecionado')
        const phoneNumber = await askPhoneNumber()
        const sock = await connectBot(phoneNumber, messageHandler, 'pairing')
    } else {
        console.log('❌ Opção inválida! Usando QR Code por padrão...')
        const sock = await connectBot(null, messageHandler, 'qr')
    }
}

start()
