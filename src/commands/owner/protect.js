import { getGroupConfig } from "../../utils/groups.js";
import { protectUser, unprotectUser, getProtectedBy } from "../../utils/protect.js";

export default {
  name: "protect",
  description: "Protege ou remove a protecao de um usuario contra acoes do bot.",
  usage: "@usuario | rm @usuario",
  aliases: ["proteger", "unprotect"],
  category: "owner",

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith("@g.us")) return;

    const sender = msg.key.participant || msg.key.remoteJid;
    const groupConfig = getGroupConfig(jid);
    const prefix = groupConfig.prefix || "!";
    const context = msg.message?.extendedTextMessage?.contextInfo;
    const mentionedId = context?.mentionedJid?.[0];
    const repliedId = context?.quotedMessage ? context.participant : null;
    const targetId = mentionedId || repliedId;
    const action = args[0]?.toLowerCase();

    if (!targetId) {
      return sock.sendMessage(jid, {
        text: `Use: ${prefix}protect @usuario ou ${prefix}protect rm @usuario.`
      }, { quoted: msg });
    }

    const isProtected = getProtectedBy(jid, targetId);

    if (["rm", "remove", "del"].includes(action)) {
      if (!isProtected) {
        return sock.sendMessage(jid, {
          text: `@${targetId.split("@")[0]} nao esta protegido.`,
          mentions: [targetId]
        }, { quoted: msg });
      }

      unprotectUser(jid, targetId);
      return sock.sendMessage(jid, {
        text: `Protecao removida de @${targetId.split("@")[0]}.`,
        mentions: [targetId]
      }, { quoted: msg });
    }

    if (isProtected) {
      return sock.sendMessage(jid, {
        text: `@${targetId.split("@")[0]} ja esta protegido. Use ${prefix}protect rm @usuario para remover.`,
        mentions: [targetId]
      }, { quoted: msg });
    }

    protectUser(jid, targetId, sender);
    return sock.sendMessage(jid, {
      text: `Usuario @${targetId.split("@")[0]} agora esta protegido.`,
      mentions: [targetId]
    }, { quoted: msg });
  }
};
