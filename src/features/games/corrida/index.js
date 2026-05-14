import { sleep } from "../../../utils/sleep.js";
import { readJSON, writeJSON } from "../../../utils/readJSON.js";
import { formatMoney } from "../../../utils/saldo.js";

const LUCKY_DB = "database/lucky.json";
const activeRaces = new Set();

const ANIMALS = ["🐎", "🐎", "🐎", "🐎"];
const TRACK_LENGTH = 20;

function renderTrack(positions, isFinished = false, betInfo = null) {
    let text = isFinished ? "🏆 *CORRIDA FINALIZADA* 🏆\n\n" : "🚥 *CORRIDA EM ANDAMENTO* 🚥\n\n";

    if (betInfo) {
        text += `💰 *Apostador:* @${betInfo.sender.split('@')[0]}\n`;
        text += `🏇 *Cavalo Escolhido:* ${betInfo.horse}\n`;
        text += `💸 *Aposta:* ${formatMoney(betInfo.amount)}\n\n`;
    }

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

export async function startRace(sock, msg, args = []) {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    
    if (activeRaces.has(from)) {
        return sock.sendMessage(from, { text: "⚠️ Já existe uma corrida acontecendo neste grupo! Espere terminar." }, { quoted: msg });
    }

    let betAmount = 0;
    let chosenHorse = 0;
    let betInfo = null;

    // !corrida [aposta] [cavalo 1-4]
    if (args[0] && args[1]) {
        betAmount = parseInt(args[0]);
        chosenHorse = parseInt(args[1]);

        if (isNaN(betAmount) || betAmount <= 0) {
            return sock.sendMessage(from, { text: "❌ Valor de aposta inválido.\nUso: `!corrida [valor] [cavalo de 1 a 4]`\nEx: `!corrida 1000 2`" }, { quoted: msg });
        }

        if (isNaN(chosenHorse) || chosenHorse < 1 || chosenHorse > 4) {
            return sock.sendMessage(from, { text: "❌ Cavalo inválido. Escolha um cavalo de 1 a 4.\nEx: `!corrida 1000 2`" }, { quoted: msg });
        }

        const luckyDB = readJSON(LUCKY_DB) || {};
        if (!luckyDB[from]) luckyDB[from] = {};
        if (!luckyDB[from][sender]) luckyDB[from][sender] = { money: 0, items: {} };

        const userMoney = luckyDB[from][sender].money;

        if (userMoney < betAmount) {
            return sock.sendMessage(from, { text: `💳 Saldo insuficiente.\nSeu saldo: *${formatMoney(userMoney)} fyne coins*` }, { quoted: msg });
        }

        // Cobra a aposta
        luckyDB[from][sender].money -= betAmount;
        writeJSON(LUCKY_DB, luckyDB);

        betInfo = {
            sender,
            amount: betAmount,
            horse: chosenHorse
        };
    } else if (args[0]) {
        // Digitou aposta mas esqueceu o cavalo
        return sock.sendMessage(from, { text: "❌ Faltou escolher o cavalo!\nUso: `!corrida [valor] [cavalo de 1 a 4]`\nEx: `!corrida 500 3`" }, { quoted: msg });
    }

    activeRaces.add(from);

    try {
        let positions = [0, 0, 0, 0];
        
        const initialText = renderTrack(positions, false, betInfo);
        const sentMsg = await sock.sendMessage(from, { text: initialText, mentions: betInfo ? [sender] : [] });
        
        let winner = -1;
        let iters = 0;

        while (winner === -1 && iters < 30) {
            await sleep(1500); // 1.5s por frame
            
            let currentWinners = [];

            // Embaralha a ordem de processamento para garantir imparcialidade total
            const indices = [0, 1, 2, 3].sort(() => Math.random() - 0.5);

            for (const i of indices) {
                // Movimento variado: 0 (tropeço), 1, 2, 3 ou 4 casas
                const moveChance = Math.random();
                let move = 0;
                
                if (moveChance > 0.9) move = 4;
                else if (moveChance > 0.6) move = 3;
                else if (moveChance > 0.3) move = 2;
                else if (moveChance > 0.1) move = 1;

                positions[i] += move;
                
                if (positions[i] >= TRACK_LENGTH) {
                    positions[i] = TRACK_LENGTH;
                    currentWinners.push(i);
                }
            }

            if (currentWinners.length > 0) {
                winner = currentWinners[Math.floor(Math.random() * currentWinners.length)];
            }

            const isFinished = winner !== -1;
            let finalMsg = renderTrack(positions, isFinished, betInfo);
            
            if (isFinished) {
                finalMsg += `\n\n🎉 O cavalo vencedor foi o Número ${winner + 1}!`;

                if (betInfo) {
                    if (winner + 1 === betInfo.horse) {
                        const prize = betInfo.amount * 3;
                        const luckyDB = readJSON(LUCKY_DB) || {};
                        luckyDB[from][sender].money += prize;
                        writeJSON(LUCKY_DB, luckyDB);
                        finalMsg += `\n\n🎯 *PARABÉNS!* Seu cavalo ganhou!\nVocê faturou *${formatMoney(prize)} fyne coins*! 🤑`;
                    } else {
                        finalMsg += `\n\n💥 Que pena... O seu cavalo perdeu e você perdeu as *${formatMoney(betInfo.amount)} moedas*.`;
                    }
                }
            }

            await sock.sendMessage(from, { text: finalMsg, edit: sentMsg.key, mentions: betInfo ? [sender] : [] });
            
            iters++;
        }
        
        if (winner === -1) {
            await sock.sendMessage(from, { text: renderTrack(positions, true, betInfo) + "\n\n😴 A corrida foi cancelada por cansaço dos cavalos.", edit: sentMsg.key, mentions: betInfo ? [sender] : [] });
            
            // Devolve o dinheiro
            if (betInfo) {
                const luckyDB = readJSON(LUCKY_DB) || {};
                luckyDB[from][sender].money += betInfo.amount;
                writeJSON(LUCKY_DB, luckyDB);
            }
        }

    } catch (err) {
        console.error("Erro na corrida:", err);
    } finally {
        activeRaces.delete(from);
    }
}
