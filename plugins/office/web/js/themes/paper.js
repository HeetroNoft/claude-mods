// Theme "paper": registered with defineTheme, painted by themes/engine.js.
'use strict';
defineTheme('paper','pixel',{name:'Papeterie 2000',swatch:['#D6D0C2','#7C8796','#5C6B7A','#E8D9A8'],dark:.4,beam:.35,dust:null,
    window:'blinds',blinds:'#E8E2D0',sillPot:false,desk:'cubicle',catLook:'siamese',signLeds:'tag',doorKind:'swing',doorHall:'#4A505A',doorLight:'235,245,255',obstacles:[{x0:177,y0:147,x1:203,y1:162}], // the doughnut table: walked around
    plantKind:'ficus',smallPlant:'cactus',board:'white',
    wall:'#D6D0C2',stripe:'#CEC7B8',wallTop:'#E9E6DE',base:'#5C5F66',
    floorA:'#7C8796',floorB:'#717C8B',seam:'#6E7988',grainA:'#8893A2',grainB:'#717C8B',
    trim:'#E8E4DA',sill:'#C9C3B4',sillHi:'#DDD8CB',shelf:'#9AA0A8',shelfHi:'#B8BDC4',shelfLo:'#7C828A',
    doorFrame:'#8C8678',door:'#B9B2A2',doorPanel:'#AEA796',doorPanelHi:'#C4BDAD',knob:'#D9D9D9',sign:'#2B3A55',signLine:'#D9D9D9',
    clockRim:'#2A2E35',clockRing:'#C9C3B4',clockFace:'#FFFFFF',ink:'#2A2E35',
    deskTop:'#C9C3B4',deskTopHi:'#DDD8CB',deskFront:'#A8A293',deskLine:'#8C8678',partition:'#6E7C8C',partitionHi:'#8896A6',
    chair:'#3E4652',chairHi:'#566070',chairLeg:'#2A2E35',
    boardFrame:'#A9AEB5',boardBg:'#F7F7F2',boardOff:'#DCDCD4',boardInk:'#2B3A55',boardDim:'#9AA0A8',
    cabinetKind:'office',cabinet:'#9AA0A8',cabinetHi:'#B8BDC4',drawer:'#8A9098',machineKind:'desktop',machine:'#C9C3B4',machineHi:'#DDD8CB',
    coffeeKind:'office',counter:'#C9C3B4',counterHi:'#DDD8CB',counterFront:'#B3AD9E',coffee:'#2A2E35',coffeeHi:'#4A4F57',mug:'#2B5A9E',
    pot:'#B9B2A2',potHi:'#CEC7B8',leafA:'#3E7A4A',leafB:'#5A9A5E',leafC:'#4A8A54',stem:'#5A4A3A',
    lampShade:'#3A3F47',lampPole:'#2A2E35',lampGlow:'255,240,200',ball:'#E0B04A',ol:'#4A4740',
    sky:n=>skyOf(n,['#9EC3DB','#DCEAF2'],['#0E1630','#26315C']),
    view(g,tp,n){
      daySun(g,n,282,38,'#FFF1B8');nightSky(g,tp,n,280,38); // low enough to show under the raised blindsdrawClouds(g,tp,1-n*.85,'#FFFFFF');
      R(g,300,36,16,30,mix('#9AA3AE','#2E3440',n)); for(let y=38;y<56;y+=4)for(let x=302;x<314;x+=4)R(g,x,y,2,2,n>.4&&hash(x+'/'+y)%3?'#FFD27A':mix('#C9DCEB','#3A4250',n));
      R(g,276,54,40,12,mix('#8A8F96','#3A3E46',n));if(n>.4){g.fillStyle='rgba(255,220,140,.25)';g.fillRect(286,54,9,10);} for(let x=279;x<314;x+=7)R(g,x,58,1,6,'#E8E8E8');
      [['#B03A2E',281],['#2B5A9E',295],['#E8E2D0',302]].forEach(([c,x])=>{R(g,x,59,6,3,c);R(g,x+1,58,4,1,shade(c,.2));R(g,x+1,62,1,1,'#1E1E1E');R(g,x+4,62,1,1,'#1E1E1E');});
      R(g,290,44,1,14,'#5C5F66'); R(g,289,44,3,1,'#5C5F66');
    },
    wallPaint:officeWall,floorPaint:g=>carpet(g,TH,false),
    parts:{
      rug:null,
      door(d,T){R(d,3,38,25,46,T.doorFrame);R(d,5,40,21,44,T.door);R(d,8,44,4,18,'#9EC3DB');R(d,8,44,4,1,'#DCEAF2');R(d,21,62,3,2,T.knob);},
      sign(d,T){R(d,1,30,29,7,T.sign);R(d,1,36,29,1,T.signLine);},
    },
    decor(d,T){
      // a small round table with a box of doughnuts between the chat spots
      floorShadow(d,183,160,14); R(d,181,151,18,3,'#9AA0A8'); R(d,181,151,18,1,'#B8BDC4'); R(d,189,154,2,6,'#5C5F66'); R(d,185,159,10,1,'#5C5F66');
      R(d,183,149,12,2,'#F2D7DE'); R(d,183,149,12,1,'#FFFFFF'); drawProp(d,'donut',184,146); drawProp(d,'donut',189,147);
    },
    liveLights(Ls){[40,120,200,280].forEach(x=>Ls.push({x,y:4,r:34,a:.75,c:'240,245,255'}));},
    live(g,tp){
      // fluorescent tubes along the ceiling; one of them flickers now and then
      [40,120,200,280].forEach((x,i)=>{const off=i===2&&Math.sin(tp/97)>.92;R(g,x-12,0,24,2,'#B8BDC4');R(g,x-11,1,22,1,off?'#9AA0A8':'#FFFFF4');});
    },
  });
function officeWall(g,T){
  R(g,0,0,W,84,T.wall);
  for(let i=0;i<260;i++){const h=hash('w'+i);R(g,h%W,(h>>>9)%80,1,1,T.stripe);}
  R(g,0,0,W,2,T.wallTop); R(g,0,79,W,4,T.base); R(g,0,79,W,1,shade(T.base,.25)); R(g,0,83,W,2,shade(T.base,-.3));
}
