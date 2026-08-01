import { getFyneProfile } from '../../services/fyneApi.js';
import { renderFyneProfileCard } from '../../utils/fyneProfileCard.js';

function identity(msg){
 const ids=[msg.key?.participant,msg.key?.participantAlt,msg.key?.remoteJid,msg.key?.remoteJidAlt].filter(Boolean);
 return ids.find(id=>id.endsWith('@lid'))||null;
}
export default {
 name:'fyne', aliases:[], description:'Acessa os recursos da conta FYNE', usage:'fyne perfil', category:'utils',
 async run({sock,msg,args}){
  const jid=msg.key.remoteJid,sub=String(args[0]||'').toLowerCase();
  if(sub!=='perfil') return sock.sendMessage(jid,{text:'*FYNE*\n\nUse:\n> !fyne perfil\n\nEm breve: FYNE AI e novos recursos.'},{quoted:msg});
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