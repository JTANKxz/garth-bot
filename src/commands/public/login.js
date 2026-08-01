import { createFyneLoginLink } from '../../services/fyneApi.js';
import { readJSON } from '../../utils/readJSON.js';
import { calculateLevel } from '../../features/progress/levelSystem.js';
import { getJobByKey } from '../../features/jobs/catalog.js';

function messageIdentity(msg) {
  const candidates = [msg.key?.participant, msg.key?.participantAlt, msg.key?.remoteJid, msg.key?.remoteJidAlt].filter(Boolean);
  return { lid: candidates.find(id => id.endsWith('@lid')) || null, phoneJid: candidates.find(id => id.endsWith('@s.whatsapp.net')) || null };
}
function profileSnapshot(groupId, lid, groupName) {
  const counts = readJSON('database/messageCounts.json') || {}, lucky = readJSON('database/lucky.json') || {}, jobs = readJSON('database/jobs.json') || {}, achievements = readJSON('database/conquistas.json') || {};
  const countData = counts[groupId]?.[lid] || {}, luckyData = lucky[groupId]?.[lid] || {}, jobData = jobs[groupId]?.[lid] || {}, progress = achievements[groupId]?.[lid] || {};
  const job = jobData.job ? getJobByKey(jobData.job) : null;
  return { level: calculateLevel(countData.xp || 0), xp: countData.xp || 0, money: luckyData.money || 0, achievements: Array.isArray(progress.achievements) ? progress.achievements.length : 0, job: job?.name || 'Desempregado', messages: countData.messages || 0, popularity: countData.popularity || 0, victories: countData.victories || 0, group_name: groupName || 'Grupo FYNE' };
}
async function avatarData(sock, lid) {
  try {
    const url = await sock.profilePictureUrl(lid, 'image'), response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    if (!/^image\/(jpeg|png|webp)$/.test(contentType)) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > 3 * 1024 * 1024) return null;
    return 'data:' + contentType + ';base64,' + buffer.toString('base64');
  } catch { return null; }
}
export default {
  name: 'login', aliases: ['site', 'portal', 'conta'], description: 'Envia no privado um link temporário para entrar no Portal FYNE', category: 'utils',
  async run({ sock, msg }) {
    const originJid = msg.key.remoteJid, identity = messageIdentity(msg);
    if (!identity.lid) return sock.sendMessage(originJid, { text: '❌ Não consegui identificar seu usuário do WhatsApp. Tente novamente em um grupo onde o bot esteja ativo.' }, { quoted: msg });
    await sock.sendMessage(originJid, { react: { text: '⏳', key: msg.key } });
    try {
      const metadata = originJid.endsWith('@g.us') ? await sock.groupMetadata(originJid).catch(() => null) : null;
      const participant = metadata?.participants?.find(p => p.id === identity.lid);
      const displayName = msg.pushName || participant?.notify || participant?.name || 'FYNE ' + identity.lid.split('@')[0].slice(-4);
      const result = await createFyneLoginLink({ whatsapp_lid: identity.lid, phone_jid: identity.phoneJid, display_name: displayName, avatar_data: await avatarData(sock, identity.lid), profile: profileSnapshot(originJid, identity.lid, metadata?.subject) });
      const privateJid = identity.phoneJid || identity.lid;
      await sock.sendMessage(privateJid, { text: '🔐 *SEU ACESSO À FYNE*\n\nOlá, *' + displayName + '*! Seu perfil já foi sincronizado.\n\nClique no link para entrar:\n' + result.login_url + '\n\n⏳ O link expira em 10 minutos e funciona uma única vez.\n🔒 Não encaminhe este link para ninguém.\n\nO e-mail é opcional e pode ser adicionado depois no perfil.' });
      if (originJid !== privateJid) await sock.sendMessage(originJid, { text: '✅ *' + displayName + '*, enviei seu link de acesso no privado.\n\nEle expira em 10 minutos. Confira a conversa com o bot.' }, { quoted: msg });
      await sock.sendMessage(originJid, { react: { text: '✅', key: msg.key } });
    } catch (error) {
      console.error('Erro ao criar login FYNE:', error);
      await sock.sendMessage(originJid, { text: '❌ Não foi possível criar seu acesso à FYNE.\n\n' + error.message }, { quoted: msg });
      await sock.sendMessage(originJid, { react: { text: '❌', key: msg.key } });
    }
  },
};