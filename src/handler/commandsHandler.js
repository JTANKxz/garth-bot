// src/handler/commandsHandler.js
import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { GLOBALS } from '../utils/globals.js'
import { getGroupConfig, updateGroupName } from "../utils/groups.js"
import { getBotConfig } from "../config/botConfig.js"
import { getDisabledCommand } from "../utils/disabledCommands.js"

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
        const fileUrl = pathToFileURL(cmdPath).href + `?update=${Date.now()}`
        const cmd = (await import(fileUrl)).default

        if (!cmd?.name) continue

        commands.set(cmd.name, { ...cmd, permission })
        if (cmd.aliases) cmd.aliases.forEach(a => aliases.set(a, cmd.name))
    }
}

// === Carregar comandos por tipo ===
export async function loadCommandSystem() {
    const base = path.join(__dirname, '../commands')
    await loadCommandsFrom(path.join(base, 'public'), "public")
    await loadCommandsFrom(path.join(base, 'admin'), "admin")
    await loadCommandsFrom(path.join(base, 'creator'), "creator")
    await loadCommandsFrom(path.join(base, 'owner'), "owner")
    console.log(`\n✅ Total de comandos carregados: ${commands.size}\n`)
}
(async () => { await loadCommandSystem() })()

export async function reloadCommandSystem() {
    commands.clear()
    aliases.clear()
    await loadCommandSystem()
}

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

        // ⚠️ ALUGUEL EXPIRADO: Apenas o CRIADOR pula essa trava
        const isExpired = jid.endsWith("@g.us") && groupCfg.authExpiresAt && Date.now() >= groupCfg.authExpiresAt;
        if (isExpired && !isCreator) {
            const creatorJid = botConfig.botCreator;
            const creatorFormatted = `@${creatorJid.split("@")[0]}`;
            await sock.sendMessage(jid, {
                text: `⚠️ *Tempo de Aluguel Expirado!*\n\nO tempo de uso autorizado para este bot neste grupo acabou.\nPara renovar, entre em contato com o Criador do Bot: ${creatorFormatted}`,
                mentions: [creatorJid]
            }, { quoted: msg });
            return;
        }

        const body =
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            msg.message?.imageMessage?.caption ||
            msg.message?.videoMessage?.caption ||
            ""

        const prefix = groupCfg.prefix || PREFIX
        const noprefix = groupCfg.noprefix && isCreator

        if (body.trim().toLowerCase() === "prefixo") {
            return sock.sendMessage(jid, {
                text: `Prefixo atual: *${prefix}*\n\nExemplo: *${prefix}menu*`
            }, { quoted: msg });
        }

        // Se não tem prefixo e noprefix não está ativado, ignora
        if (!body.startsWith(prefix) && !noprefix) return

        // Extrai args com ou sem prefixo
        let args, cmdName
        if (body.startsWith(prefix)) {
          args = body.slice(prefix.length).trim().split(/ +/)
          cmdName = args.shift().toLowerCase()
        } else {
          // Modo noprefix - primeiro word é o comando
          args = body.trim().split(/ +/)
          cmdName = args.shift().toLowerCase()
        }

        const command =
            commands.get(cmdName) ||
            commands.get(aliases.get(cmdName))

        if (!command) {
            // Se o comando for vazio, apenas pontuação ou não tiver letras/números (ex: "!", "!!!!!")
            if (!cmdName || !/[a-zA-Z0-9]/.test(cmdName)) return;

            // Só sugere em grupos autorizados, sem modo onlyAdmins bloqueando, fora do PV
            if (!jid.endsWith("@g.us")) return;
            if (groupCfg.onlyAdmins) return;

            // Coleta todos os nomes de comandos públicos
            const publicNames = [];
            for (const [, cmd] of commands) {
                if (cmd.permission !== "owner" && cmd.permission !== "creator" && cmd.permission !== "admin") {
                    publicNames.push(cmd.name);
                    if (cmd.aliases) cmd.aliases.forEach(a => publicNames.push(a));
                }
            }

            // Levenshtein simples pra calcular distância entre strings
            function levenshtein(a, b) {
                const m = a.length, n = b.length;
                const dp = Array.from({ length: m + 1 }, (_, i) =>
                    Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0)
                );
                for (let i = 1; i <= m; i++)
                    for (let j = 1; j <= n; j++)
                        dp[i][j] = a[i-1] === b[j-1]
                            ? dp[i-1][j-1]
                            : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
                return dp[m][n];
            }

            // Calcula similaridade como porcentagem
            function similarity(a, b) {
                const dist = levenshtein(a, b);
                const maxLen = Math.max(a.length, b.length);
                return maxLen === 0 ? 100 : Math.round((1 - dist / maxLen) * 100);
            }

            let best = null;
            let bestScore = 0;

            for (const name of publicNames) {
                const score = similarity(cmdName, name);
                if (score > bestScore) {
                    bestScore = score;
                    best = name;
                }
            }

            const prefix = groupCfg.prefix || PREFIX;
            let text = `❌ Comando *${prefix}${cmdName}* não encontrado.`;

            if (best && bestScore >= 40) {
                text += `\n\n🔎 *Você quis dizer:*\n> ${prefix}${best} (${bestScore}% parecido)`;
            }

            return sock.sendMessage(jid, { text }, { quoted: msg });
        }

        const isBotOwner = (groupCfg.botOwners || []).includes(sender)
        const isPrivileged = isSuperUser || isBotOwner

        // Validações para comandos builtin
        const disabled = getDisabledCommand(command.name)
        if (disabled && !isCreator) {
            if (disabled.reason) {
                return sock.sendMessage(jid, {
                    text: `Comando inativo temporariamente.\nMotivo: ${disabled.reason}`
                }, { quoted: msg })
            }
            return
        }

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
            // Comandos 'Owner' (Dono do Bot) -> Dono (Master), Criador ou BotOwner do grupo
            if (!isSuperUser && !isBotOwner) {
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

        await command.run({ sock, msg, args, commandName: cmdName })

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
