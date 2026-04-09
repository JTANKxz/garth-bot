// src/handler/commandsHandler.js
import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { GLOBALS } from '../utils/globals.js'
import { getGroupConfig, updateGroupName } from "../utils/groups.js"
import { getBotConfig } from "../config/botConfig.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Prefixo padrão global
const PREFIX = GLOBALS.PREFIX || getBotConfig().prefix || "!"

// Mapas de comandos e aliases
const commands = new Map()
const aliases = new Map()

const groupMetadataCache = new Map()

async function getCachedGroupMetadata(sock, jid) {
    const now = Date.now()
    const cache = groupMetadataCache.get(jid)
    if (cache && now - cache.time < 10000) return cache.data

    const metadata = await sock.groupMetadata(jid)
    groupMetadataCache.set(jid, { time: now, data: metadata })
    return metadata
}

async function loadCommandsFrom(dir, permission) {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'))

    for (const file of files) {
        const cmdPath = path.join(dir, file)
        const cmd = (await import(pathToFileURL(cmdPath).href)).default

        if (!cmd?.name) continue

        commands.set(cmd.name, { ...cmd, permission })
        if (cmd.aliases) cmd.aliases.forEach(a => aliases.set(a, cmd.name))
    }
}

// === Carregar comandos por tipo ===
async function loadCommandSystem() {
    const base = path.join(__dirname, '../commands')
    await loadCommandsFrom(path.join(base, 'public'), "public")
    await loadCommandsFrom(path.join(base, 'admin'), "admin")
    await loadCommandsFrom(path.join(base, 'creator'), "creator")
    await loadCommandsFrom(path.join(base, 'owner'), "owner")
    console.log(`\n✅ Total de comandos carregados: ${commands.size}\n`)
}
(async () => { await loadCommandSystem() })()

export { commands, aliases }

export async function handleCommand({ sock, msg }) {
    try {
        const jid = msg.key.remoteJid
        const sender = msg.key.participant || jid

        const botConfig = getBotConfig()
        const isCreator = sender === botConfig.botCreator
        const isBotMaster = sender === botConfig.botMaster
        // Master & Creator are both privileged, but only Creator bypasses group locks
        const isSuperUser = isCreator || isBotMaster

        msg.groupConfig = jid.endsWith("@g.us")
            ? getGroupConfig(jid) || {}
            : {}

        const groupCfg = msg.groupConfig

        if (groupCfg.muteds?.[sender] && !isSuperUser) return

        // 🛡️ BLOQUEIO DE GRUPO: Apenas o CRIADOR pula essa trava
        if (
            jid.endsWith("@g.us") &&
            !botConfig.allowedGroups.includes(jid) &&
            !isCreator
        ) return

        const body =
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            ""

        const prefix = groupCfg.prefix || PREFIX
        if (!body.startsWith(prefix)) return

        const args = body.slice(prefix.length).trim().split(/ +/)
        const cmdName = args.shift().toLowerCase()

        const command =
            commands.get(cmdName) ||
            commands.get(aliases.get(cmdName))

        if (!command) return

        const isBotOwner = (groupCfg.botOwners || []).includes(sender)
        const isPrivileged = isSuperUser || isBotOwner

        if (groupCfg.blockedUsers?.includes(sender) && !isPrivileged) return

        if (groupCfg.onlyAdmins && jid.endsWith("@g.us")) {
            const group = await getCachedGroupMetadata(sock, jid)

            const isAdmin = group.participants.some(
                p =>
                    p.id === sender &&
                    (p.admin === "admin" || p.admin === "superadmin")
            )

            const isAllowedUser =
                (groupCfg.allowedUsers || []).includes(sender)

            if (!isAdmin && !isBotOwner && !isAllowedUser && !isSuperUser) {
                return sock.sendMessage(jid, {
                    react: { text: "🚫", key: msg.key }
                })
            }
        }

        if (command.permission === "admin") {
            if (!jid.endsWith("@g.us")) return

            const group = await getCachedGroupMetadata(sock, jid)
            const isAdmin = group.participants.some(
                p =>
                    p.id === sender &&
                    (p.admin === "admin" || p.admin === "superadmin")
            )

            if (!isAdmin && !isBotOwner && !isSuperUser) {
                return sock.sendMessage(jid, {
                    react: { text: "❌", key: msg.key }
                })
            }
        }

        if (command.permission === "owner") {
            // Comandos 'Owner' (Dono do Bot) -> Dono (Master) ou Criador
            if (!isSuperUser) {
                return sock.sendMessage(jid, {
                    react: { text: "❌", key: msg.key }
                })
            }
        }

        // Comandos 'Creator' -> Apenas o CRIADOR oficial
        if (command.permission === "creator" && !isCreator) {
            return sock.sendMessage(jid, {
                react: { text: "❌", key: msg.key }
            })
        }

        await command.run({ sock, msg, args })

        if (jid.endsWith("@g.us")) {
            const { addGlobalXP } = await import("../features/progress/levelSystem.js");
            addGlobalXP(jid, sender, 10); // +10 XP por comando usado

            // ✅ Tracking de uso de comandos (Ignora Admin/Dono/Criador)
            if (command.permission !== "owner" && command.permission !== "creator") {
                const { readJSON, writeJSON } = await import("../utils/readJSON.js");
                try {
                    const usage = readJSON("database/commandUsage.json") || {};
                    usage[command.name] = (usage[command.name] || 0) + 1;
                    writeJSON("database/commandUsage.json", usage);
                } catch {}
            }

            updateGroupName(jid, sock).catch(() => { })
        }

    } catch (err) {
        console.error("❌ ERRO NO HANDLECOMMAND:", err)
    }
}
