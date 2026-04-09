import { applyDecay } from "./engine.js";
import {
    getDefaultType,
    typeExists,
    skinExists,
} from "./catalog.js";

// adicione no service.js

export function sync(db, jid, sender) {
  const u = ensureUser(db, jid, sender);
  const pet = u.pet;
  if (!pet) return;

  // migração automática (se existir pet antigo no db)
  if (pet?.type === "cat") pet.type = "1";
  if (pet?.type === "dog") pet.type = "2";
  if (pet?.type === "penguin") pet.type = "3";
  if (pet?.type === "pinguim") pet.type = "3";

  const hasDeparted = applyDecay(pet, Date.now());

  if (hasDeparted) {
    u.pet = null;
    u.petFarewell = true; // Flag para mensagem de despedida
  }
}

function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}

export function ensureUser(db, jid, sender) {
    if (!db[jid]) db[jid] = {};
    if (!db[jid][sender]) db[jid][sender] = {};
    if (!("pet" in db[jid][sender])) db[jid][sender].pet = null;
    return db[jid][sender];
}

export function getPet(db, jid, sender) {
    const u = ensureUser(db, jid, sender);
    return u.pet;
}

export function createPet(db, jid, sender, name) {
    const u = ensureUser(db, jid, sender);
    if (u.pet) return { ok: false, reason: "ALREADY_HAS_PET" };

    const type = getDefaultType(); // gatinho
    const skin = "default";

    u.pet = {
        name: name.slice(0, 20),
        type,
        skin,
        ownedSkins: [skin], // começa com a skin default
        stats: { life: 100, affection: 50, hunger: 80, thirst: 80 },
        timestamps: {
            createdAt: Date.now(),
            updatedAt: Date.now(),
            lastCareAt: 0,
            lastFeedAt: 0,
            lastWaterAt: 0,
        },
    };

    return { ok: true, pet: u.pet };
}

export function renamePet(pet, newName) {
    applyDecay(pet);
    pet.name = newName.slice(0, 20);
    pet.timestamps.updatedAt = Date.now();
    return { ok: true };
}

export function setType(pet, type) {
    applyDecay(pet);

    if (!typeExists(type)) return { ok: false, reason: "TYPE_NOT_FOUND" };

    pet.type = type;
    // reset skin pra default se a atual não existir no novo tipo
    if (!skinExists(type, pet.skin)) pet.skin = "default";

    pet.timestamps.updatedAt = Date.now();
    return { ok: true };
}

export function setSkin(pet, skin) {
    applyDecay(pet);

    if (!skinExists(pet.type, skin)) return { ok: false, reason: "SKIN_NOT_FOUND" };
    pet.skin = skin;

    pet.timestamps.updatedAt = Date.now();
    return { ok: true };
}

export function interact(pet, action) {
    applyDecay(pet);

    const now = Date.now();

    const cooldowns = {
        carinho: 30_000,
        comida: 120_000,
        agua: 120_000,
    };

    const lastKey = {
        carinho: "lastCareAt",
        comida: "lastFeedAt",
        agua: "lastWaterAt",
    }[action];

    if (!lastKey) return { ok: false, reason: "INVALID_ACTION" };

    const last = pet.timestamps[lastKey] || 0;
    const cd = cooldowns[action] || 0;
    if (now - last < cd) return { ok: false, reason: "COOLDOWN", waitMs: cd - (now - last) };

    if (action === "carinho") {
        pet.stats.affection = clamp(pet.stats.affection + 10, 0, 100);
        pet.stats.life = clamp(pet.stats.life + 2, 0, 100);
    }

    if (action === "comida") {
        pet.stats.hunger = clamp(pet.stats.hunger + 20, 0, 100);
        pet.stats.life = clamp(pet.stats.life + 5, 0, 100);
    }

    if (action === "agua") {
        pet.stats.thirst = clamp(pet.stats.thirst + 20, 0, 100);
        pet.stats.life = clamp(pet.stats.life + 5, 0, 100);
    }

    pet.timestamps[lastKey] = now;
    pet.timestamps.updatedAt = now;

    return { ok: true };
}

export function hasSkinOwned(pet, skin) {
    if (!pet.ownedSkins) pet.ownedSkins = [];
    return pet.ownedSkins.includes(String(skin));
}

export function grantSkinOwnership(pet, skin) {
    if (!pet.ownedSkins) pet.ownedSkins = [];
    const skinStr = String(skin);
    if (!pet.ownedSkins.includes(skinStr)) {
        pet.ownedSkins.push(skinStr);
    }
}