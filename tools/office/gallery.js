// Test page script: draws every mascot pose in a grid instead of running the office (run.sh gallery),
// both frames of each; ?set=held draws the props in hand instead (run.sh gallery held).
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
if(SET==='held')HELD.forEach(([label,pose,frame,held,extra],i)=>cell(i,label,Object.assign({pose,frame,held:held?{...held}:null},extra||{})));
else POSES.forEach((p,i)=>cell(i,p,{pose:p,frame:1,mood:p==='dance'?'happy':null}));
console.log('GALLERY OK');
