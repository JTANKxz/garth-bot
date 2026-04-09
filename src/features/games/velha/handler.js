import { handleTicTacToe } from './index.js'

export async function ticTacToeListener(sock, message, text) {
    await handleTicTacToe(sock, message, text)
}
