import { generateBoard, renderBoard } from "./board.js"
import { getGroupConfig } from "../../../utils/groups.js"

// Jogos ativos por usuário
const activeGames = {}

export async function startMinesweeper(sock, msg) {
    const jid = msg.key.remoteJid
    const groupConfig = getGroupConfig(jid)
    const prefix = groupConfig.prefix || "!"
    const player = msg.key.participant || msg.key.remoteJid

    // Impede dois jogos ao mesmo tempo
    if (activeGames[player]) {
        return sock.sendMessage(jid, {
            text: "⚠️ Você já tem um jogo de Campo Minado ativo!"
        }, { quoted: msg })
    }

    const board = generateBoard(5, 5)

    activeGames[player] = {
        board,
        startedAt: Date.now()
    }

    const boardText = renderBoard(board)

    await sock.sendMessage(jid, {
        text:
            `${boardText}

📌 *Como jogar*
• Use: abrir linha coluna
• Exemplo: abrir 2 3
• Se abrir 💣 = perdeu 😈`,
    }, { quoted: msg })
}

// Exporta para usar depois
export function getGame(player) {
    return activeGames[player]
}

export function endGame(player) {
    delete activeGames[player]
}
