import fetch from 'node-fetch';
import { getGroupConfig } from '../../utils/groups.js';
export const pendingSerieChoices = {}; 
const TMDB_API_KEY = 'edcd52275afd8b8c152c82f1ce3933a2';

export default {
    name: 'serie',
    description: 'Busca séries',
    category: "utils",

    async run({ sock, msg, args }) {
        const jid = msg.key.remoteJid;
        const query = args.join(' ').trim();
        const groupConfig = getGroupConfig(jid);
        const prefix = groupConfig?.prefix || '!';

        if (!query) {
            await sock.sendMessage(jid, { text: `❌ Use: ${prefix}serie [nome da série]` }, { quoted: msg });
            return;
        }

        const url = `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&language=pt-BR&query=${encodeURIComponent(query)}`;

        try {
            const res = await fetch(url);
            const data = await res.json();

            if (!data.results || data.results.length === 0) {
                await sock.sendMessage(jid, { text: '😕 Nenhuma série encontrada.' }, { quoted: msg });
                return;
            }

            const results = data.results.slice(0, 10);
            pendingSerieChoices[jid] = { results };

            let textList = '📺 *Resultados encontrados*:\n\n';
            results.forEach((s, i) => {
                const year = s.first_air_date?.split('-')[0] || '—';
                const name = s.name || 'Nome indisponível';
                textList += `*${i + 1}.* ${name} (${year})\n`;
            });

            textList += `\n✏️ Para escolher uma série, digite: \`${prefix}escolher [número]\`\nExemplo: \`${prefix}escolher 2\`\n\n✨ *Oferecido por Maxcine By @joaotankz*`;

            await sock.sendMessage(jid, { text: textList }, { quoted: msg });

        } catch (err) {
            console.error(err);
            await sock.sendMessage(jid, { text: '❌ Ocorreu um erro ao buscar a série.' }, { quoted: msg });
        }
    }
};
