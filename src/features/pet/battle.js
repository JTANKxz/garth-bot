// src/features/pet/battle.js
export function simulatePetBattle(petA, petB, ownerAName, ownerBName) {
    const rounds = [];
    
    let hpA = 100 + (petA.level || 1) * 10;
    let hpB = 100 + (petB.level || 1) * 10;
    
    let turn = Math.random() < 0.5 ? "A" : "B"; 
    let roundNum = 1;

    rounds.push(`🐾 *${petA.name}* (HP: ${hpA}) vs 🐾 *${petB.name}* (HP: ${hpB})`);

    while (hpA > 0 && hpB > 0 && roundNum <= 10) {
        let log = `*Turno ${roundNum}:* `;
        
        const attacker = turn === "A" ? petA : petB;
        const defender = turn === "A" ? petB : petA;
        const attackerName = attacker.name;
        const defenderName = defender.name;
        
        const str = attacker.stats.strength || 1;
        const agi = defender.stats.agility || 1;
        const pro = defender.stats.protection || 1;
        const lvl = attacker.level || 1;

        // Chance de desviar: agilidade * 0.5% (max 50%)
        const dodgeChance = Math.min(0.50, agi * 0.005);
        const dodged = Math.random() < dodgeChance;

        if (dodged) {
            log += `⚡ *${defenderName}* esquivou do ataque!`;
        } else {
            const baseDmg = Math.floor(Math.random() * 11) + 10;
            const strBonus = str * 0.5;
            const lvlBonus = lvl * 2;
            const rawDmg = baseDmg + strBonus + lvlBonus;

            // Redução por proteção: protecao * 0.2% (max 80%)
            const proReduction = Math.min(0.80, pro * 0.002);
            const finalDmg = Math.max(3, Math.round(rawDmg * (1 - proReduction)));

            if (turn === "A") {
                hpB = Math.max(0, hpB - finalDmg);
                log += `⚔️ *${attackerName}* atacou *${defenderName}* causando *${finalDmg}* de dano! (${defenderName} HP: ${hpB})`;
            } else {
                hpA = Math.max(0, hpA - finalDmg);
                log += `⚔️ *${attackerName}* atacou *${defenderName}* causando *${finalDmg}* de dano! (${attackerName} HP: ${hpA})`;
            }
        }
        
        rounds.push(log);
        turn = turn === "A" ? "B" : "A";
        roundNum++;
    }

    const winner = hpA > 0 ? "A" : "B";
    const winnerName = winner === "A" ? petA.name : petB.name;
    const winnerOwner = winner === "A" ? ownerAName : ownerBName;

    rounds.push(`\n🏆 *Vencedor:* *${winnerName}* (Pet de ${winnerOwner})!`);

    return {
        rounds,
        winner,
        winnerName,
        winnerOwner
    };
}
