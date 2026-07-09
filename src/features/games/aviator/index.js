import { sleep } from "../../../utils/sleep.js";
import { readJSON, writeJSON } from "../../../utils/readJSON.js";
import { formatMoney } from "../../../utils/saldo.js";

const LUCKY_DB = "database/lucky.json";
const activeGames = new Set();

function renderAviator(currentMultiplier, status, betInfo) {
    let text = "";
    
    if (status === "flying") {
        text += `🛫 *AVIATOR - VOANDO!* 🛫\n\n`;
        text += `📈 *Multiplicador:* ${currentMultiplier.toFixed(2)}x\n\n`;
    } else if (status === "crashed") {
        text += `💥 *CRASHED!* 💥\n\n`;
        text += `📉 *O avião caiu em:* ${currentMultiplier.toFixed(2)}x\n\n`;
    } else if (status === "won") {
        text += `✅ *CASH OUT SUCESSO!* ✅\n\n`;
        text += `🤑 *Retirado em:* ${currentMultiplier.toFixed(2)}x\n\n`;
    }

    text += `💰 *Apostador:* @${betInfo.sender.split('@')[0]}\n`;
    text += `💸 *Aposta:* ${formatMoney(betInfo.amount)}\n`;
    text += `🎯 *Alvo:* ${betInfo.target.toFixed(2)}x\n`;
    
    if (status === "won") {
        const prize = Math.floor(betInfo.amount * betInfo.target);
        text += `\n🎉 *LUCRO:* ${formatMoney(prize)}!`;
    } else if (status === "crashed") {
        text += `\n💀 *Você perdeu a aposta.*`;
    }

    return text.trim();
}

export async function startAviator(sock, msg, betAmount, targetMultiplier) {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;

    if (activeGames.has(sender)) {
        return sock.sendMessage(from, { text: "⚠️ Você já tem um jogo em andamento!" }, { quoted: msg });
    }

    const luckyDB = readJSON(LUCKY_DB) || {};
    if (!luckyDB[from]) luckyDB[from] = {};
    if (!luckyDB[from][sender]) luckyDB[from][sender] = { money: 0, items: {} };

    const userMoney = luckyDB[from][sender].money;

    if (userMoney < betAmount) {
        return sock.sendMessage(from, { text: `💳 Saldo insuficiente.\nSeu saldo: *${formatMoney(userMoney)} fyne coins*` }, { quoted: msg });
    }

    // Retira o valor da aposta
    luckyDB[from][sender].money -= betAmount;
    writeJSON(LUCKY_DB, luckyDB);

    const betInfo = {
        sender,
        amount: betAmount,
        target: targetMultiplier
    };

    activeGames.add(sender);

    try {
        // Gera o crash point (RTP de 95%)
        // Math.random() retorna 0 a 1.
        // Se target for muito alto, a chance é menor.
        const r = Math.random();
        let crashPoint = 1.0;
        
        // 12% de chance de dar crash imediato (1.00x) - Vantagem pesada da casa
        if (r > 0.12) {
            crashPoint = 0.80 / r; 
        }

        let current = 1.0;
        const initialText = renderAviator(current, "flying", betInfo);
        const sentMsg = await sock.sendMessage(from, { text: initialText, mentions: [sender] });

        let status = "flying";
        
        // Se crash for 1.00, já perde instantaneamente
        if (crashPoint <= 1.0) {
            status = "crashed";
            current = 1.0;
        }

        while (status === "flying") {
            await sleep(1500); // 1.5s delay
            
            // Aceleração do multiplicador
            let step = 0.1 + (current * 0.1); 
            current += step;

            // Como o multiplicador sobe em saltos maiores a cada tick,
            // precisamos verificar quem ele atingiu "primeiro" (qual era o menor)
            if (current >= targetMultiplier && targetMultiplier <= crashPoint) {
                current = targetMultiplier;
                status = "won";
            } else if (current >= crashPoint) {
                current = crashPoint;
                status = "crashed";
            }

            const frameText = renderAviator(current, status, betInfo);
            await sock.sendMessage(from, { text: frameText, edit: sentMsg.key, mentions: [sender] });
        }

        // Paga o prêmio se ganhou
        if (status === "won") {
            const db = readJSON(LUCKY_DB) || {};
            const prize = Math.floor(betAmount * targetMultiplier);
            db[from][sender].money += prize;
            writeJSON(LUCKY_DB, db);
        }

    } catch (err) {
        console.error("Erro no aviator:", err);
    } finally {
        activeGames.delete(sender);
    }
}
