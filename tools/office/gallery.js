// Test page script: draws every mascot pose in a grid instead of running the office (run.sh gallery),
// both frames of each; ?set=held draws the props in hand instead (run.sh gallery held), ?set=looks
// every accessory in each state, on a light and dark checkerboard (run.sh gallery looks); ?set=motion
// film strips of the springs, left to right, 1 frame every 50 ms (run.sh gallery motion).
'use strict';
startThemes();resize();
const SET=(location.search.match(/set=(\w+)/)||[])[1]||'poses';
const POSES=['stand','walk','type','sit','read','sip','wave','cheer','juggle','talk','water','look','sleep','dance','clap','game','eat','hold','fold','rps','dangle','yoga','float','hug','highfive','pet','press','stretch','catch','slump'];
// [label, pose, frame, held, extra]
const HELD=[['mug',  'sip',0,{kind:'mug',fill:1}],['sip','sip',1,{kind:'mug',fill:.6}],['tea','sip',0,{kind:'teacup'}],['tea sip','sip',1,{kind:'teacup'}],
  ['cookie','eat',0,{kind:'cookie',bites:0}],['bite','eat',1,{kind:'cookie',bites:2}],['donut','eat',0,{kind:'donut'}],['munch','eat',1,{kind:'donut'}],
  ['flower','hold',0,{kind:'flower'}],['sniff','hold',0,{kind:'flower'},{lift:4,mood:'sleep'}],['gift','hold',0,{kind:'gift'}],['opened','hold',0,{kind:'gift',open:true}],
  ['ball','hold',0,{kind:'ball'}],['file','walk',0,null,{carry:'#4FA3E0'}],['file 2','walk',1,null,{carry:'#E0B04A'}],['read','read',1],['game','game',1],['fold','fold',1],['water','water',1],['catch','catch',1]];
const gx=wx;gx.fillStyle='#C08A5C';gx.fillRect(0,0,W,H);
const cell=(i,label,o)=>{const x=14+(i%10)*31,y=42+Math.floor(i/10)*56;
  gx.fillStyle='rgba(0,0,0,.08)';gx.fillRect(x-14,y-38,28,48);
  const air=(o.pose==='dangle'||o.pose==='float')?7:0;
  drawPerson(gx,x,y-air,Object.assign({look:LOOKS[i%LOOKS.length],dir:1,air},o));
  pixText(gx,label.slice(0,7),x-13,y+4,'#00132F');};
const STATES=[{},{dir:-1},{pose:'look'},{mood:'surprised'},{pose:'sleep'},{mood:'happy'},{mood:'dead'}];
// [look, pose, head path (t in s -> x, y offset), raise target, lift target, held, mood at t]
const hop=t=>[0,t>.1&&t<.45?-Math.round(Math.sin((t-.1)/.35*Math.PI)*6):0],stop=t=>[Math.round(Math.min(t,.2)*60),0],still=()=>[0,0];
const FILMS=[[7,'cheer',hop,0,0],[3,'cheer',hop,0,0],[9,'stand',still,0,0,null,t=>t>.1?'surprised':null],[2,'stand',stop,0,0],[6,'stand',stop,0,0],
  [4,'sip',still,1,0,{kind:'mug',fill:.6}],[5,'eat',still,1,0,{kind:'cookie',bites:1}],[6,'hold',still,0,4,{kind:'flower'}]];
if(SET==='motion'){gx.fillStyle='#E8DCC8';gx.fillRect(0,0,W,H);
  FILMS.forEach(([style,pose,path,raise,lift,held,mood],j)=>{const ch={},look=LOOKS.find(l=>l.style===style);
    for(let i=0;i<13;i++){const t=i*.05;let tr;for(let k=0;k<5;k++){const q=t+k*.01,[dx,dy]=path(q);tr=trailOf(ch,50+dx,50+dy,pose,mood&&mood(q),q>.1?raise:0,q>.1?lift:0,1000+q*1000);}
      const [dx,dy]=path(t);drawPerson(gx,12+i*24+dx/4,27+j*22+dy,{look,pose,dir:1,frame:1,sway:Math.round(tr.x),pop:Math.round(-tr.y),raise:tr.raise,lift:Math.round(tr.lift),mood:mood&&mood(t),held:held?{...held}:null});}});}
else if(SET==='looks')STATES.forEach((st,j)=>LOOKS.forEach((look,i)=>{
  gx.fillStyle=(i+j)%2?'#10131C':'#E8DCC8';gx.fillRect(i*32,j*25,32,25);
  drawPerson(gx,16+i*32,23+j*25,Object.assign({look,pose:'stand',dir:1,frame:1},st));}));
else if(SET==='held')HELD.forEach(([label,pose,frame,held,extra],i)=>cell(i,label,Object.assign({pose,frame,held:held?{...held}:null},extra||{})));
else POSES.forEach((p,i)=>cell(i,p,{pose:p,frame:1,mood:p==='dance'?'happy':null}));
console.log('GALLERY OK');
