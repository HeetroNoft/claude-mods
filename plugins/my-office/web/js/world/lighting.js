// Night: darkness with holes around lamps, screens and windows, plus string lights and neon.
'use strict';
function wireY(x){const u=(x%40)/40;return 26+Math.round(Math.sin(Math.PI*u)*2);}
function drawStringWire(g){for(let x=2;x<266;x++)R(g,x,wireY(x),1,1,'#2A1E1A');}
function drawBulbs(g,tp){const C=['#FFB547','#FF6B6B','#7FD1FF','#9BE37B','#FFD84A'];
  for(let x=6,i=0;x<264;x+=9,i++){const y=wireY(x)+1,on=.6+.4*Math.sin(tp/500+i*1.3),c=C[i%C.length];g.globalAlpha=on*.35;R(g,x-1,y-1,3,4,c);g.globalAlpha=on;R(g,x,y,1,2,c);g.globalAlpha=1;}}
function drawNeon(g,tp){
  for(let x=0;x<W;x+=80){const k=(x/80)%2,c=k?'#FF3DCB':'#2DE2E6';if((Math.floor(tp/90)+x)%61===0)continue;
    // the strip stops at the door frame (x 3..27) and starts again after it
    (x?[[x,80]]:[[0,3],[28,52]]).forEach(([a,w])=>{R(g,a,69,w,1,c);g.fillStyle=k?'rgba(255,61,203,.28)':'rgba(45,226,230,.28)';g.fillRect(a,68,w,1);g.fillRect(a,70,w,1);});}
  g.fillStyle=`rgba(255,61,203,${.5+.3*Math.sin(tp/400)})`;g.fillRect(0,29,32,1);g.fillRect(0,37,32,1);g.fillRect(0,30,1,7);g.fillRect(31,30,1,7);
}
const lc=document.createElement('canvas');lc.width=W;lc.height=H;const lx=lc.getContext('2d');
function collectLights(tp,n,doorOpen){
  const Ls=[],xs=deskXs(desks.length),T=TH;
  desks.forEach((dk,i)=>{const x=xs[i];if(dk.activity==='gone')return;
    if(!lampOff.has(String(dk.id)))Ls.push({x:x+13,y:100,r:34,a:.95,c:T.lampGlow});
    const ch=chars.get(String(dk.id));if(ch&&!ch.hidden&&ch.seated&&!ch.path.length)Ls.push({x,y:99,r:14,a:.7,c:'150,210,255'});});
  Ls.push({x:105,y:146,r:26,a:.8,c:T.screenGlow||'120,200,255'});
  Ls.push({x:COUNTER.x+17,y:150,r:tp<brewUntil?18:12,a:.6,c:'255,190,120'});
  if(n<1&&T.window!=='painting')Ls.push({x:295,y:58,r:52,a:.95*(1-n)*windowLight(),c:'255,246,220'});
  if(T.window==='painting'&&n>.3)Ls.push({x:295,y:30,r:20,a:.6,c:'255,225,160'}); // the picture lamp, above the frame
  else Ls.push({x:295,y:47,r:26,a:(T.neon?.55:.4)*Math.max(.25,windowLight()),c:T.neon?'160,90,255':'170,190,255'});
  if(doorAmt>.15)Ls.push({x:15,y:62,r:24,a:.7*doorAmt,c:TH.doorLight||'255,214,140'}); // the corridor's light through the open door
  if(T.lights)for(let x=6;x<264;x+=18)Ls.push({x,y:28,r:12,a:.45,c:'255,200,130'});
  if(T.neon)for(let x=20;x<W;x+=40)Ls.push({x,y:69,r:22,a:.5,c:(x/40|0)%2?'255,61,203':'45,226,230'});
  if(T.signGlow&&!LABELS)signSlots().forEach(l=>Ls.push({x:l.x+l.w/2,y:33,r:5,a:.85,c:hexRgb(l.c).join(',')})); // the door sign's lights
  if(cat&&!cat.away&&CAT_LOOKS[T.catLook]&&CAT_LOOKS[T.catLook].holo)Ls.push({x:cat.x,y:cat.y-cat.z-5,r:10,a:.7,c:'45,226,230'}); // the hologram cat glows
  if(T.liveLights)T.liveLights(Ls,tp);
  chars.forEach(ch=>{if(!ch.hidden&&ch.look.style===2&&ch.headTop!=null)Ls.push({x:ch.x,y:ch.headTop+2,r:9,a:.7,c:'255,216,74'});});
  return Ls;
}
function applyLighting(Ls,dark){
  lx.globalCompositeOperation='source-over';lx.clearRect(0,0,W,H);
  lx.fillStyle=`rgba(10,8,30,${dark})`;lx.fillRect(0,0,W,H);
  lx.globalCompositeOperation='destination-out';
  Ls.forEach(L=>{const gr=lx.createRadialGradient(L.x,L.y,0,L.x,L.y,L.r);gr.addColorStop(0,`rgba(0,0,0,${L.a})`);gr.addColorStop(.55,`rgba(0,0,0,${L.a*.5})`);gr.addColorStop(1,'rgba(0,0,0,0)');lx.fillStyle=gr;lx.fillRect(L.x-L.r,L.y-L.r,L.r*2,L.r*2);});
  lx.globalCompositeOperation='source-over';
  wx.drawImage(lc,0,0);
  wx.globalCompositeOperation='lighter';
  Ls.forEach(L=>{const gr=wx.createRadialGradient(L.x,L.y,0,L.x,L.y,L.r*.8);gr.addColorStop(0,`rgba(${L.c},${.16*dark/.5*L.a})`);gr.addColorStop(1,`rgba(${L.c},0)`);wx.fillStyle=gr;wx.fillRect(L.x-L.r,L.y-L.r,L.r*2,L.r*2);});
  wx.globalCompositeOperation='source-over';
}
