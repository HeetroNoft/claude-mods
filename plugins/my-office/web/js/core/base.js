// Constants, the two canvases, and drawing helpers every other script uses.
'use strict';
/* ---------- constants ---------- */
const W=320,H=180,SEAT_Y=108,WALK_Y=134,DOOR={x:14,y:91};
const MONO='ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const NAVY='#00132F',ORANGE='#D97557',GREEN='#5BD08A',AMBER='#FFB547',MUTED='#9FB0C8';
// Claude mascot variants: the first desk is always the plain orange one.
// style: 0 plain, 1 headphones, 2 antenna, 3 beanie, 4 glasses, 5 bow,
// 6 sprout, 7 top hat, 8 cap, 9 chef hat
const LOOKS=[
  {c:'#D97557',style:0},
  {c:'#2A9D8F',style:1},
  {c:'#8E6CCF',style:2},
  {c:'#E0B04A',style:3},
  {c:'#4A8FE0',style:4},
  {c:'#E07AB0',style:5},
  {c:'#5FAE4E',style:6},
  {c:'#8C9BB0',style:7},
  {c:'#D9534F',style:8},
  {c:'#B5835A',style:9}
];
const STATION={asleep:'desk',read:'cabinet',edit:'desk',think:'desk',send:'desk',bash:'desk',web:'machine',agent:'door',idle:'coffee',gone:'exit',ask:'desk',limit:'desk',wait:'desk'};
const CONF=['#D97557','#2A9D8F','#8E6CCF','#E0B04A','#FFFFFF','#5BD08A'];
const GLYPHS='a{};<>/=+01xk#()$*';

/* ---------- canvas setup ---------- */
const stage=document.getElementById('stage');
const world=document.getElementById('world'),wx=world.getContext('2d');
const ov=document.getElementById('ov'),ox=ov.getContext('2d');
let S=5,dpr=1,cssW=1600,cssH=900;
const TS=1.6; // labels read at 1080 wide
let UI_SCALE=1; // the settings' compact buttons
// Game mode is the default: the room tells the story in pixels, with no words on screen.
// The tag button (or ?labels) shows names, plans and message text for anyone who wants them.
const Q=location.search+location.hash;
let LABELS=/labels/.test(Q);
if(/clean/.test(Q))document.body.classList.add('clean');
function resize(){
  const vw=window.innerWidth,vh=window.innerHeight;
  let w=Math.min(vw,vh*16/9); w=Math.max(320,Math.floor(w)); const h=Math.floor(w*9/16);
  stage.style.width=w+'px'; stage.style.height=h+'px';
  dpr=window.devicePixelRatio||1; ov.width=Math.round(w*dpr); ov.height=Math.round(h*dpr);
  cssW=w; cssH=h; S=w/W;
  stage.style.setProperty('--u',(w/1600*UI_SCALE).toFixed(4)); // buttons and item bar scale with the room (office.css)
  document.getElementById('card').style.fontSize=Math.max(11,Math.min(14,Math.round(w/95)))+'px';
}
window.addEventListener('resize',resize);

/* ---------- helpers ---------- */
function R(g,x,y,w,h,c){g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),w,h);}
function hexRgb(h){h=h.replace('#','');return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
function shade(h,a){const c=hexRgb(h).map(v=>Math.max(0,Math.min(255,Math.round(a<0?v*(1+a):v+(255-v)*a))));return '#'+c.map(v=>v.toString(16).padStart(2,'0')).join('');}
function rgba(h,a){const c=hexRgb(h);return `rgba(${c[0]},${c[1]},${c[2]},${a})`;}
function str(v,n){let s=(v==null?'':String(v)).replace(/\s+/g,' ').trim();if(n&&s.length>n)s=s.slice(0,n-1)+'…';return s;}
function norm(k){return String(k==null?'':k).toLowerCase().replace(/[^a-z0-9]/g,'');}
function keyMatch(a,b){return !!a&&!!b&&(a===b||a.startsWith(b)||b.startsWith(a));}
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function hhmm(ms){const d=new Date(ms);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');}
function dur(ms){ms=Math.max(0,ms);const s=Math.floor(ms/1000);if(s>=3600){return Math.floor(s/3600)+'h '+String(Math.floor(s%3600/60)).padStart(2,'0')+'m';}return Math.floor(s/60)+'m '+String(s%60).padStart(2,'0')+'s';}
// a duration in words, for label mode: "under a minute", "12 min", "1 h 05"
function about(ms){const m=Math.round(Math.max(0,ms)/60000);if(m<1)return 'under a minute';if(m<60)return m+' min';return Math.floor(m/60)+' h '+String(m%60).padStart(2,'0');}
const P=v=>v*S;
function font(fs){ox.font=`700 ${fs}px ${MONO}`;}
function wrap(s,maxW,n){const w=String(s||'').split(' ');const lines=[];let cur='';
  for(let i=0;i<w.length;i++){const t=cur?cur+' '+w[i]:w[i];
    if(ox.measureText(t).width<=maxW||!cur){cur=t;continue;}
    lines.push(cur);cur=w[i];if(lines.length===n-1){cur=w.slice(i).join(' ');break;}}
  if(cur)lines.push(cur);return lines.slice(0,n).map((l,i)=>i===n-1?fit(l,maxW):l);}
function fit(s,maxW){if(ox.measureText(s).width<=maxW)return s;while(s.length>1&&ox.measureText(s+'…').width>maxW)s=s.slice(0,-1);return s+'…';}
function rr(x,y,w,h,r){ox.beginPath();ox.moveTo(x+r,y);ox.lineTo(x+w-r,y);ox.quadraticCurveTo(x+w,y,x+w,y+r);ox.lineTo(x+w,y+h-r);ox.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ox.lineTo(x+r,y+h);ox.quadraticCurveTo(x,y+h,x,y+h-r);ox.lineTo(x,y+r);ox.quadraticCurveTo(x,y,x+r,y);ox.closePath();}
/* pill centred on (cx,cy) in css px. returns box */
function pill(text,cx,cy,fs,o){
  o=o||{}; font(fs); const padX=fs*.55,padY=fs*.3;
  const t=fit(text,(o.maxW||cssW*.4)-padX*2); const w=ox.measureText(t).width+padX*2,h=fs+padY*2;
  let x=cx-w/2; x=Math.max(3,Math.min(cssW-3-w,x)); const y=cy-h/2;
  ox.save(); if(o.alpha!=null)ox.globalAlpha=o.alpha;
  if(o.shadow!==false){ox.fillStyle='rgba(0,0,0,.25)';rr(x+1,y+2,w,h,h*.32);ox.fill();}
  ox.fillStyle=o.bg||'rgba(0,19,47,.92)'; rr(x,y,w,h,h*.32); ox.fill();
  if(o.border){ox.lineWidth=Math.max(1.5,fs*.14);ox.strokeStyle=o.border;ox.stroke();}
  ox.fillStyle=o.fg||'#fff'; ox.textAlign='center'; ox.textBaseline='middle'; ox.fillText(t,x+w/2,y+h/2+fs*.06);
  ox.restore(); return {x,y,w,h};
}
function text(t,x,y,fs,col,align,maxW){font(fs);if(maxW)t=fit(t,maxW);ox.fillStyle=col;ox.textAlign=align||'left';ox.textBaseline='middle';ox.fillText(t,x,y);}
// Contrast (WCAG): relative luminance of a #rrggbb colour, and the ratio between two colours.
function lum(h){return hexRgb(h).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);}
function contrast(a,b){const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
// A text colour nudged darker on a light background (lighter on a dark one) until it reaches `min`
// contrast, so any theme's text stays readable whatever colour a desk or a theme gives it.
const readCache=new Map();
function readable(fg,bg,min){
  min=min||4.5;const k=fg+bg+min;if(readCache.has(k))return readCache.get(k);
  let c=fg;const dark=lum(bg)>.35;for(let i=1;i<=10&&contrast(c,bg)<min;i++)c=shade(fg,dark?-i*.1:i*.1);
  readCache.set(k,c);return c;
}
