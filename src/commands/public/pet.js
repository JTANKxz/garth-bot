//src/commands/public/pet.js
import fs from "fs";
import path from "path";
import { getGroupConfig } from "../../utils/groups.js";
import { renderPetImage } from "../../features/pet/render.js"
import * as PetService from "../../features/pet/service.js";
import { formatStatus } from "../../features/pet/text.js";
import { getUserBalance, removeUserBalance, addMoney } from "../../utils/saldo.js";
import {
    getDefaultType,
    getManifest,
    typeExists,
    skinExists,
    getTypeLabel,
    getCreatePrice,
    getTypePrice,
    getSkinPrice,
} from "../../features/pet/catalog.js";

const dbPath = path.resolve("src/database/pets.json");

function loadDB() {
    if (!fs.existsSync(dbPath)) {
        fs.writeFileSync(dbPath, JSON.stringify({}, null, 2));
    }
    return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

function saveDB(db) {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}

function formatWait(ms) {
    const s = Math.ceil(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.ceil(s / 60);
    return `${m}min`;
}

export default {
    name: "pet",
    description: "Tamagotchi do grupo: crie, cuide, troque pet/skin e evolua (texto por enquanto).",
    aliases: [],
    usage: "(criar/nome/status/carinho/comida/agua/pets/escolher/skins/skin/reset)",
    category: "fun",

    async run({ sock, msg, args }) {
        const jid = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        const pushName = msg.pushName || "Usuário";

        const groupConfig = getGroupConfig(jid);
        const prefix = groupConfig.prefix || "!";

        await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

        try {
            const db = loadDB();
            const u = PetService.ensureUser(db, jid, sender);

            // 1. Sincronizar (Aplica Decay/Morte)
            if (u.pet) {
                PetService.sync(db, jid, sender);
                saveDB(db);
            }

            const pet = u.pet;

            // 2. Mensagem de Despedida (se o pet acabou de ir embora por negligência)
            if (!pet && u.petFarewell) {
                u.petFarewell = false;
                saveDB(db);
                await sock.sendMessage(jid, { 
                    text: `😢 *DESPEDIDA:* Seu antigo companheiro se sentiu muito fraco e negligenciado, e acabou partindo em busca de uma nova família que pudesse cuidar melhor dele...\n\nPode ser difícil, mas se quiser, você pode adotar um novo parceiro usando: *${prefix}pet criar <nome>*` 
                }, { quoted: msg });
                await sock.sendMessage(jid, { react: { text: "💔", key: msg.key } });
                return;
            }

            const helpText =
                `🐾 *Menu de Pets*\n\n` +
                `👉 *${prefix}pet criar <nome>* — Adote um pet (${getCreatePrice()} coins)\n` +
                `👉 *${prefix}pet status* — Veja os status e atributos\n` +
                `👉 *${prefix}pet carinho* — Dê carinho no seu pet\n` +
                `👉 *${prefix}pet comida* — Alimente seu pet\n` +
                `👉 *${prefix}pet agua* — Dê água para seu pet\n` +
                `👉 *${prefix}pet nome <nome>* — Renomeie o pet\n` +
                `👉 *${prefix}pet pets* — Veja as espécies disponíveis\n` +
                `👉 *${prefix}pet escolher <espécie>* — Troque de espécie\n` +
                `👉 *${prefix}pet skins* — Lista de skins do pet\n` +
                `👉 *${prefix}pet skin <skin>* — Equipe/Compre uma skin\n` +
                `👉 *${prefix}pet treinar <atributo>* — Treine atributos (força/agilidade/proteção)\n` +
                `👉 *${prefix}pet lutar @jogador* — Batalhe contra o pet de outro jogador\n` +
                `👉 *${prefix}pet reset* — Abandone seu pet atual`;

            // sem args => status/help
            if (!args?.[0]) {
                if (!pet) {
                    await sock.sendMessage(jid, { text: helpText }, { quoted: msg });
                    await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
                    return;
                }

                const img = await renderPetImage(pet);

                await sock.sendMessage(
                    jid,
                    { image: img, caption: formatStatus(pet, pushName) },
                    { quoted: msg }
                );

                await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
                return;
            }
            const option = String(args[0]).toLowerCase();

            // criar
            if (option === "criar") {
                if (pet) {
                    await sock.sendMessage(
                        jid,
                        { text: `🐾 Você já tem um pet neste grupo: *${pet.name}*.\nUse: *${prefix}pet*` },
                        { quoted: msg }
                    );
                    await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
                    return;
                }

                const nome = args.slice(1).join(" ").trim();
                if (!nome) {
                    await sock.sendMessage(
                        jid,
                        { text: `❌ Use: *${prefix}pet criar <nome>*\nEx: *${prefix}pet criar Totó*` },
                        { quoted: msg }
                    );
                    await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                    return;
                }

                // Verificar saldo
                const createPrice = getCreatePrice();
                const saldo = getUserBalance(jid, sender);
                if (saldo < createPrice) {
                    await sock.sendMessage(
                        jid,
                        { text: `💰 Saldo insuficiente!\n\n*Custo:* ${createPrice} fyne coins\n*Seu saldo:* ${saldo} fyne coins` },
                        { quoted: msg }
                    );
                    await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                    return;
                }

                const res = PetService.createPet(db, jid, sender, nome);
                if (!res.ok) {
                    await sock.sendMessage(jid, { text: "❌ Não foi possível criar seu pet." }, { quoted: msg });
                    await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                    return;
                }

                // Cobrar saldo
                removeUserBalance(jid, sender, createPrice);

                // garante que o tipo padrão é gatinho (manifest defaultType)
                // se manifest não existir/der erro, service cai em "cat" por padrão
                saveDB(db);

                const label = getTypeLabel(res.pet.type);

                await sock.sendMessage(
                    jid,
                    {
                        text:
                            `✅ Pet criado!\n\n` +
                            `🐾 Nome: *${res.pet.name}*\n` +
                            `🐱 Tipo: *${label}*\n` +
                            `💰 Custo: *${createPrice}* fyne coins\n\n` +
                            `Use: *${prefix}pet* para ver seu pet.`,
                    },
                    { quoted: msg }
                );

                await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
                return;
            }

            // se não tem pet, daqui pra frente bloqueia
            if (!pet) {
                await sock.sendMessage(
                    jid,
                    { text: `🐾 Você ainda não tem pet. Use: *${prefix}pet criar <nome>*` },
                    { quoted: msg }
                );
                await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
                return;
            }

            // status/ver
            // status/ver
            if (option === "status" || option === "ver") {
                const img = await renderPetImage(pet);

                await sock.sendMessage(
                    jid,
                    {
                        image: img,
                        caption: formatStatus(pet, pushName),
                    },
                    { quoted: msg }
                );

                await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
                return;
            }
            // carinho/comida/agua
            if (option === "carinho" || option === "comida" || option === "agua" || option === "água") {
                const action = option === "água" ? "agua" : option;
                const res = PetService.interact(pet, action);

                if (!res.ok && res.reason === "COOLDOWN") {
                    await sock.sendMessage(
                        jid,
                        { text: `⏳ Espere *${formatWait(res.waitMs)}* para interagir.` },
                        { quoted: msg }
                    );
                    await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
                    return;
                }

                if (!res.ok) {
                    await sock.sendMessage(jid, { text: "❌ Falha ao interagir." }, { quoted: msg });
                    await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                    return;
                }

                const leveledUp = PetService.gainPetXP(pet, 5);
                saveDB(db);

                let successMsg = 
                    (action === "carinho" ? `🤗 Carinho dado em *${pet.name}*!\n` : "") +
                    (action === "comida" ? `🍖 Alimentado *${pet.name}*!\n` : "") +
                    (action === "agua" ? `💧 Dado água para *${pet.name}*!\n` : "") +
                    `⭐ +5 XP!`;

                if (leveledUp) {
                    successMsg += `\n🎉 *LEVEL UP!* Nível *${pet.level}*!`;
                }

                await sock.sendMessage(jid, { text: successMsg }, { quoted: msg });
                await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
                return;
            }

            // trocar nome
            if (option === "nome") {
                const newName = args.slice(1).join(" ").trim();
                if (!newName) {
                    await sock.sendMessage(
                        jid,
                        { text: `❌ Use: *${prefix}pet nome <novo nome>*` },
                        { quoted: msg }
                    );
                    await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                    return;
                }

                PetService.renamePet(pet, newName);
                saveDB(db);

                await sock.sendMessage(
                    jid,
                    { text: `✅ Nome alterado!` },
                    { quoted: msg }
                );
                await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
                return;
            }

            // listar tipos (pets)
            if (option === "pets") {
                const m = getManifest();
                const lines = Object.entries(m.types || {}).map(([type, info]) => {
                    const label = info?.label || type;
                    const price = info?.price || 0;
                    const priceText = price > 0 ? ` (${price} fyne coins)` : ` (grátis)`;
                    return `*${type}* — ${label}${priceText}`;
                });

                await sock.sendMessage(
                    jid,
                    {
                        text:
                            `🐾 *Pets disponíveis*\n\n` +
                            (lines.length ? lines.join("\n") : "Nenhum pet cadastrado no manifest.") +
                            `\n\nUse:\n> *${prefix}pet escolher <1>*`,
                    },
                    { quoted: msg }
                );
                await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
                return;
            }

            // escolher tipo
            if (option === "escolher") {
                const type = String(args[1] || "").toLowerCase().trim();
                if (!type) {
                    await sock.sendMessage(
                        jid,
                        { text: `❌ Use: *${prefix}pet escolher <tipo>*\nEx: *${prefix}pet escolher cat*` },
                        { quoted: msg }
                    );
                    await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                    return;
                }

                // Verificar se o tipo é válido
                if (!typeExists(type)) {
                    await sock.sendMessage(
                        jid,
                        { text: `❌ Pet inválido: *${type}*.\nUse: *${prefix}pet pets*` },
                        { quoted: msg }
                    );
                    await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                    return;
                }

                // Verificar saldo
                const typePrice = getTypePrice(type);
                if (typePrice > 0) {
                    const saldo = getUserBalance(jid, sender);
                    if (saldo < typePrice) {
                        await sock.sendMessage(
                            jid,
                            { text: `💰 Saldo insuficiente!\n\n*Custo:* ${typePrice} fyne coins\n*Seu saldo:* ${saldo} fyne coins` },
                            { quoted: msg }
                        );
                        await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                        return;
                    }
                }

                const res = PetService.setType(pet, type);
                if (!res.ok) {
                    await sock.sendMessage(
                        jid,
                        { text: `❌ Pet inválido: *${type}*.\nUse: *${prefix}pet pets*` },
                        { quoted: msg }
                    );
                    await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                    return;
                }

                // Cobrar saldo (se houver preço)
                if (typePrice > 0) {
                    removeUserBalance(jid, sender, typePrice);
                }

                saveDB(db);

                const priceText = typePrice > 0 ? `\n💰 Custo: *${typePrice}* fyne coins` : "";
                await sock.sendMessage(
                    jid,
                    { text: `✅ Pet trocado!${priceText}` },
                    { quoted: msg }
                );
                await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
                return;
            }

            // listar skins do tipo atual
            if (option === "skins") {
                const m = getManifest();
                const type = pet.type;
                const skins = m.types?.[type]?.skins || {};

                const lines = Object.entries(skins).map(([skin, info]) => {
                    const label = info?.label || skin;
                    const price = info?.price || 0;
                    const owned = PetService.hasSkinOwned(pet, skin);
                    
                    let statusText = owned ? "🔓" : "🔒";
                    let priceText = price > 0 ? ` (${price} fyne coins)` : ` (grátis)`;
                    
                    if (owned) {
                        priceText = " (adquirida)";
                    }
                    
                    return `• *${skin}* — ${label} ${statusText}${priceText}`;
                });

                await sock.sendMessage(
                    jid,
                    {
                        text:
                            `🎭 *Skins do ${getTypeLabel(type)}*\n\n` +
                            (lines.length ? lines.join("\n") : "Nenhuma skin cadastrada.") +
                            `\n\nUse:\n> *${prefix}pet skin <skin>*`,
                    },
                    { quoted: msg }
                );
                await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
                return;
            }

            // trocar skin
            if (option === "skin") {
                const skin = String(args[1] || "").toLowerCase().trim();
                if (!skin) {
                    await sock.sendMessage(
                        jid,
                        { text: `❌ Use: *${prefix}pet skin <skin>*\nEx: *${prefix}pet skin default*` },
                        { quoted: msg }
                    );
                    await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                    return;
                }

                // Verificar se a skin é válida para esse pet
                if (!skinExists(pet.type, skin)) {
                    await sock.sendMessage(
                        jid,
                        { text: `❌ Skin inválida para esse pet.\nUse: *${prefix}pet skins*` },
                        { quoted: msg }
                    );
                    await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                    return;
                }

                // Verificar se já é dona da skin
                const alreadyOwned = PetService.hasSkinOwned(pet, skin);
                const skinPrice = getSkinPrice(pet.type, skin);

                // Só cobrar se ainda não tem a skin e há um preço
                if (!alreadyOwned && skinPrice > 0) {
                    const saldo = getUserBalance(jid, sender);
                    if (saldo < skinPrice) {
                        await sock.sendMessage(
                            jid,
                            { text: `💰 Saldo insuficiente!\n\n*Custo:* ${skinPrice} fyne coins\n*Seu saldo:* ${saldo} fyne coins` },
                            { quoted: msg }
                        );
                        await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                        return;
                    }
                }

                const res = PetService.setSkin(pet, skin);
                if (!res.ok) {
                    await sock.sendMessage(
                        jid,
                        { text: `❌ Skin inválida para esse pet.\nUse: *${prefix}pet skins*` },
                        { quoted: msg }
                    );
                    await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                    return;
                }

                // Se não tinha a skin antes, cobrar e adicionar à lista
                if (!alreadyOwned) {
                    if (skinPrice > 0) {
                        removeUserBalance(jid, sender, skinPrice);
                        PetService.grantSkinOwnership(pet, skin);
                    } else {
                        PetService.grantSkinOwnership(pet, skin);
                    }
                }

                saveDB(db);

                const hasMessage = alreadyOwned
                    ? "✅ Skin aplicada! (já era sua)"
                    : skinPrice > 0
                    ? `✅ Skin adquirida e aplicada!\n💰 Custo: *${skinPrice}* fyne coins`
                    : "✅ Skin aplicada!";

                await sock.sendMessage(
                    jid,
                    { text: hasMessage },
                    { quoted: msg }
                );
                await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
                return;
            }

            // treinar
            if (option === "treinar" || option === "treino" || option === "up") {
                const attrInput = args[1] ? String(args[1]).toLowerCase().trim() : "";
                
                if (!attrInput) {
                    const str = pet.stats.strength || 1;
                    const agi = pet.stats.agility || 1;
                    const pro = pet.stats.protection || 1;

                    const costStr = str < 100 ? `${PetService.getTrainCost(str)} coins` : "MAX";
                    const costAgi = agi < 100 ? `${PetService.getTrainCost(agi)} coins` : "MAX";
                    const costPro = pro < 100 ? `${PetService.getTrainCost(pro)} coins` : "MAX";

                    const msgText = 
                        `🏋️ *Treinamento de Atributos*\n\n` +
                        `⚔️ Força: *${str}/100* (Custo: ${costStr})\n` +
                        `⚡ Agilidade: *${agi}/100* (Custo: ${costAgi})\n` +
                        `🛡️ Proteção: *${pro}/100* (Custo: ${costPro})\n\n` +
                        `👉 Digite:\n*${prefix}pet treinar força*\n*${prefix}pet treinar agilidade*\n*${prefix}pet treinar proteção*`;

                    await sock.sendMessage(jid, { text: msgText }, { quoted: msg });
                    await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
                    return;
                }

                const trainRes = PetService.trainPet(pet, attrInput);
                if (!trainRes.ok) {
                    if (trainRes.reason === "INVALID_ATTRIBUTE") {
                        await sock.sendMessage(jid, { text: "❌ Escolha: força, agilidade ou proteção." }, { quoted: msg });
                    } else if (trainRes.reason === "MAX_LEVEL") {
                        await sock.sendMessage(jid, { text: "⭐ Atributo já está no nível máximo (100)!" }, { quoted: msg });
                    }
                    await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                    return;
                }

                const { cost, attribute: targetAttr } = trainRes;
                const saldo = getUserBalance(jid, sender);

                if (saldo < cost) {
                    await sock.sendMessage(
                        jid,
                        { text: `💰 Sem saldo! Custo: ${cost} coins. Saldo: ${saldo} coins.` },
                        { quoted: msg }
                    );
                    await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                    return;
                }

                removeUserBalance(jid, sender, cost);
                pet.stats[targetAttr]++;
                
                const leveledUp = PetService.gainPetXP(pet, 15);
                saveDB(db);

                const attrLabels = {
                    strength: "Força ⚔️",
                    agility: "Agilidade ⚡",
                    protection: "Proteção 🛡️"
                };

                let successMsg = `🏋️ *Atributo Melhorado!*\n\n` +
                    `👉 ${attrLabels[targetAttr]}: *${pet.stats[targetAttr]}/100*\n` +
                    `💰 Custo: *${cost} coins*\n` +
                    `⭐ +15 XP!`;

                if (leveledUp) {
                    successMsg += `\n🎉 *LEVEL UP!* Nível *${pet.level}*!`;
                }

                await sock.sendMessage(jid, { text: successMsg }, { quoted: msg });
                await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
                return;
            }

            // lutar
            if (option === "lutar" || option === "batalhar" || option === "fight") {
                const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
                if (mentions.length === 0) {
                    await sock.sendMessage(jid, { text: `❌ Marque o oponente! Ex: *${prefix}pet lutar @jogador*` }, { quoted: msg });
                    await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                    return;
                }

                const targetUser = mentions[0];
                if (targetUser === sender) {
                    await sock.sendMessage(jid, { text: "❌ Você não pode lutar contra si mesmo!" }, { quoted: msg });
                    await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                    return;
                }

                const targetUserData = db[jid]?.[targetUser];
                if (!targetUserData || !targetUserData.pet) {
                    await sock.sendMessage(jid, { text: "🐾 Oponente não tem pet!" }, { quoted: msg });
                    await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                    return;
                }

                PetService.sync(db, jid, targetUser);
                const opponentPet = targetUserData.pet;
                if (!opponentPet) {
                    await sock.sendMessage(jid, { text: "🐾 O pet do oponente fugiu ou morreu!" }, { quoted: msg });
                    await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                    return;
                }

                if (pet.stats.life <= 20) {
                    await sock.sendMessage(jid, { text: `❌ Seu pet (*${pet.name}*) está fraco (Vida <= 20%).` }, { quoted: msg });
                    await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                    return;
                }
                if (opponentPet.stats.life <= 20) {
                    await sock.sendMessage(jid, { text: `❌ O pet do oponente está muito fraco!` }, { quoted: msg });
                    await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                    return;
                }

                const lastBattle = u.lastBattleAt || 0;
                const now = Date.now();
                const battleCooldown = 60 * 1000; // 1 min
                if (now - lastBattle < battleCooldown) {
                    const timeLeft = Math.ceil((battleCooldown - (now - lastBattle)) / 1000);
                    await sock.sendMessage(jid, { text: `⏳ Recarregando... Tente em *${timeLeft}s*.` }, { quoted: msg });
                    await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                    return;
                }

                u.lastBattleAt = now;

                const { simulatePetBattle } = await import("../../features/pet/battle.js");
                const targetPushName = targetUserData.pushName || "Oponente";
                const battleRes = simulatePetBattle(pet, opponentPet, pushName, targetPushName);

                pet.stats.life = Math.max(10, pet.stats.life - 15);
                opponentPet.stats.life = Math.max(10, opponentPet.stats.life - 15);

                let rewardCoins = 0;
                let xpGain = 0;
                let resultText = "";

                if (battleRes.winner === "A") {
                    rewardCoins = 100;
                    xpGain = 40;
                    addMoney(jid, sender, rewardCoins);
                    const lvlUp = PetService.gainPetXP(pet, xpGain);
                    PetService.gainPetXP(opponentPet, 10);
                    
                    resultText = `🎉 *VITÓRIA!*\n🐾 *${pet.name}* venceu!\n💰 +${rewardCoins} coins\n⭐ +${xpGain} XP`;
                    if (lvlUp) resultText += `\n🎉 *LEVEL UP!* Nível *${pet.level}*!`;
                } else {
                    rewardCoins = 30;
                    xpGain = 10;
                    addMoney(jid, sender, rewardCoins);
                    const lvlUp = PetService.gainPetXP(pet, xpGain);
                    
                    const oppReward = 100;
                    const oppXp = 40;
                    addMoney(jid, targetUser, oppReward);
                    PetService.gainPetXP(opponentPet, oppXp);

                    resultText = `💀 *DERROTA!*\n🐾 *${pet.name}* perdeu...\n💰 +${rewardCoins} coins\n⭐ +${xpGain} XP`;
                    if (lvlUp) resultText += `\n🎉 *LEVEL UP!* Nível *${pet.level}*!`;
                }

                saveDB(db);

                const battleLogs = battleRes.rounds.join("\n");
                
                await sock.sendMessage(jid, {
                    text: 
                        `⚔️ *BATALHA DE PETS* ⚔️\n\n` +
                        `${battleLogs}\n\n` +
                        `---------------------\n` +
                        `${resultText}\n\n` +
                        `⚠️ *Ambos perderam 15% de vida.*`
                }, { quoted: msg });

                await sock.sendMessage(jid, { react: { text: "⚔️", key: msg.key } });
                return;
            }

            // reset/apagar
            if (option === "reset" || option === "apagar") {
                db[jid][sender].pet = null;
                saveDB(db);

                await sock.sendMessage(
                    jid,
                    { text: `🗑️ Pet apagado. Use *${prefix}pet criar <nome>* para criar outro.` },
                    { quoted: msg }
                );
                await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
                return;
            }

            // opção inválida
            await sock.sendMessage(jid, { text: helpText }, { quoted: msg });
            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (err) {
            console.error("Erro no comando pet:", err);

            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            await sock.sendMessage(
                jid,
                { text: "❌ Ocorreu um erro ao executar o comando pet." },
                { quoted: msg }
            );
        }
    },
};