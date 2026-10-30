// Small pixel sprites: role icons, badges, stars, planes, folders.
'use strict';
function drawPlane(g,x,y,dir){
  x=Math.round(x);y=Math.round(y);
  if(dir>0){R(g,x-3,y-1,5,1,'#FFFFFF');R(g,x-2,y,4,1,'#FFFFFF');R(g,x+2,y,1,1,'#FFFFFF');R(g,x-3,y+1,3,1,'#C9D3E3');}
  else{R(g,x-1,y-1,5,1,'#FFFFFF');R(g,x-1,y,4,1,'#FFFFFF');R(g,x-2,y,1,1,'#FFFFFF');R(g,x+1,y+1,3,1,'#C9D3E3');}
}
// 7x7 icons: a role read from the desk's name, a tool, or a plain symbol; quest and skull are badges.
const ICONS={
  crown:['.......','1..1..1','1.111.1','1111111','1111111','.......','1111111'],
  code:['.......','....1..','.1..11.','1..1..1','.11..1.','..1....','.......'],
  palette:['.11111.','1.1.111','1111111','1.111..','11111..','1111111','.11111.'],
  pencil:['.....11','....1.1','...111.','..111..','.111...','.11....','1......'],
  bug:['1.....1','.1.1.1.','..111..','1111111','.11.11.','1111111','..111..'],
  magnifier:['.111...','1...1..','1...1..','1...1..','.111...','....11.','.....11'],
  book:['.......','11...11','111.111','1.1.1.1','111.111','.11.11.','...1...'],
  chart:['.....1.','.....1.','...1.1.','...1.1.','.1.1.1.','.1.1.1.','1111111'],
  rocket:['...1...','..111..','..1.1..','..111..','.11111.','1111111','.1...1.'],
  lock:['.11111.','.1...1.','1111111','111.111','111.111','1111111','.......'],
  puzzle:['.111...','.111...','11111..','1111111','1111111','11111..','11111..'],
  radar:['.11111.','1...111','1..11.1','1..1..1','1.....1','1.1...1','.11111.'],
  lamp:['.11111.','.11111.','1111111','...1...','...1...','..111..','.......'],
  flask:['.11111.','..1.1..','..1.1..','.1...1.','1.111.1','1111111','.11111.'],
  note:['..11111','..1...1','..1...1','..1...1','111.111','111.111','.......'],
  mail:['.......','1111111','11...11','1.1.1.1','1..1..1','1111111','.......'],
  hammer:['.11111.','.11111.','...1...','...1...','...1...','...1...','...1...'],
  commit:['...1...','...1...','..111..','.11.11.','..111..','...1...','...1...'],
  arrow:['...1...','..111..','.11111.','...1...','...1...','...1...','...1...'],
  press:['1111111','...1...','.1.1.1.','..111..','1111111','1111111','.......'],
  cross:['1.....1','.1...1.','..1.1..','...1...','..1.1..','.1...1.','1.....1'],
  noway:['..111..','.1...1.','1...1.1','1..1..1','1.1...1','.1...1.','..111..'],
  check:['.......','......1','.....1.','1...1..','.1.1...','..1....','.......'],
  box:['1111111','1.....1','1111111','1..1..1','1..1..1','1.....1','1111111'],
  alarm:['1.111.1','.1...1.','1..1..1','1..11.1','1.....1','.1...1.','..111..'],
  star:['...1...','...1...','1111111','.11111.','..111..','.11.11.','.1...1.'],
  heart:['.......','.11.11.','1111111','1111111','.11111.','..111..','...1...'],
  bolt:['...111.','..111..','.11111.','...11..','..11...','.11....','1......'],
  leaf:['....111','..11111','.111.11','.11.111','.1.111.','1.11...','1......'],
  moon:['..111..','.11....','11.....','11.....','11.....','.11....','..111..'],
  diamond:['.......','.11111.','1.1.1.1','1111111','.1.1.1.','..1.1..','...1...'],
  sun:['...1...','.1.1.1.','..111..','1111111','..111..','.1.1.1.','...1...'],
  quest:['.11111.','11...11','....11.','...11..','...11..','.......','...11..'],
  skull:['.11111.','1111111','1..1..1','1111111','.11.11.','.11111.','.1.1.1.']
};
// What a desk's name says about its role, French or English, accents ignored; the first match wins.
const ICON_WORDS=[
  [/devops|deploy|release|ship|launch|infra|\bops\b|\bci\b/,'rocket'],
  [/ceo|boss|lead|chef|manag|direct|\bpm\b|owner/,'crown'],
  [/mission|control|monitor|watch|surveil/,'radar'],
  [/\bmod|plugin|extension|addon/,'puzzle'],
  [/decor|interior/,'lamp'],
  [/design|\bart|\bui\b|\bux\b|graph|illustr/,'palette'],
  [/writ|redac|copy|\bdoc|edit|blog|content|auteur/,'pencil'],
  [/bug|\bqa\b|fix/,'bug'],
  [/test|experi|\blab|proto/,'flask'],
  [/review|relect|audit|inspect/,'magnifier'],
  [/research|recherche|learn|study|wiki|read|lecture/,'book'],
  [/data|analy|stat|metric|seo|market/,'chart'],
  [/secur|auth|pentest|privacy/,'lock'],
  [/music|musique|audio|\bson\b|sound/,'note'],
  [/mail|inbox|courrier|support|contact/,'mail'],
  [/dev|code|eng|build|back|front|api|cto|program/,'code'],
];
const NEUTRAL_ICONS=['star','heart','bolt','leaf','moon','diamond','sun'];
// Every desk in the room gets its own icon: the role its name names, else the next free one, else a
// plain symbol picked from its id. Desks earlier in the room keep theirs when a later one would clash.
let iconMemo={k:null,m:new Map()};
function deskIcons(){
  const k=desks.map(d=>d.id+':'+d.name).join('|');if(k===iconMemo.k)return iconMemo.m;
  const m=new Map(),used=new Set();
  desks.forEach(d=>{
    const n=String(d.name||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase(),s=hash(String(d.id));
    const pool=ICON_WORDS.filter(([re])=>re.test(n)).map(([,ic])=>ic).concat(NEUTRAL_ICONS.map((_,i)=>NEUTRAL_ICONS[(s+i)%NEUTRAL_ICONS.length]));
    const ic=pool.find(i=>!used.has(i))||pool[0];used.add(ic);m.set(String(d.id),ic);
  });
  iconMemo={k,m};return m;
}
function iconFor(dk){return deskIcons().get(String(dk&&dk.id))||'star';}
function drawIcon(g,name,x,y,col){const rows=ICONS[name];rows.forEach((r,j)=>{for(let i=0;i<r.length;i++)if(r[i]==='1')R(g,x+i,y+j,1,1,col);});return {w:rows[0].length,h:rows.length};}
function drawBadge(g,name,cx,top,col,tp,id){
  const ic=ICONS[name],w=ic[0].length+4,h=ic.length+4,bob=Math.round(Math.sin(tp/380+(hash(id)%7))*1);
  const x=Math.round(cx-w/2),y=Math.round(top-h-2+bob);
  R(g,x+1,y,w-2,h,NAVY);R(g,x,y+1,w,h-2,NAVY);
  R(g,x+1,y,w-2,1,col);R(g,x+1,y+h-1,w-2,1,col);R(g,x,y+1,1,h-2,col);R(g,x+w-1,y+1,1,h-2,col);
  R(g,Math.round(cx)-1,y+h,2,1,col);
  drawIcon(g,name,x+2,y+2,'#FFFFFF');
}
const STAR=['...1...','...1...','.11111.','..111..','..1.1..','.1...1.'];
function drawStar(g,cx,y,col){STAR.forEach((r,j)=>{for(let i=0;i<7;i++)if(r[i]==='1')R(g,cx-3+i,y+j,1,1,col);});}
const PLANE_R=['1.......','111.....','.11111..','..111111','.11111..','111.....','1.......'];
function drawPlaneBig(g,x,y,dir,col){
  x=Math.round(x)-4;y=Math.round(y)-3;
  PLANE_R.forEach((r,j)=>{for(let i=0;i<8;i++){if(r[i]!=='1')continue;const xx=dir>0?x+i:x+7-i;R(g,xx,y+j,1,1,j===3?shade(col,-.1):(j>3?'#C9D3E3':'#FFFFFF'));}});
}
function drawFolder(g,x,y,col,edit){R(g,x,y,4,1,shade(col,-.1));R(g,x,y+1,10,6,col);R(g,x+1,y+2,8,1,shade(col,.35));R(g,x,y+6,10,1,shade(col,-.3));if(edit)R(g,x+2,y-1,6,2,'#FFFFFF');}
