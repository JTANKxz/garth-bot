import { getTypeLabel } from "./catalog.js";

export function formatStatus(pet, ownerName = "Usuário") {
    const typeLabel = getTypeLabel(pet.type);
    const lvl = pet.level || 1;
    const xp = pet.xp || 0;
    const nextXp = lvl * 100;

    const str = pet.stats.strength || 1;
    const agi = pet.stats.agility || 1;
    const pro = pet.stats.protection || 1;

    return (
        `🐾 *${pet.name}* (${ownerName})\n\n` +
        `🏷️ Espécie: ${typeLabel}\n` +
        `⭐ Nível: ${lvl} (${xp}/${nextXp} XP)\n` +
        `❤️ Vida: ${pet.stats.life}%\n` +
        `🥰 Afeto: ${pet.stats.affection}%\n` +
        `🍖 Fome: ${pet.stats.hunger}%\n` +
        `💧 Sede: ${pet.stats.thirst}%\n\n` +
        `⚔️ Força: ${str}/100\n` +
        `⚡ Agilidade: ${agi}/100\n` +
        `🛡️ Proteção: ${pro}/100`
    );
}