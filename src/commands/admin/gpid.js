export default {
    name: "idgp",
    aliases: ["gid", "gpid", "idgrupo"],
    description: "Mostra o ID do grupo",
    category: "admin",

    async run({ sock, msg }) {

        const jid = msg.key.remoteJid;

        await sock.sendMessage(jid, { text: `📌 ID do grupo: ${jid}` }, { quoted: msg });

    }
};
