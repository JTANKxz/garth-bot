//src/commands/public/pet.js
import fs from "fs";
import path from "path";
import { getGroupConfig } from "../../utils/groups.js";
import { renderPetImage } from "../../features/pet/render.js"
import * as PetService from "../../features/pet/service.js";
import { formatStatus } from "../../features/pet/text.js";
import { getUserBalance, removeUserBalance } from "../../utils/saldo.js";
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
                `🐾 *Sistema de Pet*\n\n` +
                `Criar:\n` +
                `> *${prefix}pet criar <nome>*\n\n` +
                `Ver status:\n` +
                `> *${prefix}pet*\n` +
                `> *${prefix}pet status*\n\n` +
                `Interações:\n` +
                `> *${prefix}pet carinho*\n` +
                `> *${prefix}pet comida*\n` +
                `> *${prefix}pet agua*\n\n` +
                `Trocar nome:\n` +
                `> *${prefix}pet nome <novo nome>*\n\n` +
                `Trocar tipo de pet:\n` +
                `> *${prefix}pet pets*\n` +
                `> *${prefix}pet escolher <tipo>*\n\n` +
                `Skins:\n` +
                `> *${prefix}pet skins*\n` +
                `> *${prefix}pet skin <skin>*\n\n` +
                `Apagar:\n` +
                `> *${prefix}pet reset*`;

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
            if (option === "carinho" || option === "comida" || option === "agua") {
                const res = PetService.interact(pet, option);

                if (!res.ok && res.reason === "COOLDOWN") {
                    await sock.sendMessage(
                        jid,
                        { text: `⏳ Calma! Tente de novo em *${formatWait(res.waitMs)}*.` },
                        { quoted: msg }
                    );
                    await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
                    return;
                }

                if (!res.ok) {
                    await sock.sendMessage(jid, { text: "❌ Não deu pra interagir agora." }, { quoted: msg });
                    await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                    return;
                }

                saveDB(db);

                // responde com status já atualizado (texto)
                await sock.sendMessage(
                    jid,
                    {
                        text:
                            (option === "carinho" ? `🤗 Você deu carinho em *${pet.name}*!\n\n` : "") +
                            (option === "comida" ? `🍖 Você alimentou *${pet.name}*!\n\n` : "") +
                            (option === "agua" || option === "água"  ? `💧 Você deu água para *${pet.name}*!\n\n` : "")
                    },
                    { quoted: msg }
                );

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