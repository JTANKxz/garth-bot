import { getBotConfig } from "../../config/botConfig.js";
import { addNewWord, normalize } from "../../features/games/termo/words.js";

export default {
    name: "addtermo",
    aliases: ["addpalavra"],
    description: "Adiciona uma nova palavra manualmente ao dicionário do Termo",
    category: "creator",
    
    async run({ sock, msg, args }) {
        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        const botConfig = getBotConfig();
        
        if (sender !== botConfig.botCreator) {
            return sock.sendMessage(from, { text: "❌ Apenas o Criador do bot pode adicionar palavras." }, { quoted: msg });
        }

        if (!args[0]) {
            return sock.sendMessage(from, { text: "❌ Use: !addtermo <palavra de 5 letras>" }, { quoted: msg });
        }

        const palavra = normalize(args[0]);

        if (palavra.length !== 5 || !/^[A-Z]{5}$/.test(palavra)) {
            return sock.sendMessage(from, { text: "❌ A palavra deve ter exatamente 5 letras (sem números ou caracteres especiais)." }, { quoted: msg });
        }

        const success = addNewWord(palavra);

        if (success) {
            await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });
            return sock.sendMessage(from, { text: `✅ A palavra *${palavra}* foi adicionada com sucesso ao banco do Termo e já pode ser jogada ou sorteada!` }, { quoted: msg });
        } else {
            await sock.sendMessage(from, { react: { text: "❌", key: msg.key } });
            return sock.sendMessage(from, { text: "❌ Ocorreu um erro ao salvar a palavra no dicionário." }, { quoted: msg });
        }
    }
};
