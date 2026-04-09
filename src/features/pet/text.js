import { getTypeLabel } from "./catalog.js";

function getBar(value, max = 100) {
    const totalBars = 8;
    const filledBars = Math.max(0, Math.min(totalBars, Math.floor((value / max) * totalBars)));
    const emptyBars = totalBars - filledBars;
    return "🟩".repeat(filledBars) + "⬜".repeat(emptyBars);
}

export function formatStatus(pet, ownerName = "Usuário") {
    const typeLabel = getTypeLabel(pet.type);

    return (
        `🐾 *PET DE ${ownerName.toUpperCase()}*\n\n` +
        `> Nome: *${pet.name}*\n` +
        `> Espécie: *${typeLabel}*\n\n` +
        `❤️ *VIDA:* [${getBar(pet.stats.life)}] *${pet.stats.life}%*\n` +
        `😊 *AFETO:* [${getBar(pet.stats.affection)}] *${pet.stats.affection}%*\n` +
        `🍖 *FOME:* [${getBar(pet.stats.hunger)}] *${pet.stats.hunger}%*\n` +
        `💧 *SEDE:* [${getBar(pet.stats.thirst)}] *${pet.stats.thirst}%*\n\n` +
        `_Mantenha seu pet feliz cuidando dele diariamente!_`
    );
}