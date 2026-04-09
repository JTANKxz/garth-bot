export const games = {}  // { [groupJid]: { challenger, opponent, board, turn, status } }

/** Renderiza o tabuleiro com bordas e números/ícones */
function renderBoard(board) {
    const s = board.map((c, i) =>
        c
            ? c
            : `${i + 1}` // número simples, vamos converter para emoji abaixo
    )

    const emoji = n => ({
        '1': '1️⃣', '2': '2️⃣', '3': '3️⃣',
        '4': '4️⃣', '5': '5️⃣', '6': '6️⃣',
        '7': '7️⃣', '8': '8️⃣', '9': '9️⃣'
    }[n] || n)

    // Monta linhas com bordas
    return `
╭───┬───┬───╮
│ ${emoji(s[0])} │ ${emoji(s[1])} │ ${emoji(s[2])}  │
├───┼───┼───┤
│ ${emoji(s[3])} │ ${emoji(s[4])} │ ${emoji(s[5])}  │
├───┼───┼───┤
│ ${emoji(s[6])} │ ${emoji(s[7])} │ ${emoji(s[8])}  │
╰───┴───┴───╯`
}

/** Verifica se há vencedor */
function checkWin(b) {
    const c = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ]
    return c.some(([a, b2, c2]) => b[a] && b[a] === b[b2] && b[a] === b[c2])
}

/** Cria o desafio */
export async function createChallenge(sock, msg) {
    const from = msg.key.remoteJid
    const sender = msg.key.participant || from
    const mention = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

    if (!from.endsWith('@g.us'))
        return sock.sendMessage(from, { text: '⚠️ Use este comando em um grupo.' }, { quoted: msg })

    if (!mention)
        return sock.sendMessage(from, { text: '📌 Use jgvelha @user' }, { quoted: msg })

    if (games[from])
        return sock.sendMessage(from, { text: '🎮 Já existe um jogo em andamento neste grupo.' }, { quoted: msg })

    games[from] = {
        challenger: sender,
        opponent: mention,
        board: Array(9).fill(null),
        turn: sender,
        status: 'waiting'
    }

    await sock.sendMessage(from, {
        text: `🎮 @${sender.split('@')[0]} desafiou @${mention.split('@')[0]} para um jogo da velha!\n\nDigite:\n1️⃣ para *Aceitar*\n2️⃣ para *Recusar*`,
        mentions: [sender, mention]
    }, { quoted: msg })
}

/** Processa jogadas e respostas */
export async function handleTicTacToe(sock, msg, text) {
    const from = msg.key.remoteJid
    const sender = msg.key.participant || from
    const g = games[from]
    if (!g) return false

    const body = text.trim()

    // Aceitar / Recusar
    if (g.status === 'waiting' && ['1', '2'].includes(body) && sender === g.opponent) {
        if (body === '1') {
            g.status = 'playing'
            await sock.sendMessage(from, {
                text: `✅ @${g.opponent.split('@')[0]} aceitou!\n${renderBoard(g.board)}\n🎯 Vez de @${g.turn.split('@')[0]} (❌)`,
                mentions: [g.challenger, g.opponent]
            })
        } else {
            delete games[from]
            await sock.sendMessage(from, {
                text: `❌ @${g.opponent.split('@')[0]} recusou o desafio.`,
                mentions: [g.opponent, g.challenger]
            })
        }
        return true
    }

    // Jogadas
    if (g.status === 'playing' && sender === g.turn && /^[1-9]$/.test(body)) {
        const pos = parseInt(body) - 1
        if (g.board[pos]) {
            await sock.sendMessage(from, { text: '⚠️ Essa posição já está ocupada.' })
            return true
        }

        const mark = sender === g.challenger ? '❌' : '⭕'
        g.board[pos] = mark

        if (checkWin(g.board)) {
            await sock.sendMessage(from, {
                text: `🏆 Vitória de @${sender.split('@')[0]}!\n${renderBoard(g.board)}`,
                mentions: [g.challenger, g.opponent]
            })
            delete games[from]
            return true
        }

        if (g.board.every(Boolean)) {
            await sock.sendMessage(from, {
                text: `🤝 Empate!\n${renderBoard(g.board)}`,
                mentions: [g.challenger, g.opponent]
            })
            delete games[from]
            return true
        }

        // Próximo turno
        g.turn = g.turn === g.challenger ? g.opponent : g.challenger
        await sock.sendMessage(from, {
            text: `${renderBoard(g.board)}\n🎯 Vez de @${g.turn.split('@')[0]} (${g.turn === g.challenger ? '❌' : '⭕'})`,
            mentions: [g.challenger, g.opponent]
        })
        return true
    }

    return false
}
