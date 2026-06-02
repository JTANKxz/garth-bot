import { getGroupConfig, updateGroupConfig } from "../../utils/groups.js"
import { getBotConfig } from "../../config/botConfig.js"

/**
 * Converte um número para formato WhatsApp padrão
 * Ex: "92071968931959" -> "92071968931959@s.whatsapp.net"
 * Assim salva igual quando o bot adiciona normalmente
 */
function formatAsWhatsapp(numberOrJid) {
  if (!numberOrJid) return null;
  
  // Se já é um JID com @s.whatsapp.net, retorna
  if (numberOrJid.includes("@s.whatsapp.net")) return numberOrJid;
  
  // Se é apenas um número, formata com @s.whatsapp.net
  if (/^\d+$/.test(numberOrJid)) {
    return `${numberOrJid}@s.whatsapp.net`;
  }
  
  // Se vem com @lid, extrai o número e formata com @s.whatsapp.net
  if (numberOrJid.includes("@lid")) {
    const number = numberOrJid.replace(/:.*@lid$/, "").replace("@lid", "");
    return `${number}@s.whatsapp.net`;
  }
  
  return numberOrJid;
}

/**
 * Extrai o número de um JID/LID
 */
function extractNumber(jid) {
  if (!jid) return null;
  return jid
    .replace(/@s\.whatsapp\.net/g, "")
    .replace(/:.*@lid$/g, "")
    .replace(/@lid/g, "")
    .replace(/@g\.us/g, "");
}

export default {
    name: "bl",
    description: "Gerencia a blacklist.",
    usage: "(add/remove/list) - pode usar @mention, responder mensagem ou LID",
    aliases: ["black", "blacklist"],
    category: "admin",

    async run({ sock, msg, args }) {
        const jid = msg.key.remoteJid

        const groupConfig = getGroupConfig(jid)
        const botConfig = getBotConfig()
        const blacklist = groupConfig.blacklisteds || []
        const command = args[0]?.toLowerCase()

        const getTarget = () => {
            const ctx = msg.message?.extendedTextMessage?.contextInfo
            if (!ctx) return null
            if (ctx.mentionedJid?.length) return ctx.mentionedJid[0]
            if (ctx.participant) return ctx.participant
            return null
        }

        if (command === "list" || !command) {
            if (blacklist.length === 0) return sock.sendMessage(jid, { text: "✅ A blacklist está vazia." }, { quoted: msg })

            let text = '╔═══✦ *🚫 BLACKLIST* ✦═══\n'
            let mentions = []
            let i = 1

            for (const user of blacklist) {
                const number = extractNumber(user);
                text += `║ ${i}. ❌ @${number || user}\n`
                mentions.push(user)
                i++
            }

            text += '╚═════════════════════'
            return sock.sendMessage(jid, { text, mentions })
        }

        if (command === "add") {
            // Tenta extrair target de: argumento, menção ou resposta
            let target = null;

            // Se passou um argumento que parece ser um número/LID
            if (args[1]) {
                const arg = args[1].replace(/[@]/g, ""); // Remove @ se tiver
                if (/^\d+(?::\d+)?(?:@.*)?$/.test(arg)) {
                  target = formatAsWhatsapp(arg);
                }
            }

            // Caso contrário, procura por menção ou resposta
            if (!target) {
              target = getTarget();
            }

            if (!target) {
                return sock.sendMessage(jid, {
                    text: "❌ Você precisa:\n• Marcar um usuário: bl add @user\n• Responder a mensagem dele\n• Passar o LID: bl add 92071968931959"
                }, { quoted: msg })
            }

            const isCreator = target === botConfig.botCreator
            const isMaster = target === botConfig.botMaster
            const isOwner = groupConfig.botOwners?.includes(target)
            if (isCreator || isMaster || isOwner) {
                return sock.sendMessage(jid, {
                    text: `❌ Você não pode adicionar o ${isCreator ? "criador" : isMaster ? "master" : "dono do bot"} na blacklist!`
                }, { quoted: msg })
            }

            if (blacklist.includes(target)) {
                const number = extractNumber(target);
                return sock.sendMessage(jid, {
                    text: `⚠️ O usuário @${number} já está na blacklist.`,
                    mentions: [target]
                }, { quoted: msg })
            }

            blacklist.push(target)
            groupConfig.blacklisteds = blacklist
            updateGroupConfig(jid, groupConfig)

            const number = extractNumber(target);
            return sock.sendMessage(jid, {
                text: `✅ Usuário @${number} foi adicionado à blacklist.`,
                mentions: [target]
            })
        }

        if (command === "remove") {

            let target = null;

            // Se passou um número, trata como LID ou posição
            if (args[1]) {
              const arg = args[1];
              
              // Se é um número, pode ser posição da lista ou um LID
              if (!isNaN(arg)) {
                // Tenta primeiro como posição
                if (parseInt(arg) > 0 && parseInt(arg) <= blacklist.length) {
                  target = blacklist[parseInt(arg) - 1];
                } else if (/^\d+/.test(arg)) {
                  // Se não for posição válida, trata como número/LID
                  target = formatAsWhatsapp(arg);
                }
              } else if (/^\d+/.test(arg)) {
                // Se começa com número mas tem caracteres, pode ser LID
                target = formatAsWhatsapp(arg.replace(/[@]/g, ""));
              }
            }

            // Caso contrário, procura por menção ou resposta
            if (!target) {
              target = getTarget();
            }

            if (!target) {
                return sock.sendMessage(jid, {
                    text: "❌ Informe um usuário com @, responda a mensagem dele, use o LID ou use o número da lista (.bl remove 2)."
                }, { quoted: msg })
            }

            const isCreator = target === botConfig.botCreator
            const isOwner = groupConfig.botOwners?.includes(target)
            if (isCreator || isOwner) {
                return sock.sendMessage(jid, {
                    text: `❌ Você não pode remover o ${isCreator ? "criador" : "dono do bot"} da blacklist!`
                }, { quoted: msg })
            }

            if (!blacklist.includes(target)) {
                const number = extractNumber(target);
                return sock.sendMessage(jid, {
                    text: `⚠️ O usuário @${number} não está na blacklist.`,
                    mentions: [target]
                }, { quoted: msg })
            }

            blacklist.splice(blacklist.indexOf(target), 1)
            groupConfig.blacklisteds = blacklist
            updateGroupConfig(jid, groupConfig)

            const number = extractNumber(target);
            return sock.sendMessage(jid, {
                text: `🟢 Usuário @${number} foi removido da blacklist.`,
                mentions: [target]
            })
        }

        return sock.sendMessage(jid, {
            text: "❌ Comando inválido.\nUse:\n\n• *bl add @user* - Marcar usuário\n• *bl add 92071968931959* - Adicionar por LID\n• *bl remove @user / número / LID*\n• *bl list* - Listar blacklist"
        }, { quoted: msg })
    }
}
