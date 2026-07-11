import { getBotConfig } from "../../config/botConfig.js";

export default {
    name: "aceitar",
    aliases: ["acceptar", "aprovar"],
    usage: "[tudo | lista | <número>]",
    description: "Gerencia solicitações de entrada no grupo (aceitar todas, listar ou aceitar N pessoas).",
    category: "admin",

    async run({ sock, msg, args }) {
        const jid = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        const botConfig = getBotConfig();

        // Verifica se é grupo
        if (!jid.endsWith("@g.us")) {
            return sock.sendMessage(jid, { text: "❌ Este comando só funciona em grupos." }, { quoted: msg });
        }

        // Verifica se o bot é admin
        let metadata;
        try {
            metadata = await sock.groupMetadata(jid);
        } catch {
            return sock.sendMessage(jid, { text: "❌ Não consegui obter informações do grupo." }, { quoted: msg });
        }

        const botId = sock.user?.id?.replace(/:.*@/, "@") || "";
        const botParticipant = metadata.participants.find(p =>
            p.id.replace(/:.*@/, "@") === botId || p.id === botId
        );

        if (!botParticipant || (botParticipant.admin !== "admin" && botParticipant.admin !== "superadmin")) {
            return sock.sendMessage(jid, { text: "❌ O bot precisa ser administrador para aceitar solicitações." }, { quoted: msg });
        }

        // Verifica se o remetente é admin ou criador
        const senderParticipant = metadata.participants.find(p =>
            p.id.replace(/:.*@/, "@") === sender.replace(/:.*@/, "@") || p.id === sender
        );
        const isCreator = sender === botConfig.botCreator;
        const isSenderAdmin = isCreator || senderParticipant?.admin === "admin" || senderParticipant?.admin === "superadmin";

        if (!isSenderAdmin) {
            return sock.sendMessage(jid, { text: "❌ Apenas administradores podem usar este comando." }, { quoted: msg });
        }

        const subCmd = (args[0] || "").toLowerCase();

        // Busca lista de solicitações pendentes
        let requests;
        try {
            requests = await sock.groupRequestParticipantsList(jid);
        } catch (err) {
            console.error("Erro ao buscar solicitações:", err);
            return sock.sendMessage(jid, { text: "❌ Não consegui buscar as solicitações. Verifique se o grupo tem solicitações pendentes habilitadas." }, { quoted: msg });
        }

        if (!requests || requests.length === 0) {
            return sock.sendMessage(jid, { text: "✅ Não há solicitações de entrada pendentes no momento." }, { quoted: msg });
        }

        // ── LISTA ──────────────────────────────────────────────────────────
        if (subCmd === "lista" || subCmd === "list") {
            const lines = requests.map((r, i) => {
                const num = r.jid.replace(/@.+/, "");
                return `${i + 1}. @${num}`;
            });

            const mentions = requests.map(r => r.jid);

            return sock.sendMessage(jid, {
                text: `📋 *SOLICITAÇÕES PENDENTES (${requests.length})*\n\n${lines.join("\n")}\n\n_Use !aceitar tudo ou !aceitar <número> para aprovar._`,
                mentions
            }, { quoted: msg });
        }

        // ── ACEITAR TUDO ───────────────────────────────────────────────────
        if (subCmd === "tudo" || subCmd === "todos" || subCmd === "all") {
            const jids = requests.map(r => r.jid);

            await sock.sendMessage(jid, {
                text: `⏳ Aprovando *${jids.length}* solicitação(ões)...`
            }, { quoted: msg });

            try {
                await sock.groupRequestParticipantsUpdate(jid, jids, "approve");

                return sock.sendMessage(jid, {
                    text: `✅ *${jids.length}* solicitação(ões) aprovada(s) com sucesso!`
                }, { quoted: msg });
            } catch (err) {
                console.error("Erro ao aceitar todos:", err);
                return sock.sendMessage(jid, { text: "❌ Erro ao tentar aprovar as solicitações." }, { quoted: msg });
            }
        }

        // ── ACEITAR N ──────────────────────────────────────────────────────
        const quantidade = parseInt(subCmd);
        if (!isNaN(quantidade) && quantidade > 0) {
            const slice = requests.slice(0, quantidade);
            const jids = slice.map(r => r.jid);

            if (jids.length === 0) {
                return sock.sendMessage(jid, { text: "⚠️ Nenhuma solicitação encontrada para o número especificado." }, { quoted: msg });
            }

            await sock.sendMessage(jid, {
                text: `⏳ Aprovando *${jids.length}* de *${requests.length}* solicitação(ões)...`
            }, { quoted: msg });

            try {
                await sock.groupRequestParticipantsUpdate(jid, jids, "approve");

                const restante = requests.length - jids.length;
                let texto = `✅ *${jids.length}* solicitação(ões) aprovada(s)!`;
                if (restante > 0) texto += `\n⏳ Ainda restam *${restante}* solicitação(ões) pendentes.`;

                return sock.sendMessage(jid, { text: texto }, { quoted: msg });
            } catch (err) {
                console.error("Erro ao aceitar N solicitações:", err);
                return sock.sendMessage(jid, { text: "❌ Erro ao tentar aprovar as solicitações." }, { quoted: msg });
            }
        }

        // ── USO INCORRETO ──────────────────────────────────────────────────
        return sock.sendMessage(jid, {
            text: `❓ *Como usar o comando:*\n\n• \`!aceitar lista\` — Ver todas as solicitações pendentes\n• \`!aceitar tudo\` — Aprovar todas de uma vez\n• \`!aceitar 10\` — Aprovar as 10 primeiras solicitações`
        }, { quoted: msg });
    }
};
