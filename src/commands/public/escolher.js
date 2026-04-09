import { pendingChoices as pendingMovieChoices } from './filme.js';
import { pendingSerieChoices } from './serie.js';
import { getGroupConfig } from '../../utils/groups.js';
import fetch from 'node-fetch';

const WATCH_MOVIE_URL = 'https://maxcine.online/filme/';
const WATCH_SERIE_URL = 'https://maxcine.online/serie/';
const TMDB_API_KEY = 'edcd52275afd8b8c152c82f1ce3933a2';

let genreMap = {};

async function loadGenres() {
    if (Object.keys(genreMap).length === 0) {
        const url = `https://api.themoviedb.org/3/genre/movie/list?api_key=${TMDB_API_KEY}&language=pt-BR`;
        const res = await fetch(url);
        const data = await res.json();
        data.genres.forEach(g => genreMap[g.id] = g.name);

        const urlTv = `https://api.themoviedb.org/3/genre/tv/list?api_key=${TMDB_API_KEY}&language=pt-BR`;
        const resTv = await fetch(urlTv);
        const dataTv = await resTv.json();
        dataTv.genres.forEach(g => genreMap[g.id] = g.name);
    }
}

export default {
    name: 'escolher',
    description: 'Escolhe um filme ou série da lista gerada pelos comandos /filme ou /serie',
    showInMenu: false,
    category: "utils",
    showInMenu: false,

    async run({ sock, msg, args }) {
        const jid = msg.key.remoteJid;
        const choiceNum = parseInt(args[0], 10) - 1;
        const groupConfig = getGroupConfig(jid);
        const prefix = groupConfig?.prefix || '!';

        await loadGenres();

        let pending;
        let type;
        let watchUrl;

        if (pendingMovieChoices[jid]) {
            pending = pendingMovieChoices[jid];
            type = 'filme';
            watchUrl = WATCH_MOVIE_URL;
        } else if (pendingSerieChoices[jid]) {
            pending = pendingSerieChoices[jid];
            type = 'serie';
            watchUrl = WATCH_SERIE_URL;
        } else {
            await sock.sendMessage(jid, { text: `❌ Não há pesquisa pendente. Use ${prefix}filme ou ${prefix}serie antes.` }, { quoted: msg });
            return;
        }

        const results = pending.results;

        if (isNaN(choiceNum) || choiceNum < 0 || choiceNum >= results.length) {
            await sock.sendMessage(jid, { text: '❌ Número inválido. Escolha um dos listados.' }, { quoted: msg });
            return;
        }

        const item = results[choiceNum];
        const genreNames = item.genre_ids?.map(id => genreMap[id]).filter(Boolean).join(', ') || 'Indisponível';

        const metadata = {
            title: type === 'filme' ? item.title : item.name,
            year: type === 'filme' ? item.release_date?.split('-')[0] : item.first_air_date?.split('-')[0] || '—',
            overview: item.overview || 'Sem descrição',
            genres: genreNames,
        };

        const imageUrl = item.backdrop_path 
            ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}` 
            : `https://image.tmdb.org/t/p/w500${item.poster_path}`;

        const tmdbId = item.id;
        const videoUrl = `${watchUrl}${tmdbId}`;

        const caption =
`═════ ❖ *MAXCINE* ❖ ═════
> Título: ${metadata.title || 'Indisponível'}

> Ano: ${metadata.year || '—'}

> Gêneros: ${metadata.genres}

> Sinopse: ${metadata.overview}

> ASSISTA AGORA: ${videoUrl}

*Oferecido por Maxcine - By @joaotankz*
═════ *By: @joaotankz* ═════`;

        await sock.sendMessage(jid, { image: { url: imageUrl }, caption }, { quoted: msg });

        if (type === 'filme') delete pendingMovieChoices[jid];
        else delete pendingSerieChoices[jid];
    }
};
