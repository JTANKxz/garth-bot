import { getGroupConfig } from "../../utils/groups.js";

export default {
    name: "vote",
    aliases: ["enquete"],
    description: "Cria uma enquete com opções customizadas ou padrão Sim/Não",
    category: "admin",

    async run({ sock, msg, args }) {
        const jid = msg.key.remoteJid;

        const gConfig = getGroupConfig(jid);
        const prefix = gConfig.prefix || "!";

        if (!args.length) {
            return sock.sendMessage(jid, { text: `❌ Use: ${prefix}vote Pergunta[/opção1/opção2/...]. Ex: ${prefix}vote Qual brincadeira?/ppp/gartic` });
        }

        const raw = args.join(" ").trim();
        const parts = raw.split("/");

        const question = parts[0].trim();
        let options = parts.slice(1).map(o => o.trim()).filter(Boolean);

        if (!options.length) options = ["Sim", "Não"];

        if (options.length < 2) {
            return sock.sendMessage(jid, { text: "❌ É preciso pelo menos duas opções para criar a enquete." });
        }

        try {
            await sock.sendMessage(jid, {
                poll: {
                    name: question,
                    values: options,
                    selectableCount: 1,
                    toAnnouncementGroup: false
                }
            });
        } catch (err) {
            console.error("Erro ao criar enquete:", err);
            await sock.sendMessage(jid, { text: "❌ Erro ao criar enquete. Tente novamente." });
        }
    }
};
