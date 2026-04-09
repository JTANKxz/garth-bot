import { getGroupConfig, updateGroupConfig } from "../../utils/groups.js"
import { getBotConfig } from "../../config/botConfig.js"

export default {
  name: "fullmute",
  description: "Silencia todos do grupo (exceto admins).",
  aliases: ["mutetodos", "mta"],
  usage: "(minutos|cancel) (motivo)",
  category: "creator",

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid
    if (!jid.endsWith("@g.us")) return

    const sender = msg.key.participant
    const gConfig = getGroupConfig(jid)
    const botConfig = getBotConfig()

    if (!gConfig.muteds) gConfig.muteds = {}
    const prefix = gConfig.prefix || "!"

    const sub = (args[0] || "").toLowerCase()

    // ========= MUTEALL CANCEL =========
    if (sub === "cancel") {
      const count = Object.keys(gConfig.muteds || {}).length
      gConfig.muteds = {}
      updateGroupConfig(jid, { muteds: gConfig.muteds })

      return sock.sendMessage(jid, {
        text: `✅ *Muteall cancelado!* Removi *${count}* mute(s) do grupo.`
      }, { quoted: msg })
    }

    // ========= MUTEALL (ATIVAR) =========
    // !muteall 10 motivo...
    let duration = parseInt(args[0])
    if (Number.isNaN(duration)) duration = 0

    const reason = args.slice(1).join(" ") || "Sem motivo especificado"

    // se o cara digitou algo inválido tipo "!muteall abc"
    if (args[0] && Number.isNaN(parseInt(args[0])) && sub !== "cancel") {
      return sock.sendMessage(jid, {
        text:
`❌ Use:
${prefix}muteall 10 motivo
${prefix}muteall cancel`
      }, { quoted: msg })
    }

    const metadata = await sock.groupMetadata(jid)
    const participants = metadata.participants || []

    // Detecta JID do bot
    const botNumber = sock?.user?.id?.split(":")?.[0]
      ? `${sock.user.id.split(":")[0]}@s.whatsapp.net`
      : null

    // Admins do grupo
    const adminSet = new Set(
      participants.filter(p => !!p.admin).map(p => p.id)
    )

    // Protegidos do bot
    const protectedSet = new Set([
      botConfig.botCreator,
      botConfig.botMaster,
      ...(gConfig.botOwners || [])
    ])
    if (botNumber) protectedSet.add(botNumber)

    const expiresAt = duration > 0 ? Date.now() + duration * 60 * 1000 : null

    let mutedCount = 0
    const mentions = [sender] // cuidado com limite de mentions

    for (const p of participants) {
      const id = p.id
      if (!id) continue

      // não mutar admin do grupo nem protegidos
      if (adminSet.has(id)) continue
      if (protectedSet.has(id)) continue

      const previous = gConfig.muteds[id] || { deletes: 0 }

      gConfig.muteds[id] = {
        muted: true,
        expiresAt,
        deletes: previous.deletes
      }

      mutedCount++
      if (mentions.length < 50) mentions.push(id)
    }

    updateGroupConfig(jid, { muteds: gConfig.muteds })

    const txt =
`╔═══✦ *🤐 MUTEALL ATIVADO* ✦═══
║ 🛡️ Por: @${sender.split("@")[0]}
║ 👥 Mutados: ${mutedCount}
║ 📝 Motivo: ${reason}
║ ⏱️ Duração: ${duration > 0 ? duration + " min" : "Indefinido"}
╚═════════════════════`

    await sock.sendMessage(jid, {
      text: txt,
      mentions
    }, { quoted: msg })

    // ========= AUTO-DESMUTE =========
    if (duration > 0) {
      setTimeout(async () => {
        const updated = getGroupConfig(jid)
        if (!updated.muteds) return

        let removed = 0
        const now = Date.now()

        for (const [userId, data] of Object.entries(updated.muteds)) {
          if (data?.expiresAt && data.expiresAt <= now) {
            delete updated.muteds[userId]
            removed++
          }
        }

        updateGroupConfig(jid, { muteds: updated.muteds })

        await sock.sendMessage(jid, {
          text: `🔊 *Muteall finalizado!* ${removed} usuário(s) foram desmutados.`
        })
      }, duration * 60 * 1000)
    }
  }
}