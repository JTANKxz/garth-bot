import { getGame, endGame } from "./index.js"
import { renderBoard } from "./board.js"

export async function minesweeperListener(sock, msg, text) {
    const jid = msg.key.remoteJid
    const player = msg.key.participant || msg.key.remoteJid

    const game = getGame(player)
    if (!game) return false // não tem jogo ativo

    const args = text.trim().split(/\s+/)

    if (args[0] !== "abrir") return false

    const x = parseInt(args[1]) - 1
    const y = parseInt(args[2]) - 1

    if (isNaN(x) || isNaN(y)) {
        await sock.sendMessage(jid, {
            text: "❌ Use: abrir linha coluna\nEx: abrir 2 3"
        }, { quoted: msg })
        return true
    }

    const board = game.board
    const cell = board[y]?.[x]

    if (!cell) {
        await sock.sendMessage(jid, {
            text: "❌ Posição inválida."
        }, { quoted: msg })
        return true
    }

    if (cell.revealed) {
        await sock.sendMessage(jid, {
            text: "⚠️ Essa posição já foi aberta."
        }, { quoted: msg })
        return true
    }

    cell.revealed = true

    // 💣 PERDEU
    if (cell.bomb) {
        const finalBoard = renderBoard(board, true)
        endGame(player)

        await sock.sendMessage(jid, {
            text: `💥 *BOOM!* Você perdeu 😈\n\n${finalBoard}`
        }, { quoted: msg })

        return true
    }

    // Continua jogo
    const boardText = renderBoard(board)

    await sock.sendMessage(jid, {
        text: boardText
    }, { quoted: msg })

    return true
}
