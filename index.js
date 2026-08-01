import './src/config/loadEnv.js'
import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { connectBot } from './connection.js'
import messageHandler from './src/handler/messageHandler.js'
import { getBotConfig } from './src/config/botConfig.js'

console.log(`?? ${getBotConfig().botName} - INICIANDO`)

async function askConnectionMethod() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    })

    return new Promise(resolve => {
        rl.question('\nðŸ” Escolha o mÃ©todo de conexÃ£o:\n1 - QR Code\n2 - CÃ³digo de Pareamento\n\nOpÃ§Ã£o (1 ou 2): ', (choice) => {
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
        rl.question('ðŸ“ž Digite o nÃºmero para conectar (somente dÃ­gitos, ex: 55869999999): ', (num) => {
            rl.close()
            resolve(num.trim())
        })
    })
}

async function start() {
    const authPath = path.resolve('./auth/creds.json')
    const hasAuth = fs.existsSync(authPath)

    if (hasAuth) {
        console.log("ðŸ” SessÃ£o detectada! Conectando automaticamente...")
        connectBot(null, messageHandler, 'qr')
        return
    }

    const authDir = path.dirname(authPath)
    if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true })

    // Pede mÃ©todo de conexÃ£o
    const method = await askConnectionMethod()
    
    if (method === '1') {
        // ConexÃ£o via QR Code
        console.log('\nðŸ“± Modo QR Code selecionado')
        connectBot(null, messageHandler, 'qr')
    } else if (method === '2') {
        // ConexÃ£o via CÃ³digo de Pareamento
        console.log('\nðŸ“² Modo CÃ³digo de Pareamento selecionado')
        const phoneNumber = await askPhoneNumber()
        connectBot(phoneNumber, messageHandler, 'pairing')
    } else {
        console.log('âŒ OpÃ§Ã£o invÃ¡lida! Usando QR Code por padrÃ£o...')
        connectBot(null, messageHandler, 'qr')
    }
}

start()

