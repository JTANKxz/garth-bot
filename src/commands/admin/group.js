import { getGroupConfig } from "../../utils/groups.js"

export default {
    name: "gp",
    description: "Configurações administrativas do grupo.",
    aliases: ["grupo", "group"],
    usage: "(abrir/fechar/name)",
    category: "admin",

    async run({ sock, msg, args }) {
        const jid = msg.key.remoteJid;

        const groupConfig = getGroupConfig(jid);
        const prefix = groupConfig.prefix || "!";

        if (!args[0]) {
            return sock.sendMessage(jid, {
                text:
`⚙️ *Gerenciamento do Grupo*

> *${prefix}gp abrir*
> *${prefix}gp fechar*
> *${prefix}gp name <nome>*`
            }, { quoted: msg });
        }

        const option = args[0].toLowerCase();

        if (option === "fechar") {
            await sock.groupSettingUpdate(jid, "announcement");
            return sock.sendMessage(jid, {
                text: "🔒 *Grupo fechado!* Apenas administradores podem enviar mensagens."
            }, { quoted: msg });
        }

        if (option === "abrir") {
            await sock.groupSettingUpdate(jid, "not_announcement");
            return sock.sendMessage(jid, {
                text: "🔓 *Grupo aberto!* Todos podem enviar mensagens."
            }, { quoted: msg });
        }

        if (option === "name") {
            const newName = args.slice(1).join(" ");

            if (!newName) {
                return sock.sendMessage(jid, {
                    text: "❌ Use: *gp name Novo Nome do Grupo*"
                }, { quoted: msg });
            }

            await sock.groupUpdateSubject(jid, newName);

            return sock.sendMessage(jid, {
                text: `✅ Nome do grupo alterado para:\n*${newName}*`
            }, { quoted: msg });
        }

        return sock.sendMessage(jid, {
            text: "❌ Opção inválida.\nUse: *gp abrir*, *gp fechar*, *gp name <nome>*"
        }, { quoted: msg });
    }
};
