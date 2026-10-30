// Theme "retro": registered with defineTheme, painted by themes/engine.js.
'use strict';
defineTheme('retro','claude',{name:'Corporate rétro',swatch:['#EDEDE6','#2F5D4E','#1E3A33','#E9E2CC'],dark:.32,beam:0,dust:null,
    catLook:'white',signLeds:'term',signSpan:[10,28],signGlow:true,window:'painting',desk:'pod',plantKind:'topiary',board:'term',
    wall:'#EDEDE6',stripe:'#EDEDE6',wallTop:'#F8F8F3',base:'#1E3A33',
    floorA:'#264D41',floorB:'#22463B',seam:'#22463B',grainA:'#2B5548',grainB:'#22463B',
    trim:'#E2DCC6',shelf:'#F8F8F3',shelfHi:'#FFFFFF',shelfLo:'#D9D9D0',
    doorKind:'pocket',doorHall:'#1E2A26',doorLight:'200,255,230',doorFrame:'#1E3A33',door:'#F2F2EC',doorPanel:'#E6E6DE',doorPanelHi:'#F8F8F3',knob:'#9A9484',sign:'#1E3A33',signLine:'#8EF0C8',
    clockRim:'#1E2A26',clockRing:'#E9E2CC',clockFace:'#FFFFFF',ink:'#1E2A26',
    deskTop:'#F7F7F2',deskTopHi:'#FFFFFF',deskLine:'#2B5648',partition:'#5E9C82',partitionHi:'#86C2A6',
    chair:'#7E8690',chairHi:'#A2AAB4',chairLeg:'#1C2024',
    boardFrame:'#E2DCC6',boardBg:'#0F2A26',boardOff:'#1E4A42',boardInk:'#8EF0C8',boardDim:'#4E8C78',
    cabinetKind:'catalog',cabinet:'#E2DED2',cabinetHi:'#F2EFE6',drawer:'#D6D2C5',machineKind:'terminal',machine:'#D9D3BF',machineHi:'#EDE8D8',
    coffeeKind:'capsule',counter:'#F2F2EC',counterHi:'#FFFFFF',counterFront:'#E2E2DA',coffee:'#22262B',coffeeHi:'#3A4048',mug:'#3E7A63',
    pot:'#F2F2EC',potHi:'#FFFFFF',leafA:'#3E6B57',leafB:'#5A8A70',leafC:'#4A7A62',stem:'#2B5648',
    lampShade:'#E9E2CC',lampPole:'#9A9484',lampGlow:'255,250,235',ball:'#3E7A63',ol:'#0B1612',
    wallPaint:plainWall,floorPaint:g=>carpet(g,TH,true),
    parts:{
      rug:null,sill:null,
      door(d,T){R(d,3,38,25,46,T.doorFrame);R(d,5,40,21,44,T.door);R(d,22,58,2,6,T.knob);R(d,24,50,2,3,'#1E2A26');R(d,24,50,1,1,'#8EF0C8');},
      sign(d,T){R(d,1,30,29,7,T.sign);R(d,1,36,29,1,T.signLine);},
      plant:null,fixtures:null,
    },
    wallDecor(g){R(g,0,3,W,1,'#FFFFFF');},
    live(g,tp){const n=nightness(Date.now());[48,112,208,272].forEach((x,i)=>{const on=n<.5||i%2===0;R(g,x-14,0,28,2,'#D9D9D0');R(g,x-13,1,26,1,on?'#FFFFF8':'#B8B8B0');});},
    liveLights(Ls){const n=nightness(Date.now());[48,112,208,272].forEach((x,i)=>{if(n<.5||i%2===0)Ls.push({x,y:4,r:40,a:.8,c:'250,255,245'});});},
  });
function plainWall(g,T){
  R(g,0,0,W,84,T.wall); R(g,0,0,W,3,T.wallTop); R(g,0,3,W,1,shade(T.wallTop,-.08));
  R(g,0,81,W,3,T.base); R(g,0,81,W,1,shade(T.base,.2)); R(g,0,83,W,2,shade(T.base,-.25));
}
