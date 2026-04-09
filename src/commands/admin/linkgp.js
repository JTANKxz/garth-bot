export default {
    name: "linkgp",
    aliases: ["gplink"],
    description: "Mostra o link de convite do grupo",
    category: "admin",

    async run({ sock, msg }) {
        const jid = msg.key.remoteJid;

        try {
            
            const metadata = await sock.groupMetadata(jid);
            const inviteCode = await sock.groupInviteCode(jid);

            if (!inviteCode) {
                return sock.sendMessage(jid, { text: "❌ Não foi possível obter o link do grupo." });
            }

            const inviteLink = `https://chat.whatsapp.com/${inviteCode}`;
            await sock.sendMessage(jid, { text: `🔗 Link do grupo: ${inviteLink}` });
        } catch (err) {
            console.error("Erro ao pegar link do grupo:", err);
            await sock.sendMessage(jid, { text: "❌ Ocorreu um erro ao gerar o link do grupo." });
        }
    }
};
