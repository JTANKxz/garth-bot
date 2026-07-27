import { readJSON, writeJSON } from "../../../utils/readJSON.js";
import { formatMoney } from "../../../utils/saldo.js";
import { getGroupConfig } from "../../../utils/groups.js";
import { isRpgEnabled } from "../../../utils/rpg.js";

const LUCKY_DB = "database/lucky.json";
export const games = {}  // { [groupJid]: { challenger, opponent, board, turn, status, bet } }

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
export async function createChallenge(sock, msg, args = []) {
    const from = msg.key.remoteJid
    const sender = msg.key.participant || from
    const mention = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

    if (!from.endsWith('@g.us'))
        return sock.sendMessage(from, { text: '⚠️ Use este comando em um grupo.' }, { quoted: msg })

    if (!mention)
        return sock.sendMessage(from, { text: '📌 Use jgvelha @user' }, { quoted: msg })

    if (games[from])
        return sock.sendMessage(from, { text: '🎮 Já existe um jogo em andamento neste grupo.' }, { quoted: msg })

    const rpgEnabled = isRpgEnabled(getGroupConfig(from));
    let bet = 0;
    if (rpgEnabled && args[1] && !isNaN(parseInt(args[1]))) {
        bet = parseInt(args[1]);
        if (bet < 0) bet = 0;
    }

    if (bet > 0) {
        const luckyDB = readJSON(LUCKY_DB) || {};
        const groupDb = luckyDB[from] || {};
        const challengerMoney = groupDb[sender]?.money || 0;
        const opponentMoney = groupDb[mention]?.money || 0;

        if (challengerMoney < bet) {
            return sock.sendMessage(from, { text: `❌ Você não tem ${formatMoney(bet)} para apostar.` }, { quoted: msg });
        }
        if (opponentMoney < bet) {
            return sock.sendMessage(from, { text: `❌ O oponente @${mention.split('@')[0]} não tem ${formatMoney(bet)} para cobrir a aposta.` }, { quoted: msg });
        }
    }

    games[from] = {
        challenger: sender,
        opponent: mention,
        board: Array(9).fill(null),
        turn: sender,
        status: 'waiting',
        bet
    }

    let apostaText = bet > 0 ? `\n💰 *Aposta:* ${formatMoney(bet)}\n_(O valor será descontado de ambos se o oponente aceitar)_` : "";

    await sock.sendMessage(from, {
        text: `🎮 @${sender.split('@')[0]} desafiou @${mention.split('@')[0]} para um jogo da velha!${apostaText}\n\nDigite:\n1️⃣ para *Aceitar*\n2️⃣ para *Recusar*`,
        mentions: [sender, mention]
    }, { quoted: msg })
}

/** Processa jogadas e respostas */
export async function handleTicTacToe(sock, msg, text) {
    const from = msg.key.remoteJid
    const sender = msg.key.participant || from
    const g = games[from]
    if (!g) return false

    if (!isRpgEnabled(getGroupConfig(from))) g.bet = 0

    const body = text.trim()

    // Aceitar / Recusar
    if (g.status === 'waiting' && ['1', '2'].includes(body) && sender === g.opponent) {
        if (body === '1') {
            g.status = 'playing'
            
            // Cobra a aposta se houver
            if (g.bet > 0) {
                const luckyDB = readJSON(LUCKY_DB) || {};
                if (!luckyDB[from]) luckyDB[from] = {};
                if (!luckyDB[from][g.challenger]) luckyDB[from][g.challenger] = { money: 0, items: {} };
                if (!luckyDB[from][g.opponent]) luckyDB[from][g.opponent] = { money: 0, items: {} };

                const challengerMoney = luckyDB[from][g.challenger].money;
                const opponentMoney = luckyDB[from][g.opponent].money;

                if (challengerMoney < g.bet || opponentMoney < g.bet) {
                    delete games[from];
                    return sock.sendMessage(from, { text: `❌ Aposta cancelada! Alguém gastou o dinheiro antes de aceitar.` }, { quoted: msg });
                }

                luckyDB[from][g.challenger].money -= g.bet;
                luckyDB[from][g.opponent].money -= g.bet;
                writeJSON(LUCKY_DB, luckyDB);
            }

            let betText = g.bet > 0 ? `\n💰 *Aposta cobrada:* ${formatMoney(g.bet)} de cada.` : "";

            await sock.sendMessage(from, {
                text: `✅ @${g.opponent.split('@')[0]} aceitou!${betText}\n${renderBoard(g.board)}\n🎯 Vez de @${g.turn.split('@')[0]} (❌)`,
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
            let winText = `🏆 Vitória de @${sender.split('@')[0]}!\n${renderBoard(g.board)}`;
            
            // Paga recompensa
            if (g.bet > 0) {
                const prize = g.bet * 2;
                const luckyDB = readJSON(LUCKY_DB) || {};
                luckyDB[from][sender].money += prize;
                writeJSON(LUCKY_DB, luckyDB);
                winText += `\n\n💰 *Prêmio:* ${formatMoney(prize)}`;
            }

            await sock.sendMessage(from, {
                text: winText,
                mentions: [g.challenger, g.opponent]
            })
            delete games[from]
            return true
        }

        if (g.board.every(Boolean)) {
            let drawText = `🤝 Empate!\n${renderBoard(g.board)}`;

            // Devolve o dinheiro
            if (g.bet > 0) {
                const luckyDB = readJSON(LUCKY_DB) || {};
                luckyDB[from][g.challenger].money += g.bet;
                luckyDB[from][g.opponent].money += g.bet;
                writeJSON(LUCKY_DB, luckyDB);
                drawText += `\n\n💰 *O valor apostado foi devolvido a ambos.*`;
            }

            await sock.sendMessage(from, {
                text: drawText,
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
