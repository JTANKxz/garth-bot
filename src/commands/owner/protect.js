import { getGroupConfig } from "../../utils/groups.js";
import { protectUser, unprotectUser, getProtectedBy } from "../../utils/protect.js";
import { getBotConfig } from "../../config/botConfig.js";

const cleanJid = (jidStr) => {
  if (!jidStr) return "";
  const [user, host] = jidStr.split("@");
  const cleanUser = user.split(":")[0];
  return `${cleanUser}@${host || "s.whatsapp.net"}`;
};

export default {
  name: "protect",
  description: "Protege ou remove a protecao de um usuario contra acoes do bot.",
  usage: "@usuario | rm @usuario",
  aliases: ["proteger"],
  category: "owner",

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith("@g.us")) return;

    const rawSender = msg.key.participant || msg.key.remoteJid;
    const sender = cleanJid(rawSender);
    const groupConfig = getGroupConfig(jid);
    const botConfig = getBotConfig();
    const prefix = groupConfig.prefix || "!";
    const context = msg.message?.extendedTextMessage?.contextInfo;
    const mentionedId = context?.mentionedJid?.[0];
    const repliedId = context?.quotedMessage ? context.participant : null;
    const targetId = cleanJid(mentionedId || repliedId);
    const action = args[0]?.toLowerCase();

    if (!targetId) {
      return sock.sendMessage(jid, {
        text: `Use: ${prefix}protect @usuario ou ${prefix}protect rm @usuario.`
      }, { quoted: msg });
    }

    const isProtected = getProtectedBy(jid, targetId);

    if (["rm", "remove", "del"].includes(action)) {
      const jidBase = (x = "") => String(x).split("@")[0].split(":")[0];
      const isSenderCreator = jidBase(sender) === jidBase(botConfig.botCreator);

      if (!isSenderCreator) {
        return sock.sendMessage(jid, {
          text: "❌ Apenas o criador do bot pode remover a proteção de um usuário."
        }, { quoted: msg });
      }

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
