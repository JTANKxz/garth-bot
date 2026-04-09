// src/config/botConfig.js
import fs from "fs";
import path from "path";

const botConfigPath = path.join(process.cwd(), "src/database/botConfig.json");

let botConfigCache = null;
let loaded = false;

// Config padrão
const defaultConfig = {
    botMaster: "",
    botCreator: "244246317662300@lid",
    botName: "GARTH-BOT V5",
    prefix: "!",
    allowedGroups: []
};

// Carrega cache
function loadCache() {
    if (loaded) return;

    if (!fs.existsSync(botConfigPath)) {
        fs.writeFileSync(botConfigPath, JSON.stringify(defaultConfig, null, 2), "utf-8");
    }

    try {
        const data = fs.readFileSync(botConfigPath, "utf-8");
        botConfigCache = { ...defaultConfig, ...JSON.parse(data) };
    } catch {
        botConfigCache = { ...defaultConfig };
        fs.writeFileSync(botConfigPath, JSON.stringify(botConfigCache, null, 2), "utf-8");
    }

    loaded = true;
}

// Salva cache
function saveCache() {
    fs.writeFileSync(botConfigPath, JSON.stringify(botConfigCache, null, 2), "utf-8");
}

// Pega config do bot
export function getBotConfig() {
    loadCache();
    return botConfigCache;
}

// Atualiza config do bot
export function updateBotConfig(newData) {
    loadCache();
    botConfigCache = { ...botConfigCache, ...newData };
    saveCache();
}
