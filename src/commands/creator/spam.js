import { generateWAMessageFromContent, proto } from "baileys"

export default {
    name: "spamgr",
    aliases: ["spgrp", "spgr"],
    description: "Spam de grupo para restringir",
    category: "tools",

    async run({ sock, msg, args }) {
        const from = msg.key.remoteJid
        
        // Verifica se o comando foi executado em um grupo
        if (!from.endsWith("@g.us")) {
            return sock.sendMessage(
                msg.key.remoteJid,
                { text: "Este comando só pode ser usado em grupos!" },
                { quoted: msg }
            )
        }

        // Pega o ID do grupo atual
        const groupId = from
        const qtd = parseInt(args[0]) || 100
        const delay = parseInt(args[1]) || 500

        await sock.sendMessage(from, { react: { text: "⏳", key: msg.key } })

        try {
            let successCount = 0
            let errorCount = 0
            
            for (let i = 0; i < qtd; i++) {
                try {
                    // Mensagem de spam usando apenas a estrutura mínima
                    const spamMsg = {
                        message: {
                            conversation: " ".repeat(1000) + 
                                         "\n\n" +
                                         Array(50).fill("SPAM GROUP RESTRICTION").join("\n")
                        }
                    }

                    // Envia diretamente para o grupo atual
                    await sock.sendMessage(groupId, spamMsg)
                    
                    successCount++
                    
                    // Espera entre mensagens
                    await new Promise(r => setTimeout(r, delay))
                } catch (error) {
                    errorCount++
                    console.log(`Erro na mensagem ${i+1}:`, error)
                }
            }

            await sock.sendMessage(
                from, 
                { text: `✅ ${successCount}/${qtd} mensagens enviadas (${errorCount} erros)` }, 
                { quoted: msg }
            )
        } catch (e) {
            console.log("Erro no spam de grupo:", e)
            await sock.sendMessage(from, { text: "Erro no envio." })
        }
    }
}