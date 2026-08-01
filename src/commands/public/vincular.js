import { confirmFyneLink } from '../../services/fyneApi.js';
import { readJSON } from '../../utils/readJSON.js';
import { calculateLevel } from '../../features/progress/levelSystem.js';
import { getJobByKey } from '../../features/jobs/catalog.js';

function messageIdentity(msg) {
  const candidates = [msg.key?.participant, msg.key?.participantAlt, msg.key?.remoteJid, msg.key?.remoteJidAlt].filter(Boolean);
  return {
    lid: candidates.find(id => id.endsWith('@lid')) || null,
    phoneJid: candidates.find(id => id.endsWith('@s.whatsapp.net')) || null,
  };
}

function profileSnapshot(groupId, lid, groupName) {
  const counts = readJSON('database/messageCounts.json') || {};
  const lucky = readJSON('database/lucky.json') || {};
  const jobs = readJSON('database/jobs.json') || {};
  const achievements = readJSON('database/conquistas.json') || {};
  const countData = counts[groupId]?.[lid] || {};
  const luckyData = lucky[groupId]?.[lid] || {};
  const jobData = jobs[groupId]?.[lid] || {};
  const progress = achievements[groupId]?.[lid] || {};
  const job = jobData.job ? getJobByKey(jobData.job) : null;

  return {
    level: calculateLevel(countData.xp || 0),
    xp: countData.xp || 0,
    money: luckyData.money || 0,
    achievements: Array.isArray(progress.achievements) ? progress.achievements.length : 0,
    job: job?.name || 'Desempregado',
    messages: countData.messages || 0,
    popularity: countData.popularity || 0,
    victories: countData.victories || 0,
    group_name: groupName || 'Grupo FYNE',
  };
}

async function avatarData(sock, lid) {
  try {
    const url = await sock.profilePictureUrl(lid, 'image');
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    if (!/^image\/(jpeg|png|webp)$/.test(contentType)) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > 3 * 1024 * 1024) return null;
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
}

export default {
  name: 'vincular',
  aliases: ['ativarconta', 'conectar'],
  description: 'Vincula seu LID do WhatsApp à conta FYNE',
  usage: 'vincular FYNE-XXXX-XXXX',
  category: 'utils',

  async run({ sock, msg, args }) {
    const groupId = msg.key.remoteJid;
    const code = String(args[0] || '').trim().toUpperCase();
    if (!/^FYNE-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
      return sock.sendMessage(groupId, { text: '❌ Código inválido. Abra o Portal FYNE, copie o comando completo e envie novamente.' }, { quoted: msg });
    }

    const identity = messageIdentity(msg);
    if (!identity.lid) {
      return sock.sendMessage(groupId, { text: '❌ Não consegui identificar seu LID do WhatsApp nesta mensagem. Atualize o bot e tente novamente.' }, { quoted: msg });
    }

    await sock.sendMessage(groupId, { react: { text: '⏳', key: msg.key } });
    try {
      const metadata = groupId.endsWith('@g.us') ? await sock.groupMetadata(groupId).catch(() => null) : null;
      const participant = metadata?.participants?.find(p => p.id === identity.lid);
      const displayName = msg.pushName || participant?.notify || participant?.name || `FYNE ${identity.lid.split('@')[0].slice(-4)}`;
      const avatar = await avatarData(sock, identity.lid);
      const result = await confirmFyneLink({
        code,
        whatsapp_lid: identity.lid,
        phone_jid: identity.phoneJid,
        display_name: displayName,
        avatar_data: avatar,
        profile: profileSnapshot(groupId, identity.lid, metadata?.subject),
      });

      await sock.sendMessage(groupId, {
        text: `✅ *Conta FYNE vinculada!*\n\nOlá, *${displayName}*. Volte ao navegador: seu perfil será aberto automaticamente.\n\n${result.profile_url || ''}`.trim(),
      }, { quoted: msg });
      await sock.sendMessage(groupId, { react: { text: '✅', key: msg.key } });
    } catch (error) {
      console.error('Erro ao vincular conta FYNE:', error);
      await sock.sendMessage(groupId, { text: `❌ Não foi possível vincular a conta.\n\n${error.message}` }, { quoted: msg });
      await sock.sendMessage(groupId, { react: { text: '❌', key: msg.key } });
    }
  },
};
