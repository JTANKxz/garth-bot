import fetch from 'node-fetch';
import { getGroupConfig } from '../../utils/groups.js';

const TMDB_API_KEY = 'edcd52275afd8b8c152c82f1ce3933a2';
export const pendingChoices = {}; 

export default {
    name: 'filme',
    description: 'Busca filmes no catálogo TMDB 🎬',
    category: "utils",

    async run({ sock, msg, args }) {
        const jid = msg.key.remoteJid;
        const query = args.join(' ').trim();
        const groupConfig = getGroupConfig(jid);
        const prefix = groupConfig?.prefix || '!';

        if (!query) {
            await sock.sendMessage(jid, { text: `❌ Use: *${prefix}filme [nome do filme]*` }, { quoted: msg });
            return;
        }

        const url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&language=pt-BR&query=${encodeURIComponent(query)}`;

        try {
            const res = await fetch(url);
            const data = await res.json();

            if (!data.results || data.results.length === 0) {
                await sock.sendMessage(jid, { text: '😕 Nenhum filme encontrado com esse nome.' }, { quoted: msg });
                return;
            }

            // Pega os 5 melhores resultados
            const results = data.results.slice(0, 5);
            pendingChoices[jid] = { results };

            let textList = '🎬 *RESULTADOS DA BUSCA*\n\n';
            
            results.forEach((m, i) => {
                const year = m.release_date?.split('-')[0] || '—';
                const rating = m.vote_average ? `⭐ ${m.vote_average.toFixed(1)}` : '⭐ ?';
                const title = m.title || 'Título indisponível';
                
                textList += `*${i + 1}.* ${title} (${year})\n`;
                textList += `> ${rating} | 📝 _${m.overview ? m.overview.slice(0, 60) + '...' : 'Sem sinopse.'}_\n\n`;
            });

            textList += `\n✏️ Para ver detalhes, digite: \`${prefix}escolher [número]\`\n_Exemplo: ${prefix}escolher 1_`;

            await sock.sendMessage(jid, { text: textList }, { quoted: msg });

        } catch (err) {
            console.error('Erro no comando filme:', err);
            await sock.sendMessage(jid, { text: '❌ Erro ao conectar com o serviço de filmes. Tente novamente mais tarde.' }, { quoted: msg });
        }
    }
};
