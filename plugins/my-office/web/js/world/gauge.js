// The usage gauge, top left of the wall: how much of the account's usage is left in the 5-hour and
// the weekly windows, and when each resets, from the freshest reading any desk reported (all sessions
// share one account). Running low raises the alarm: an amber frame at 20% left, a blinking red one at
// 5%, a skull and a darker room once a window is empty; each threshold crossed shakes the gauge and
// plays a short alarm (when the sound is on), and brings the gauge out for a moment if it is hidden.
// It has its own canvas over the room, so the lift leaves it where it is, and it slides out of the way.
'use strict';
const GAUGE={x:2,y:1,w:56,h:16}; // ends at y 16, clear of the shelf (y 18); the shelf slots start past it
const gcx=document.getElementById('gcv').getContext('2d'),gtx=document.getElementById('gtcv').getContext('2d'),gtip=document.getElementById('gtip');
let gaugeTip='',gaugePeekT=0;
const GAUGE_WIN=[['5H','fiveHour','fiveResets'],['7D','sevenDay','sevenResets']];
const DAYS=['SUN','MON','TUE','WED','THU','FRI','SAT'];
function latestRate(){let best=null;everyDesk.forEach(d=>{const r=d.rate;if(r&&(!best||r.ms>best.ms))best=r;});return best;}
// 0 fine, 1 low (20% left or less), 2 very low (5% or less), 3 empty
function usageLevel(left){return left<=.5?3:left<=5?2:left<=20?1:0;}
// each window as the gauge shows it: percent left, alarm level and reset time (null when not reported)
function gaugeWindows(){
  const r=latestRate();
  return GAUGE_WIN.map(([label,k,rk])=>{
    const used=r&&r[k];if(used==null)return {label,left:null,level:0,reset:NaN};
    const left=Math.max(0,Math.min(100,100-used)),reset=r[rk]?Date.parse(r[rk]):NaN;
    if(reset<=Date.now()&&r.ms<reset)return {label,left:100,level:0,reset:NaN}; // reset since this reading: full again, until a session reads it
    return {label,left,level:usageLevel(left),reset};
  });
}
function gaugeEmpty(){return gaugeWindows().some(w=>w.level===3);}
// a reset within the day reads as the time, a later one as the day and hour
function resetPix(ms,now){if(isNaN(ms))return '';if(ms-now<20*3600000)return hhmm(ms);const d=new Date(ms);return DAYS[d.getDay()]+' '+d.getHours();}
function resetWords(ms,now){if(isNaN(ms))return '';if(ms-now<20*3600000)return hhmm(ms);const d=DAYS[new Date(ms).getDay()];return d[0]+d.slice(1).toLowerCase()+' '+hhmm(ms);}

// Alarms: a window dropping to a worse level shakes the gauge and plays its alarm once. The first
// reading only sets the levels, so opening the page on a low gauge stays quiet.
let gaugeSeen=null,gaugeShakeUntil=0;
const ALARM={1:[660,520],2:[880,660,880],3:[440,330,220]};
function gaugeAlarm(level){if(!soundFor('usage'))return;(ALARM[level]||[]).forEach((f,i)=>setTimeout(()=>blip(f,level===3?.22:.12,'square'),i*(level===3?260:170)));}
function watchGauge(wins,tp){
  const lv=wins.map(w=>w.left==null?null:w.level);
  if(gaugeSeen){const worse=lv.reduce((m,l,i)=>l!=null&&gaugeSeen[i]!=null&&l>gaugeSeen[i]?Math.max(m,l):m,0);
    if(worse){gaugeShakeUntil=tp+700;gaugeAlarm(worse);document.body.classList.add('gpeek');clearTimeout(gaugePeekT);gaugePeekT=setTimeout(()=>document.body.classList.remove('gpeek'),6000);}}
  if(lv.some(l=>l!=null))gaugeSeen=lv;
}

// left = percent remaining; green above 20%, amber down to 5%, red (blinking) below
function gaugeColour(left,blink){return left>20?GREEN:left>5?AMBER:(blink?'#E5484D':'#8E2A2E');}
const SKULL=[14,21,31,14,10]; // 5 wide, bits from the left
function pixSkull(g,x,y,col){g.fillStyle=col;SKULL.forEach((b,j)=>{for(let i=0;i<5;i++)if(b&(16>>i))g.fillRect(x+i,y+j,1,1);});}
// The tab, on its own canvas so it stays out when the gauge slides away: same frame and ink as the
// gauge, and its arrow points where the gauge will go. It runs on under the gauge's edge (GAUGE y 4..13).
const TAB_ARROW=[2,1,0,0,1,2];
function drawTab(g,frame,bg,ink,shake){
  const away=document.body.classList.contains('nogauge')&&!document.body.classList.contains('gpeek');
  g.clearRect(0,0,g.canvas.width,g.canvas.height);
  g.save();g.translate(shake,0);
  R(g,-2,0,7,12,frame);R(g,-2,1,8,10,frame);R(g,-2,1,7,10,bg);
  TAB_ARROW.forEach((d,j)=>R(g,away?3-d:1+d,3+j,1,1,ink));
  g.restore();
}
function drawGauge(g,now,tp){
  const wins=gaugeWindows(),{x,y,w,h}=GAUGE,bg=TH.boardBg,showReset=Math.floor(tp/5000)%2,ink=readable(TH.boardInk,bg,4.5),dim=readable(TH.boardDim,bg,3);
  watchGauge(wins,tp);
  const worst=Math.max(...wins.map(v=>v.left==null?0:v.level)),blink=Math.floor(tp/(worst===3?250:400))%2;
  const frame=worst>=2?(blink?'#E5484D':'#8E2A2E'):worst===1?AMBER:TH.boardFrame;
  g.clearRect(0,0,g.canvas.width,g.canvas.height);
  const shake=tp<gaugeShakeUntil?Math.round(Math.sin(tp/22)*1.5):0;
  g.save();g.translate(shake,0);
  R(g,x+1,y,w-2,h,frame);R(g,x,y+1,w,h-2,frame);R(g,x+1,y+1,w-2,h-2,bg);R(g,x+w-1,y+3,1,10,bg);
  wins.forEach((v,i)=>{
    const ry=y+3+i*6,bx=x+12,bw=15;
    pixText(g,v.label,x+3,ry,v.level>=2?readable('#E5484D',bg,3):ink);
    R(g,bx,ry+1,bw,3,TH.boardOff);
    if(v.left==null){pixText(g,'?',bx+Math.floor(bw/2)-1,ry,dim);return;}
    if(v.level===3){if(blink)pixSkull(g,bx+5,ry,'#E5484D');}
    else{const fw=Math.max(1,Math.round(bw*v.left/100)),c=gaugeColour(v.left,blink);R(g,bx,ry+1,fw,3,c);R(g,bx,ry+1,fw,1,shade(c,.4));}
    // the percent left, and the reset time every other few seconds
    const t=showReset&&!isNaN(v.reset)?resetPix(v.reset,now):Math.round(v.left)+'%';
    pixText(g,t,x+w-3-pixWidth(t),ry,v.level>=2?readable('#E5484D',bg,3):showReset?dim:ink);
  });
  g.restore();
  // the tab shows how things stand even with the gauge away; hovering the gauge gives it in words
  drawTab(gtx,frame,bg,ink,shake);
  const tip=wins.map(v=>{const name=v.label==='5H'?'5-hour':'Weekly',when=resetWords(v.reset,now);return v.left==null?name+': no reading yet':`${name}: ${v.level===3?'empty':Math.round(v.left)+'% left'}${when?' · resets '+when:''}`;}).join('\n');
  if(tip!==gaugeTip){gaugeTip=tip;gtip.textContent=tip;}
}
// Label mode: the same reading in words, one pill per window just right of the gauge.
function drawGaugeText(now){
  const wins=gaugeWindows().filter(v=>v.left!=null),fs=Math.max(11,1.9*S*TS),px=PREFS.gauge?P(GAUGE.x+GAUGE.w)+22:P(8)+6;
  const at=(t,cy,o)=>{font(fs);const w=Math.min(P(150),ox.measureText(t).width+fs*1.1);pill(t,px+w/2,cy,fs,{...o,maxW:P(150)});};
  if(!wins.length){at('Usage: no reading yet',P(GAUGE.y+GAUGE.h/2),{bg:'rgba(0,19,47,.9)',border:'#5E7FA3'});return;}
  const STYLE=[{bg:'rgba(0,19,47,.92)',fg:'#FFFFFF',border:GREEN},{bg:'#5A3A06',fg:AMBER,border:AMBER},{bg:'#5A1A1C',fg:'#FFB0B0',border:'#E5484D'},{bg:'#5A1A1C',fg:'#FFB0B0',border:'#E5484D'}];
  wins.forEach((v,i)=>{
    const name=v.label==='5H'?'5-hour':'Weekly',when=resetWords(v.reset,now);
    const t=name+': '+(v.level===3?'empty':Math.round(v.left)+'% left')+(when?' · resets '+when:'');
    at(t,P(GAUGE.y+4.5+i*7),STYLE[v.level]);
  });
}
