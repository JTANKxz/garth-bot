import { readJSON, writeJSON } from "../../utils/readJSON.js";
import { formatMoney } from "../../utils/saldo.js";
import { ensureUser, gainPetXP, sync as syncPet } from "../../features/pet/service.js";

const DB_PETS = "database/pets.json";
const DB_LUCKY = "database/lucky.json";
const COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4h

function formatTimeLeft(ms) {
    const totalMinutes = Math.ceil(ms / 60000);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h <= 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
}

export default {
    name: "explorar",
    aliases: ["missao", "adventure"],
    description: "Envia seu pet em uma missão de exploração",
    category: "fun",

    async run({ sock, msg }) {
        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;

        const petsDB = readJSON(DB_PETS) || {};
        const userPetData = ensureUser(petsDB, from, sender);
        syncPet(petsDB, from, sender);
        const pet = userPetData.pet;

        // A mesma sincronizacao do comando pet impede recompensas para pet morto.
        writeJSON(DB_PETS, petsDB);

        if (!pet) {
            const text = userPetData.petFarewell
                ? "Seu pet morreu ou fugiu. Adote outro antes de explorar."
                : "Voce nao tem um pet. Use !pet adotar para comecar.";
            return sock.sendMessage(from, { text }, { quoted: msg });
        }

        const now = Date.now();
        const lastExplore = userPetData.lastExploreAt || 0;

        if (now - lastExplore < COOLDOWN_MS) {
            return sock.sendMessage(from, { text: `⏳ Seu pet está cansado. Ele pode explorar novamente em *${formatTimeLeft(COOLDOWN_MS - (now - lastExplore))}*.` }, { quoted: msg });
        }

        // Requisito: Pet não pode estar com fome zero ou vida zero
        if (pet.stats.life <= 10 || pet.stats.hunger <= 10) {
            return sock.sendMessage(from, { text: "⚠️ Seu pet está muito fraco ou com fome para explorar! Cuide dele primeiro." }, { quoted: msg });
        }

        // Lógica de Sorte
        const luck = Math.random() * 100;
        let resultMsg = "";
        
        const luckyDB = readJSON(DB_LUCKY) || {};
        if (!luckyDB[from]) luckyDB[from] = {};
        if (!luckyDB[from][sender]) luckyDB[from][sender] = { money: 0, inventory: {} };
        const user = luckyDB[from][sender];
        if (!user.inventory) user.inventory = {};

        if (luck < 60) {
            // Ganho de Cash
            const foundInput = Math.floor(Math.random() * 300) + 1;
            user.money = (user.money || 0) + foundInput;
            resultMsg = `✨ *${pet.name}* explorou os arredores e encontrou *${formatMoney(foundInput)} fyne coins* jogados no chão!`;
        } else if (luck < 90) {
            // Ganho de Item
            const items = ["pet_food_pro", "pet_toy", "luck_charm"];
            const itemKey = items[Math.floor(Math.random() * items.length)];
            
            user.inventory[itemKey] = (user.inventory[itemKey] || 0) + 1;
            resultMsg = `🎁 *${pet.name}* encontrou um item raro na missão: *${itemKey.replace(/_/g, " ")}*!\nUse !mochila para ver.`;
        } else {
            // Falha / Evento
            resultMsg = `🍃 *${pet.name}* passeou bastante, mas não encontrou nada de interessante desta vez.`;
        }

        // Penalidade de Status
        pet.stats.hunger = Math.max(0, pet.stats.hunger - 20);
        pet.stats.thirst = Math.max(0, pet.stats.thirst - 20);
        userPetData.lastExploreAt = now;

        const leveledUp = gainPetXP(pet, 30);

        writeJSON(DB_PETS, petsDB);
        writeJSON(DB_LUCKY, luckyDB);

        let finalMsg = `🏹 *MISSÃO DE EXPLORAÇÃO*\n\n${resultMsg}\n\n⭐ +30 XP!`;
        if (leveledUp) {
            finalMsg += `\n🎉 *LEVEL UP!* Nível *${pet.level}*!`;
        }

        await sock.sendMessage(from, { text: finalMsg }, { quoted: msg });
    }
};
