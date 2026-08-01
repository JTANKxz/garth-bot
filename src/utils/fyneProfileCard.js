import { createCanvas, loadImage } from 'canvas';

const COLORS = { purple:'#8b5cf6', blue:'#3b82f6', green:'#22c55e', pink:'#ec4899', orange:'#f97316', mono:'#a1a1aa' };
function round(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function fit(ctx,text,max,width){let size=max;while(size>28){ctx.font='700 '+size+'px Arial';if(ctx.measureText(text).width<=width)break;size-=2}return size}
function wrap(ctx,text,x,y,maxWidth,lineHeight,maxLines){const words=String(text||'').split(/\s+/);let line='',lines=[];for(const word of words){const test=line?line+' '+word:word;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=word}else line=test}if(line)lines.push(line);lines.slice(0,maxLines).forEach((v,i)=>ctx.fillText(v,x,y+i*lineHeight))}
export async function renderFyneProfileCard(profile){
 const canvas=createCanvas(1080,1080),ctx=canvas.getContext('2d'),accent=COLORS[profile.color]||COLORS.purple;
 const bg=ctx.createLinearGradient(0,0,1080,1080);bg.addColorStop(0,'#19171d');bg.addColorStop(1,'#080809');ctx.fillStyle=bg;ctx.fillRect(0,0,1080,1080);
 ctx.globalAlpha=.16;ctx.fillStyle=accent;ctx.beginPath();ctx.arc(920,80,330,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
 ctx.fillStyle=accent;round(ctx,68,0,220,8,4);ctx.fill();
 ctx.fillStyle='#fff';ctx.font='800 42px Arial';ctx.fillText('FYNE',72,90);ctx.fillStyle='#77717e';ctx.font='700 18px Arial';ctx.fillText('PERFIL DA COMUNIDADE',790,84);
 const ax=72,ay=190,size=250;ctx.save();ctx.beginPath();ctx.arc(ax+125,ay+125,125,0,Math.PI*2);ctx.clip();
 try{const avatar=await loadImage(profile.avatar_url);ctx.drawImage(avatar,ax,ay,size,size)}catch{ctx.fillStyle='#29222f';ctx.fillRect(ax,ay,size,size);ctx.fillStyle='#fff';ctx.font='700 72px Arial';ctx.textAlign='center';ctx.fillText(String(profile.name||'FY').slice(0,2).toUpperCase(),ax+125,ay+150);ctx.textAlign='left'}ctx.restore();
 ctx.strokeStyle='#111';ctx.lineWidth=14;ctx.beginPath();ctx.arc(ax+125,ay+125,125,0,Math.PI*2);ctx.stroke();
 ctx.fillStyle=accent;ctx.beginPath();ctx.arc(391,410,36,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.font='700 30px Arial';ctx.fillText('✓',376,421);
 ctx.fillStyle='#a98bd8';ctx.font='800 18px Arial';ctx.fillText(profile.is_founder?'FUNDADOR · MEMBRO VERIFICADO':'MEMBRO VERIFICADO',370,235);
 ctx.fillStyle='#fff';ctx.font='700 '+fit(ctx,profile.name,68,600)+'px Arial';ctx.fillText(profile.name,370,315);
 ctx.fillStyle='#888891';ctx.font='400 27px Arial';ctx.fillText('@'+profile.identifier,370,365);
 if(profile.bio){ctx.fillStyle='#d0d0d4';ctx.font='400 28px Arial';wrap(ctx,profile.bio,72,550,930,42,3)}
 ctx.fillStyle='#151517';round(ctx,72,700,936,150,28);ctx.fill();ctx.fillStyle=accent;round(ctx,72,700,8,150,4);ctx.fill();
 ctx.fillStyle='#77717e';ctx.font='700 17px Arial';ctx.fillText('COMUNIDADE',110,750);ctx.fillStyle='#fff';ctx.font='700 34px Arial';ctx.fillText(profile.group_name||'Comunidade FYNE',110,805);
 ctx.strokeStyle='#29272d';ctx.beginPath();ctx.moveTo(72,930);ctx.lineTo(1008,930);ctx.stroke();
 ctx.fillStyle='#747078';ctx.font='700 17px Arial';ctx.fillText('FYNE.ONLINE',72,990);ctx.fillStyle=accent;ctx.beginPath();ctx.arc(948,983,8,0,Math.PI*2);ctx.fill();ctx.fillStyle='#747078';ctx.fillText('ATIVO',968,990);
 return canvas.toBuffer('image/png');
}