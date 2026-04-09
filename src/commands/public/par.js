import { loadDatabase } from '../../features/marriage.js'

export default {
    name: 'par',
    description: 'Mostra com quem você é casado e há quanto tempo (horário de Brasília)',
    category: "fun",

    async run({ sock, msg }) {
        const from = msg.key.remoteJid
        const sender = msg.key.participant || from
        const db = loadDatabase()
        const groupDb = db[from] || {}

        function parseBrDate(str) {
            const [data, hora] = str.split(', ')
            const [dia, mes, ano] = data.split('/')
            return new Date(`${ano}-${mes}-${dia}T${hora}`)
        }

        const casamento = Object.values(groupDb).find(c => c.requester === sender || c.target === sender)

        if (!casamento) {
            const frasesSolteiro = [
                '💔 KKKK VOCÊ É SOZINHO(A) DESISTE MANO KKK ISSO NÃO É PRA TI! 💫',
                '😢 Nenhum par encontrado... é um inútil mesmo kkk.',
                '😂🫵 Não me faça rir hahaha quem vai querer você? KKKKKKK',
                'QUA QUA QUA QUAAAAAaaa kkk💔',
                '💔 Sinto em te informar, mas você está sozinho como sempre, largado e desprezado. Por isso que toda vez que você usa esse comando par, aparece esse coração quebrado, porque você é descartável, só te usam pra provar o quanto você é um fracassado e inútil.',
                '🥀 Ninguém deu “sim” pra você ainda... otário hahaha',
                '👀 Você está solteiro(a)... mas quem sabe alguém aqui te nota depois desse comando?\nPOR PENA!!! HAHAHA',
                '🌹 Solteiro(a), mas com estilo! Só que sem o estilo. eu sou o milior.',
                '🚶‍♂️ Casamento? Nunca nem vi.',
                '💞 Ainda não casou, mas o amor pode estar mais perto do que imagina... ou não, é, claramente não.'
            ]

            const mensagemSolteiro = frasesSolteiro[Math.floor(Math.random() * frasesSolteiro.length)]
            await sock.sendMessage(from, { text: mensagemSolteiro }, { quoted: msg })
            return
        }

        const par = casamento.requester === sender ? casamento.target : casamento.requester

        const agora = new Date()
        const casamentoDate = parseBrDate(casamento.timestamp) 
        const diffMs = agora - casamentoDate

        const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24))
        const horas = Math.floor((diffMs / (1000 * 60 * 60)) % 24)
        const minutos = Math.floor((diffMs / (1000 * 60)) % 60)
        const segundos = Math.floor((diffMs / 1000) % 60)

        const frasesCasado = [
            `💖 O amor está no ar! Você e @${par.split('@')[0]} estão juntos há ${dias}d ${horas}h ${minutos}m ${segundos}s!`,
            `💍 @${par.split('@')[0]} e você formam o casal mais fofo do grupo! Casados há ${dias} dias 🥰`,
            `❤️ Desde ${casamento.timestamp}, o coração de @${par.split('@')[0]} bate junto com o seu!`,
            `💕 Você e @${par.split('@')[0]} vivem um amor eterno, já são ${dias} dias de parceria!`,
            `💘 Você e @${par.split('@')[0]} se uniram em ${casamento.timestamp} e continuam firmes e fortes!`,
            `🥂 Brindem ao amor! Você e @${par.split('@')[0]} estão juntos há ${dias} dias e contando!`,
            `💫 O destino uniu você e @${par.split('@')[0]} — e o tempo só fortalece esse laço!`,
            `💞 Casalzinho detectado! @${par.split('@')[0]} e você estão juntinhos há ${dias} dias 💋`,
            `💐 Desde ${casamento.timestamp}, você e @${par.split('@')[0]} são a prova viva de que o amor resiste a tudo 💝`,
            `🔥 Amor em alta! Você e @${par.split('@')[0]} estão oficialmente pegando fogo há ${dias} dias 😍`
        ]

        const mensagemCasado = frasesCasado[Math.floor(Math.random() * frasesCasado.length)]
        await sock.sendMessage(from, {
            text: mensagemCasado,
            mentions: [par]
        }, { quoted: msg })
    }
}
