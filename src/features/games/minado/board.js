export function generateBoard(size = 5, bombs = 5) {
    const board = Array.from({ length: size }, () =>
        Array.from({ length: size }, () => ({
            bomb: false,
            revealed: false,
            count: 0
        }))
    )

    // Coloca bombas
    let placed = 0
    while (placed < bombs) {
        const x = Math.floor(Math.random() * size)
        const y = Math.floor(Math.random() * size)

        if (!board[y][x].bomb) {
            board[y][x].bomb = true
            placed++
        }
    }

    // Calcula números
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            if (board[y][x].bomb) continue

            let count = 0
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const ny = y + dy
                    const nx = x + dx
                    if (board[ny]?.[nx]?.bomb) count++
                }
            }
            board[y][x].count = count
        }
    }

    return board
}

export function renderBoard(board, revealAll = false) {
    const size = board.length
    let text = "🧨 *CAMPO MINADO*\n\n"

    // Legenda superior
    text += "         "
    for (let i = 1; i <= size; i++) {
        text += `${i}️⃣ `
    }
    text += "\n"

    // Tabuleiro com legenda lateral
    for (let y = 0; y < size; y++) {
        text += `${y + 1}️⃣ | `

        for (let x = 0; x < size; x++) {
            const cell = board[y][x]

            if (revealAll || cell.revealed) {
                if (cell.bomb) text += "💣 "
                else if (cell.count === 0) text += "▫️ "
                else text += `${cell.count}️⃣ `
            } else {
                text += "⬜ "
            }
        }

        text += "\n"
    }

    text += "\n📍 Use: *abrir linha coluna*\nEx: `abrir 2 3`"

    return text
}

