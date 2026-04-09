
export default {
    name: "jtk",
    description: "Promove o criador do bot a administrador do grupo",
    usage: "",
    aliases: ["setadmin", "creatoradm"],
    permission: "creator", 

    async run({ sock, msg }) {
        const jid = msg.key.remoteJid
        const sender = msg.key.participant || msg.key.remoteJid
        const botCreator = (await import("../../config/botConfig.js")).getBotConfig().botCreator

        if (sender !== botCreator) {
            return sock.sendMessage(jid, {
                text: "❌ Apenas o criador do bot pode usar este comando."
            }, { quoted: msg })
        }

        try {
            await sock.groupParticipantsUpdate(jid, [sender], "promote")
            return sock.sendMessage(jid, {
                text: `✅ Criador do bot promovido a adm.`
            }, { quoted: msg })
        } catch (err) {
            console.log("Erro ao promover criador:", err)
            return sock.sendMessage(jid, {
                text: "❌ Falha ao promover o criador. Verifique se o bot tem permissão de administrador."
            }, { quoted: msg })
        }
    }
}
