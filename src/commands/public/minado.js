import { startMinesweeper } from "../../features/games/minado/index.js"

export default {
    name: "minado",
    description: "Inicia um jogo solo de Campo Minado",
    aliases: ["campo", "bombas"],
    showInMenu: true,
    category: "fun",

    async run({ sock, msg }) {
        const from = msg.key.remoteJid

        await sock.sendMessage(from, { react: { text: "⏳", key: msg.key } })

        try {
            await startMinesweeper(sock, msg)
            await sock.sendMessage(from, { react: { text: "✅", key: msg.key } })

        } catch (err) {
            console.error("Erro no comando minado:", err)

            await sock.sendMessage(from, { react: { text: "❌", key: msg.key } })
            await sock.sendMessage(from, {
                text: "❌ Erro ao iniciar o Campo Minado."
            }, { quoted: msg })
        }
    }
}
