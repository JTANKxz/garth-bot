import { getGroupConfig } from "../../utils/groups.js"

export default {
    name: "status",
    aliases: ["config", "configs"],
    description: "Mostra o status atual das configurações do grupo",
    category: "admin",
    permission: "public",

    async run({ sock, msg }) {
        const jid = msg.key.remoteJid
        const gConfig = getGroupConfig(jid)

        const onOff = (value) => value ? "Ativado" : "Desativado"

        const text =
`╔═══✦ ⚙️ *INFO GRUPO* ✦═══
> *Prefixo:* ${gConfig.prefix || "!"}

> *Boas-vindas:* ${onOff(gConfig.welcomeGroup)}
> *Msg bem vindo :* ${gConfig.welcomeMessage ? "Sim" : "Não"}
> *Msg saida:* ${onOff(gConfig.leaveGroupMessage)}

> *Privado:* ${onOff(gConfig.onlyAdmins)}
> *Anti-link:* ${onOff(gConfig.antilink)}
> *Anti-figurinha:* ${onOff(gConfig.antifig)}

> *Blacklist:* ${gConfig.blacklisteds?.length || 0} usuários
> *Mutados:* ${Object.keys(gConfig.muteds || {}).length}
> *Advs:* ${Object.keys(gConfig.warnings || {}).length}
╚════════════════════`

        return sock.sendMessage(jid, {
            text
        }, { quoted: msg })
    }
}
