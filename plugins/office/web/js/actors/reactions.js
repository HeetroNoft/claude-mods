// Reactions: emotes, chat bubbles, dizzy stars, thought clouds, sound effects.
'use strict';
function drawZz(g,x,ht,tp){
  const k=(tp/1000)%3;
  for(let i=0;i<3;i++){const ph=(k+i)%3;const a=1-ph/3;g.globalAlpha=a;const zx=Math.round(x+3+ph*3),zy=Math.round(ht-3-ph*4),z=i===2?3:2;
    R(g,zx,zy,z+1,1,'#FFFFFF');R(g,zx+z-1,zy+1,1,z-1,'#FFFFFF');R(g,zx,zy+z,z+1,1,'#FFFFFF');}
  g.globalAlpha=1;
}
const SOFT='rgba(0,0,0,.25)'; // no outline: a soft shadow, down and left, lifts bubbles off the room
// A cloud rising from the head: two puffs, then the cloud, with dots that run round while it thinks.
// It takes the side with room, and an emote goes to the other one (see drawEmotes).
const CLOUD=['..www.www..','.wwwwwwwww.','wwwwwwwwwww','wwwwwwwwwww','.wwwwssww..','...ss......'];
function drawThought(g,ch,tp){
  if(!ch.thoughtAt)ch.thoughtAt=tp;
  const age=tp-ch.thoughtAt,top=Math.round(ch.bodyTop),d=ch.x+23>W?-1:1,x=Math.round(ch.x),b={L:0,T:1e9,bw:0,ol:'rgba(0,0,0,0)'},pal={w:'#FFFFFF',s:'#DDE2EA'},soft={w:SOFT,s:SOFT};
  ch.bubbleAt=tp;ch.bubbleD=d;
  const puff=(rows,px,py)=>{drawAcc(g,rows,soft,px-1,py+1,b);drawAcc(g,rows,pal,px,py,b);};
  puff(['w'],x+d*8,top-1);
  if(age>90)puff(['ww','ww'],d>0?x+9:x-10,top-4);
  if(age<180)return;
  const cx=d>0?x+9:x-19,cy=top-11-(age<260?-1:Math.round(Math.sin(tp/700)));
  puff(CLOUD,cx,cy);
  const n=Math.floor(tp/260)%4;
  for(let i=0;i<3;i++)R(g,cx+3+i*2,cy+2-(i===n?1:0),1,1,i===n?NAVY:'#8FA0B8');
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
// What two Claudes say to each other: a line, then its answer.
const CHAT_TALKS=[['quest','bulb'],['quest','excl'],['cup','heart'],['zap','star'],['note','smile'],['spark','star'],['bulb','zap'],['heart','smile']];
function drawEmo(g,icon,x,y,col){const E=EMO[icon];if(E)pattern(g,E.p,x,y,col||E.c);}
function emote(ch,icon){emotes.push({ch,icon,t0:performance.now()});}
function emoteAt(x,y,icon){emotes.push({x,y,icon,t0:performance.now()});}
function drawEmotes(g,tp){
  emotes=emotes.filter(e=>{const age=tp-e.t0;if(age>1400)return false;
    let x,y;if(e.ch){if(e.ch.hidden)return false;x=e.ch.x+(e.ch.bubbleAt===tp&&e.ch.bubbleD>0?-11:6);y=(e.ch.headTop!=null?e.ch.headTop:e.ch.y-18)-1;}else{x=e.x;y=e.y;}
    const E=EMO[e.icon];if(!E)return false;
    const ix=Math.round(x),iy=Math.round(y-E.p.length-Math.min(7,age/90)+(age<120?1:0));
    g.globalAlpha=age>1000?(1400-age)/400:1;
    drawEmo(g,e.icon,ix+1,iy+1,'rgba(0,0,0,.4)');drawEmo(g,e.icon,ix,iy);
    g.globalAlpha=1;return true;});
}
// Where a Claude's speech goes: beside its head on the side it talks to, or the other way if the room
// ends there. Worn hats do not move it: it hangs off the body, level with the other Claude's.
function speechBox(ch,d,w,h){
  const at=s=>Math.round(s>0?ch.x+8:ch.x-8-w);
  if(at(d)<3||at(d)+w>W-3)d=-d;
  return {x:at(d),y:Math.max(2,Math.round(ch.bodyTop-h-3)),w,h,d};
}
// In with an overshoot, out with a quick shrink, in steps so it stays on the pixel grid.
function bubbleScale(age,left){return left<50?.4:left<100?.75:age<50?.4:age<100?.75:age<170?1.15:1;}
function drawSpeechBox(g,x,y,w,h,d){
  R(g,x-1,y+2,1,h-2,SOFT);R(g,x,y+h,w-2,1,SOFT);
  R(g,x+1,y,w-2,h,'#FFFFFF');R(g,x,y+1,w,h-2,'#FFFFFF');R(g,x+1,y+h-1,w-2,1,'#DDE2EA');
  if(w<5)return;
  const tx=d>0?x+1:x+w-3; // the tail leans back to the speaker
  R(g,tx,y+h,2,1,'#DDE2EA');R(g,d>0?tx:tx+1,y+h+1,1,1,'#DDE2EA');
}
// The bubble of a line, age and left (ms) being how long it has been up and how long it stays. Returns
// its box once it is open, for what goes inside.
function speechFrame(g,ch,d,w,h,age,left,tp){
  const b=speechBox(ch,d,w,h),k=bubbleScale(age,left);
  ch.bubbleAt=tp;ch.bubbleD=b.d;
  const sw=Math.max(3,Math.round(w*k)),sh=Math.max(3,Math.round(h*k)),sx=b.d>0?b.x:b.x+w-sw,sy=b.y+h-sh-(k===1?Math.round((Math.sin(tp/420)+1)/2):0);
  drawSpeechBox(g,sx,sy,sw,sh,b.d);
  return k===1?{x:sx,y:sy}:null;
}
function drawSpeech(g,ch,d,icon,age,left,tp){
  const E=EMO[icon],iw=E.p[0].length,ih=E.p.length,w=Math.max(7,iw+2),h=Math.max(7,ih+2),f=speechFrame(g,ch,d,w,h,age,left,tp);
  if(!f)return;
  if(age<520){for(let i=0;i<3;i++)R(g,f.x+((w-5)>>1)+i*2,f.y+3-(Math.floor(tp/130)%3===i?1:0),1,1,NAVY);return;} // writing, then the word pops
  drawEmo(g,icon,f.x+((w-iw)>>1),f.y+((h-ih)>>1)-(age<620?1:0),E.c==='#FFFFFF'?NAVY:E.c);
}
// Rock, paper, scissors: both hands show at once, so each goes on the outer side, away from the other's.
function drawRps(g,ch,tp){
  const I=ch.idle;if(!I||I.act!=='rps'||I.phase!=='do'||!I.pair)return;
  const s=rpsState(ch,tp);if(!s||s.u<RPS_SHOW)return;
  const ic=RPS_ICONS[s.mine],f=speechFrame(g,ch,-(Math.sign(I.pair.x-ch.x)||1),7,7,s.u-RPS_SHOW,RPS_ROUND-s.u,tp);
  if(f)pattern(g,ic,f.x+((7-ic[0].length)>>1),f.y+((7-ic.length)>>1),s.win?'#2E8A57':s.lose?'#B03A2E':NAVY);
}
function drawChatBubble(g,ch,tp){
  const I=ch.idle;if(!I||I.act!=='chat'||I.phase!=='do'||!I.pair)return;
  const L=leadOf(ch);if(!L||!L.sync)return;
  const t=tp-L.sync,turn=Math.floor(t/1900),age=t-turn*1900;if(turn%2!==I.role||age>1590)return;
  const talk=CHAT_TALKS[hash(String(L===I?ch.id:I.pair.id)+(turn>>1))%CHAT_TALKS.length];
  drawSpeech(g,ch,Math.sign(I.pair.x-ch.x)||1,talk[turn&1],age,1590-age,tp);
}
function drawDizzy(g,x,ht,tp){for(let i=0;i<3;i++){const a=tp/220+i*2.094,px=Math.round(x+Math.cos(a)*8),py=Math.round(ht+3+Math.sin(a)*2);R(g,px-1,py,3,1,'rgba(255,216,74,.5)');R(g,px,py-1,1,3,'rgba(255,216,74,.5)');R(g,px,py,1,1,'#FFD84A');}}
function drawRing(g,x,y,c,tp){g.fillStyle=rgba(c,.5+.3*Math.sin(tp/180));x=Math.round(x);y=Math.round(y);g.fillRect(x-10,y,2,1);g.fillRect(x+8,y,2,1);g.fillRect(x-8,y+1,16,1);g.fillRect(x-8,y-1,16,1);}
function blip(f,d,type){if(!soundOn||!actx)return;try{const t=actx.currentTime,o=actx.createOscillator(),g=actx.createGain();o.type=type||'square';o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*1.3,t+d);g.gain.setValueAtTime(.05,t);g.gain.exponentialRampToValueAtTime(.001,t+d+.05);o.connect(g);g.connect(soundOut());o.start(t);o.stop(t+d+.06);}catch(e){}}
function purr(){blip(110,.25,'sawtooth');}
function knock(){blip(140,.05);setTimeout(()=>blip(140,.05),160);}
