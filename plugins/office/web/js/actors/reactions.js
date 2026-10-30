// Reactions: emotes, chat bubbles, dizzy stars, thought clouds, sound effects.
'use strict';
function drawZz(g,x,ht,tp){
  const k=(tp/1000)%3;
  for(let i=0;i<3;i++){const ph=(k+i)%3;const a=1-ph/3;g.globalAlpha=a;const zx=Math.round(x+3+ph*3),zy=Math.round(ht-3-ph*4),z=i===2?3:2;
    R(g,zx,zy,z+1,1,'#FFFFFF');R(g,zx+z-1,zy+1,1,z-1,'#FFFFFF');R(g,zx,zy+z,z+1,1,'#FFFFFF');}
  g.globalAlpha=1;
}
function drawThought(g,x,ht,tp){
  const bx=x+6,by=ht+2;
  R(g,x+4,by+7,1,1,'#FFFFFF'); R(g,x+5,by+6,2,1,'#FFFFFF');
  R(g,bx+1,by,11,6,'#FFFFFF'); R(g,bx,by+1,13,4,'#FFFFFF'); R(g,bx+1,by+6,11,0,'#FFFFFF');
  const n=Math.floor(tp/450)%4; for(let i=0;i<3;i++)if(i<n)R(g,bx+3+i*3,by+3,1,1,NAVY);
}
const EMO={
  heart:{c:'#FF4D8D',p:['.1.1.','11111','11111','.111.','..1..']},
  excl:{c:'#FFD84A',p:['1','1','1','.','1']},
  quest:{c:'#FFFFFF',p:['111','..1','.11','...','.1.']},
  note:{c:'#FFFFFF',p:['..11','..1.','..1.','111.','11..']},
  star:{c:'#FFD84A',p:['..1..','.111.','11111','.111.','.1.1.']},
  dots:{c:'#FFFFFF',p:['1.1.1']},
  sweat:{c:'#8CCBF5',p:['.1','11','11']},
  cup:{c:'#FFFFFF',p:['111.','1111','111.','.1..']},
  bulb:{c:'#FFD84A',p:['.111.','11111','11111','.111.','.1.1.']},
  smile:{c:'#2B2B33',p:['1...1','.....','1...1','.111.']},
  zap:{c:'#FFD84A',p:['..11','.11.','1111','.11.','11..']},
  spark:{c:'#D97557',p:SPARK}
};
const CHAT_ICONS=['heart','quest','excl','note','cup','bulb','smile','zap','spark','star'];
function drawEmo(g,icon,x,y,col){const E=EMO[icon];if(E)pattern(g,E.p,x,y,col||E.c);}
function emote(ch,icon){emotes.push({ch,icon,t0:performance.now()});}
function emoteAt(x,y,icon){emotes.push({x,y,icon,t0:performance.now()});}
function drawEmotes(g,tp){
  emotes=emotes.filter(e=>{const age=tp-e.t0;if(age>1400)return false;
    let x,y;if(e.ch){if(e.ch.hidden)return false;x=e.ch.x+6;y=(e.ch.headTop!=null?e.ch.headTop:e.ch.y-18)-1;}else{x=e.x;y=e.y;}
    const E=EMO[e.icon];if(!E)return false;
    const ix=Math.round(x),iy=Math.round(y-E.p.length-Math.min(7,age/90)+(age<120?1:0));
    g.globalAlpha=age>1000?(1400-age)/400:1;
    drawEmo(g,e.icon,ix+1,iy+1,'rgba(0,0,0,.4)');drawEmo(g,e.icon,ix,iy);
    g.globalAlpha=1;return true;});
}
function drawChatBubble(g,ch,tp){
  const I=ch.idle;if(!I||I.act!=='chat'||I.phase!=='do'||!I.pair||!speaking(ch,tp))return;
  const L=leadOf(ch),turn=Math.floor((tp-L.sync)/1900),icon=CHAT_ICONS[hash(String(L===I?ch.id:I.pair.id)+turn)%CHAT_ICONS.length];
  const d=Math.sign(I.pair.x-ch.x)||1,E=EMO[icon],w=E.p[0].length+4,h=E.p.length+4;
  const bx=Math.round(d>0?ch.x+8:ch.x-8-w),by=Math.round(ch.headTop-2);
  R(g,bx+1,by,w-2,h,'#FFFFFF');R(g,bx,by+1,w,h-2,'#FFFFFF');R(g,d>0?bx:bx+w-1,by+h-1,1,2,'#FFFFFF');
  drawEmo(g,icon,bx+2,by+2,E.c==='#FFFFFF'?NAVY:E.c);
}
function drawDizzy(g,x,ht,tp){for(let i=0;i<3;i++){const a=tp/220+i*2.094,px=Math.round(x+Math.cos(a)*8),py=Math.round(ht+3+Math.sin(a)*2);R(g,px-1,py,3,1,'rgba(255,216,74,.5)');R(g,px,py-1,1,3,'rgba(255,216,74,.5)');R(g,px,py,1,1,'#FFD84A');}}
function drawRing(g,x,y,c,tp){g.fillStyle=rgba(c,.5+.3*Math.sin(tp/180));x=Math.round(x);y=Math.round(y);g.fillRect(x-10,y,2,1);g.fillRect(x+8,y,2,1);g.fillRect(x-8,y+1,16,1);g.fillRect(x-8,y-1,16,1);}
function blip(f,d,type){if(!soundOn||!actx)return;try{const t=actx.currentTime,o=actx.createOscillator(),g=actx.createGain();o.type=type||'square';o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*1.3,t+d);g.gain.setValueAtTime(.05,t);g.gain.exponentialRampToValueAtTime(.001,t+d+.05);o.connect(g);g.connect(soundOut());o.start(t);o.stop(t+d+.06);}catch(e){}}
function purr(){blip(110,.25,'sawtooth');}
function knock(){blip(140,.05);setTimeout(()=>blip(140,.05),160);}
