import { sleep } from "../../../utils/sleep.js";

const activeRaces = new Set();

const ANIMALS = ["🐎", "🐪", "🐄", "🐖"];
const TRACK_LENGTH = 12;

function renderTrack(positions, isFinished = false) {
    let text = isFinished ? "🏆 *CORRIDA FINALIZADA* 🏆\n\n" : "🚥 *CORRIDA EM ANDAMENTO* 🚥\n\n";

    for (let i = 0; i < ANIMALS.length; i++) {
        const animal = ANIMALS[i];
        const pos = positions[i];
        
        let track = "";
        for (let j = 0; j <= TRACK_LENGTH; j++) {
            if (j === pos) {
                track += animal;
            } else if (j === TRACK_LENGTH) {
                track += "🏁";
            } else {
                track += "➖"; 
            }
        }
        
        text += `${i + 1}️⃣ ${track}\n\n`;
    }

    return text.trim();
}

export async function startRace(sock, msg) {
    const from = msg.key.remoteJid;
    
    if (activeRaces.has(from)) {
        return sock.sendMessage(from, { text: "⚠️ Já existe uma corrida acontecendo neste grupo! Espere terminar." }, { quoted: msg });
    }

    activeRaces.add(from);

    try {
        let positions = [0, 0, 0, 0];
        
        const initialText = renderTrack(positions);
        const sentMsg = await sock.sendMessage(from, { text: initialText });
        
        let winner = -1;
        let iters = 0;

        while (winner === -1 && iters < 20) {
            await sleep(1500); // 1.5s por frame para não tomar bloqueio do WhatsApp
            
            let currentWinners = [];

            for (let i = 0; i < ANIMALS.length; i++) {
                const move = Math.floor(Math.random() * 3) + 1; // 1 a 3 casas
                positions[i] += move;
                
                if (positions[i] >= TRACK_LENGTH) {
                    positions[i] = TRACK_LENGTH;
                }

                if (positions[i] === TRACK_LENGTH) {
                    currentWinners.push(i);
                }
            }

            if (currentWinners.length > 0) {
                // Em caso de empate na mesma rodada, sorteia entre os que chegaram juntos
                winner = currentWinners[Math.floor(Math.random() * currentWinners.length)];
            }

            const isFinished = winner !== -1;
            const updatedText = renderTrack(positions, isFinished) + (isFinished ? `\n\n🎉 O grande vencedor foi o ${ANIMALS[winner]} (Competidor ${winner + 1})!` : "");

            await sock.sendMessage(from, { text: updatedText, edit: sentMsg.key });
            
            iters++;
        }
        
        if (winner === -1) {
            await sock.sendMessage(from, { text: renderTrack(positions, true) + "\n\n😴 A corrida foi cancelada por cansaço dos animais.", edit: sentMsg.key });
        }

    } catch (err) {
        console.error("Erro na corrida:", err);
    } finally {
        activeRaces.delete(from);
    }
}
