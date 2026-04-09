// connection.js - fica responsável por conectar o bot
import makeWASocket, {
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    Browsers,
    DisconnectReason
} from 'baileys'
import fs from 'fs/promises'
import pino from 'pino' 
import { groupHandler } from './src/handler/groupHandler.js'


// Logger do Baileys
const logger = pino({ level: 'error' })

export async function connectBot(phoneNumber, messageHandler) {
    try {
        console.log('🚀 Iniciando bot...')

        try { await fs.access('./auth') }
        catch { await fs.mkdir('./auth', { recursive: true }) }

        const { state, saveCreds } = await useMultiFileAuthState('./auth')
        const { version } = await fetchLatestBaileysVersion()

        const sock = makeWASocket({
            auth: state,
            version,
            browser: Browsers.ubuntu('Chrome'),
            printQRInTerminal: false,
            syncFullHistory: false,
            markOnlineOnConnect: false,
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 10000,
            emitOwnEvents: false,
            fireInitQueries: false,
            logger
        })

        sock.ev.on('creds.update', saveCreds)

        let pairingRequested = false

        // Conexão
        sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
            if (connection === 'open') {
                console.log('✅ Conectado com sucesso!')
                console.log(`📞 Número conectado: ${sock.user.id.replace('@s.whatsapp.net', '')}`)
                pairingRequested = false
                return
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode
                console.log(`❌ Conexão fechada (${statusCode}). Tentando reconectar...`)

                if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
                    console.log('🧹 Sessão inválida, limpando autenticação...')
                    try {
                        await fs.rm('./auth', { recursive: true, force: true })
                        await fs.mkdir('./auth', { recursive: true })
                        console.log('✅ Pasta auth limpa!')
                    } catch (err) {
                        console.log('⚠️ Erro ao limpar auth:', err)
                    }
                }

                console.log('🔄 Reconectando em 5 segundos...')
                setTimeout(() => connectBot(phoneNumber, messageHandler), 5000)
                return
            }

            if (connection === 'connecting' && !pairingRequested) {
                pairingRequested = true
                setTimeout(async () => {
                    if (!sock.authState.creds.registered && phoneNumber) {
                        try {
                            console.log(`\n🔐 SOLICITANDO CÓDIGO DE PAREAMENTO PARA ${phoneNumber}...`)
                            const code = await sock.requestPairingCode(phoneNumber)
                            console.log('📟 CÓDIGO DE PAREAMENTO:', code)
                            console.log('📱 Use este código no WhatsApp para vincular o dispositivo.')
                        } catch (err) {
                            console.log('❌ Erro ao gerar código:', err.message)
                            pairingRequested = false
                        }
                    }
                }, 3000)
            }
        })

        // Mensagens
        sock.ev.on('messages.upsert', async ({ messages }) => {
            if (messageHandler) messageHandler(messages, sock)
        })

        sock.ev.on('group-participants.update', async (update) => {
            await groupHandler(sock, update)
        })

    } catch (error) {
        console.log('💥 ERRO CRÍTICO na inicialização:', error)
        console.log('🔄 Reiniciando em 10 segundos...')
        setTimeout(() => connectBot(phoneNumber, messageHandler), 10000)
    }
}
