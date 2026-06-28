import { getGroupConfig, updateGroupConfig } from "./groups.js";
import { getBotConfig } from "../config/botConfig.js";
import { getProtectedBy } from "./protect.js";
import { applyWarning } from "../features/warning.js";

export function getQuotedMessageInfo(msg) {
  const context = msg.message?.extendedTextMessage?.contextInfo;
  if (!context?.quotedMessage || !context?.stanzaId) return null;

  return {
    key: {
      remoteJid: msg.key.remoteJid,
      fromMe: false,
      id: context.stanzaId,
      participant: context.participant
    },
    participant: context.participant,
    message: context.quotedMessage
  };
}

export async function deleteQuotedMessage(sock, jid, quoted) {
  await sock.sendMessage(jid, { delete: quoted.key });
}

const cleanJid = (jidStr) => {
  if (!jidStr) return "";
  const [user, host] = jidStr.split("@");
  const cleanUser = user.split(":")[0];
  return `${cleanUser}@${host || "s.whatsapp.net"}`;
};

export async function canModerateTarget({ sock, jid, target, sender }) {
  const groupConfig = getGroupConfig(jid);
  const botConfig = getBotConfig();

  const cleanTarget = cleanJid(target);
  const cleanSender = cleanJid(sender);
  const protectedBy = getProtectedBy(jid, cleanTarget);

  const jidBase = (x = "") => String(x).split("@")[0].split(":")[0];
  const isSenderCreator = jidBase(cleanSender) === jidBase(botConfig.botCreator);

  if (protectedBy && !isSenderCreator) {
    const cleanProtector = cleanJid(protectedBy);
    return {
      ok: false,
      text: `Voce nao pode agir contra usuario protegido por @${cleanProtector.split("@")[0]}.`,
      mentions: [cleanProtector]
    };
  }

  const isCreator = cleanTarget === cleanJid(botConfig.botCreator);
  const isMaster = cleanTarget === cleanJid(botConfig.botMaster);
  const isOwner = groupConfig.botOwners?.includes(cleanTarget);

  if (isCreator || isMaster || (isOwner && !isSenderCreator)) {
    return {
      ok: false,
      text: `Voce nao pode agir contra ${isCreator ? "o criador" : isMaster ? "o master" : "um dono do bot"}.`,
      mentions: []
    };
  }

  return { ok: true };
}

export async function warnTarget(sock, jid, target, sender, reason) {
  await applyWarning(sock, jid, target, sender, reason);
}

export async function banTarget(sock, jid, target) {
  await sock.groupParticipantsUpdate(jid, [target], "remove");
}

export async function kickTarget(sock, jid, target) {
  const groupConfig = getGroupConfig(jid);
  await sock.groupParticipantsUpdate(jid, [target], "remove");

  if (!groupConfig.blacklisteds) groupConfig.blacklisteds = [];
  if (!groupConfig.blacklisteds.includes(target)) {
    groupConfig.blacklisteds.push(target);
    updateGroupConfig(jid, { blacklisteds: groupConfig.blacklisteds });
  }
}
