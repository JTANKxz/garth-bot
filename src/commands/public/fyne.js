import { getFyneProfile, linkFyneGroup, updateFyneGroup } from '../../services/fyneApi.js';
import { renderFyneProfileCard } from '../../utils/fyneProfileCard.js';
import { getBotConfig } from '../../config/botConfig.js';

function identity(msg){
 const ids=[msg.key?.participant,msg.key?.participantAlt,msg.key?.remoteJid,msg.key?.remoteJidAlt].filter(Boolean);
 return ids.find(id=>id.endsWith('@lid'))||null;
}


async function groupAvatarData(sock,jid){
 try{
  const url=await sock.profilePictureUrl(jid,'image');
  const response=await fetch(url,{signal:AbortSignal.timeout(10000)});
  if(!response.ok)return null;
  const type=response.headers.get('content-type')||'image/jpeg';
  if(!/^image\/(jpeg|png|webp)$/.test(type))return null;
  const buffer=Buffer.from(await response.arrayBuffer());
  if(buffer.length>3*1024*1024)return null;
  return 'data:'+type+';base64,'+buffer.toString('base64');
 }catch{return null}
}
async function groupPermission(sock,msg,jid){
 if(!jid.endsWith('@g.us'))return {ok:false,text:'Use este comando dentro do grupo.'};
 const metadata=await sock.groupMetadata(jid);
 const messageIds=[msg.key?.participant,msg.key?.participantAlt].filter(Boolean);
 const participant=metadata.participants?.find(item=>[item.id,item.lid,item.phoneNumber].filter(Boolean).some(id=>messageIds.includes(id)));
 const ids=[...new Set([...messageIds,participant?.id,participant?.lid,participant?.phoneNumber].filter(Boolean))];
 const owners=msg.groupConfig?.botOwners||[],creator=getBotConfig().botCreator;
 if(!ids.includes(creator)&&!ids.some(id=>owners.includes(id)))return {ok:false,text:'Somente o dono responsável pelo bot ou o criador oficial pode atualizar esta comunidade.'};
 return {ok:true,metadata};
}
async function updateCurrentGroup({sock,msg,jid}){
 try{
  const permission=await groupPermission(sock,msg,jid);
  if(!permission.ok)return sock.sendMessage(jid,{text:permission.text},{quoted:msg});
  const avatar=await groupAvatarData(sock,jid);
  const result=await updateFyneGroup({group_jid:jid,name:permission.metadata.subject,avatar_data:avatar});
  return sock.sendMessage(jid,{text:'Comunidade atualizada com sucesso.\n\n*'+result.group.name+'*\nNome e foto foram sincronizados.'},{quoted:msg});
 }catch(error){
  const text=error.status===404?'Esta comunidade ainda não foi vinculada. Use *!fyne grupo vincular* primeiro.':'Não foi possível atualizar a comunidade.\n\n'+error.message;
  return sock.sendMessage(jid,{text},{quoted:msg});
 }
}
async function linkCurrentGroup({sock,msg,jid}){
 if(!jid.endsWith('@g.us')) return sock.sendMessage(jid,{text:'Use este comando dentro do grupo que deseja vincular.'},{quoted:msg});
 const metadata=await sock.groupMetadata(jid);
 const messageIds=[msg.key?.participant,msg.key?.participantAlt].filter(Boolean);
 const participant=metadata.participants?.find(item=>[item.id,item.lid,item.phoneNumber].filter(Boolean).some(id=>messageIds.includes(id)));
 const ids=[...new Set([...messageIds,participant?.id,participant?.lid,participant?.phoneNumber].filter(Boolean))];
 const lid=ids.find(id=>id.endsWith('@lid'));
 const owners=msg.groupConfig?.botOwners||[];
 const creator=getBotConfig().botCreator;
 const isCreator=ids.includes(creator);
 if(!isCreator&&!ids.some(id=>owners.includes(id))) return sock.sendMessage(jid,{text:'Somente o dono responsável pelo bot ou o criador oficial pode vincular esta comunidade.'},{quoted:msg});
 const expires=Number(msg.groupConfig?.authExpiresAt||0);
 if(!expires||expires<=Date.now()) return sock.sendMessage(jid,{text:'A licença do bot neste grupo está expirada. Renove antes de vincular a comunidade.'},{quoted:msg});
 if(!lid) return sock.sendMessage(jid,{text:'Não consegui identificar seu LID. Use *!login* primeiro.'},{quoted:msg});
 try{

  const result=await linkFyneGroup({whatsapp_lid:lid,group:{jid,name:metadata.subject,member_count:metadata.participants?.length||0,rental_expires_at:new Date(expires).toISOString()}});
  return sock.sendMessage(jid,{text:'Comunidade vinculada com sucesso.\n\n*'+result.group.name+'*\n'+result.group.member_count+' membros\n\nEla aparecerá na seção *Fundador de* enquanto a licença estiver ativa.'},{quoted:msg});
 }catch(error){
  const text=error.status===404?'Você precisa criar sua conta FYNE primeiro. Use *!login*.':'Não foi possível vincular a comunidade.\n\n'+error.message;
  return sock.sendMessage(jid,{text},{quoted:msg});
 }
}
export default {
 name:'fyne', aliases:[], description:'Acessa os recursos da conta FYNE', usage:'fyne perfil', category:'utils',
 async run({sock,msg,args}){
  const jid=msg.key.remoteJid,sub=String(args[0]||'').toLowerCase();
  if(sub==='grupo' && String(args[1]||'').toLowerCase()==='vincular') return linkCurrentGroup({sock,msg,jid});
  if(sub==='grupo' && String(args[1]||'').toLowerCase()==='atualizar') return updateCurrentGroup({sock,msg,jid});
  if(sub!=='perfil') return sock.sendMessage(jid,{text:'*FYNE*\n\nUse:\n> !fyne perfil\n> !fyne grupo vincular\n\nEm breve: FYNE AI e novos recursos.'},{quoted:msg});
  const lid=identity(msg);
  if(!lid) return sock.sendMessage(jid,{text:'Não consegui identificar sua conta. Use *!login* primeiro.'},{quoted:msg});
  await sock.sendMessage(jid,{react:{text:'⏳',key:msg.key}});
  try{
   const result=await getFyneProfile(lid),profile=result.profile;
   const image=await renderFyneProfileCard(profile);
   await sock.sendMessage(jid,{image,caption:'*Perfil FYNE de '+profile.name+'*\n\n'+profile.public_url+'\n\nAbra o link para visualizar e compartilhar o perfil.'},{quoted:msg});
   await sock.sendMessage(jid,{react:{text:'✅',key:msg.key}});
  }catch(error){
   const text=error.status===404?'Você ainda não possui uma conta FYNE.\n\nUse *!login* para criar seu perfil e receber o acesso no privado.':'Não foi possível carregar seu perfil FYNE.\n\n'+error.message;
   await sock.sendMessage(jid,{text},{quoted:msg});
   await sock.sendMessage(jid,{react:{text:'❌',key:msg.key}});
  }
 }
};