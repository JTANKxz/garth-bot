import { getBotConfig } from "../../config/botConfig.js";

export default {
    name: "entrargp",
    aliases: ["joingp", "entrargrupo"],
    description: "Faz o bot entrar em um grupo via link ou código de convite",
    category: "creator",

    async run({ sock, msg, args }) {
        const sender = msg.key.participant || msg.key.remoteJid;
        const from = msg.key.remoteJid;
        const botConfig = getBotConfig();

        if (sender !== botConfig.botCreator) {
            return sock.sendMessage(from, { text: "❌ Comando restrito ao criador." }, { quoted: msg });
        }

        const input = args[0];

        if (!input) {
            return sock.sendMessage(from, {
                text: `❌ Uso correto: \`!entrargp [link ou código]\`\n\nExemplos:\n• \`!entrargp https://chat.whatsapp.com/ABC123\`\n• \`!entrargp ABC123\``
            }, { quoted: msg });
        }

        // Extrai apenas o código, seja do link completo ou só o código
        let code = input.trim();
        if (code.includes("chat.whatsapp.com/")) {
            code = code.split("chat.whatsapp.com/").pop().trim();
        }
        // Remove parâmetros de URL se houver (ex: ?utm_source=...)
        if (code.includes("?")) {
            code = code.split("?")[0];
        }

        if (!code || code.length < 5) {
            return sock.sendMessage(from, { text: "❌ Código de convite inválido." }, { quoted: msg });
        }

        try {
            // Tenta buscar info do grupo antes de entrar
            let groupInfo;
            try {
                groupInfo = await sock.groupGetInviteInfo(code);
            } catch {
                groupInfo = null;
            }

            if (groupInfo) {
                await sock.sendMessage(from, {
                    text: `🔍 *Grupo encontrado!*\n\n📛 *Nome:* ${groupInfo.subject || "Desconhecido"}\n👥 *Participantes:* ${groupInfo.size || "?"}\n\n⏳ Entrando...`
                }, { quoted: msg });
            } else {
                await sock.sendMessage(from, {
                    text: `⏳ Entrando no grupo com o código \`${code}\`...`
                }, { quoted: msg });
            }

            const response = await sock.groupAcceptInvite(code);

            await sock.sendMessage(from, {
                text: `✅ *Bot entrou no grupo com sucesso!*\n📋 *ID do grupo:* ${response}`
            }, { quoted: msg });

        } catch (err) {
            console.error("Erro no comando entrargp:", err);

            let errMsg = "❌ Não foi possível entrar no grupo.";

            if (err.message?.includes("not-authorized") || err.output?.statusCode === 401) {
                errMsg = "❌ Código inválido ou convite expirado.";
            } else if (err.message?.includes("already-exists")) {
                errMsg = "⚠️ O bot já está nesse grupo!";
            } else if (err.message?.includes("not-found")) {
                errMsg = "❌ Grupo não encontrado. Verifique o link/código.";
            }

            await sock.sendMessage(from, { text: errMsg }, { quoted: msg });
        }
    }
};
