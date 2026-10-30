// Theme "space": registered with defineTheme, painted by themes/engine.js.
'use strict';
// The planet out of the porthole is another world each season. A disc is painted pixel by pixel, with
// the night side down and to the left: the light comes from high on the right, as everywhere.
function planetDisc(g,cx,cy,r,paint){
  for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){
    if(x*x+y*y>r*r+r*.6)continue;
    const c=paint(x,y);R(g,cx+x,cy+y,1,1,x-y<-r*.7?shade(c,-.4):c);
  }
}
const orbit=(g,cx,cy,a,rx,ry,s,c)=>R(g,cx+Math.cos(a)*rx,cy+Math.sin(a)*ry,s,s,c);
const CRATERS=[[-3,-2,2.2],[3,2,2.4],[2,-4,1.3],[-2,4,1.4],[5,-1,1]];
const PLANETS={
  // spring: a living world, seas and turning continents under clouds, with a small moon
  spring(g,cx,cy,t){
    planetDisc(g,cx,cy,7,(x,y)=>{const u=Math.floor(x+t*.8);
      if(Math.sin((x+t*1.5)/3+y*1.7)>.88)return '#F2F8FA';
      return Math.sin(u/2.6+Math.sin(y/2)*1.4)+Math.sin(u/5.3+y/3)>.3?'#5FAE4E':'#3F7FC4';});
    orbit(g,cx,cy,t*.5,11,3,2,'#C9D3DE');
  },
  // summer: a banded giant inside a tilted ring, which passes behind it and then in front
  summer(g,cx,cy,t){
    const ring=front=>{for(let i=0;i<72;i++){const a=i/72*Math.PI*2,x=Math.cos(a)*13,y=Math.sin(a)*3+x*.2;if(Math.sin(a)>0===front)R(g,cx+x,cy+y,1,1,i%9<7?'#F2D2A8':'#B98A5E');}};
    ring(false);
    planetDisc(g,cx,cy,7,(x,y)=>['#E58A4A','#F2B872','#C8703A'][Math.floor((y+x*.2+20+Math.sin((x+t)/4)*.6)/2.5)%3]);
    ring(true);
  },
  // autumn: a dead rust world, pitted with craters, and two little moons
  autumn(g,cx,cy,t){
    planetDisc(g,cx,cy,7,(x,y)=>{for(const [a,b,r] of CRATERS){const d=Math.hypot(x-a,y-b);if(d<=r-.6)return '#7E3A2A';if(d<=r+.5)return '#D98A5A';}return '#B8603A';});
    orbit(g,cx,cy,t*.7,10,6,1,'#D9C2A8');orbit(g,cx,cy,-t*.35+2,12,4,2,'#8A6A58');
  },
  // winter: an ice world, cracked, with white poles, a glint and shards drifting round it
  winter(g,cx,cy,t){
    planetDisc(g,cx,cy,7,(x,y)=>{if(Math.abs(y)>4)return '#FFFFFF';return Math.abs(Math.sin(x/1.9+y/1.2))<.14||Math.abs(Math.sin(x/3.1-y/1.5))<.1?'#5FA8D6':'#CFEDF8';});
    if(Math.sin(t*2)>.5){R(g,cx+2,cy-5,3,1,'#FFFFFF');R(g,cx+3,cy-6,1,3,'#FFFFFF');}
    for(let i=0;i<4;i++)orbit(g,cx,cy,t*.3+i*1.6,11-i,4+i%2,1,'#BFE6F5');
  }
};
defineTheme('space','neon',{name:'Station spatiale',swatch:['#2A3446','#4FC3FF','#C7D0DB','#FF8A3D'],dark:.45,beam:0,dust:'space',neon:false,noWeather:true,
    moteCols:['200,220,255','120,200,255','255,255,255'],window:'porthole',sillPot:false,desk:'console',plantKind:'hydro',board:'holo',
    wall:'#2A3446',stripe:'#36425A',wallTop:'#1B2433',wainHi:'#4A5872',wain:'#222B3A',wainEdge:'#1B2433',panel:'#4A5872',panelEdge:'#1E2633',base:'#141A24',
    floorA:'#3A4558',floorB:'#46526A',seam:'#2A3344',grainA:'#3A4558',grainB:'#46526A',
    trim:'#7C8796',shelf:'#5A667A',shelfHi:'#7C8796',shelfLo:'#3A4558',
    catLook:'astro',signLeds:'led',signGlow:true,doorKind:'airlock',doorHall:'#0E1420',doorLight:'120,200,255',doorFrame:'#8A96A8',door:'#5E6B85',doorPanel:'#4E5A72',doorPanelHi:'#6A7894',knob:'#4FC3FF',sign:'#C7D0DB',signLine:'#4FC3FF',
    clockRim:'#7C8796',clockRing:'#141A24',clockFace:'#0B1626',ink:'#4FC3FF',
    deskTop:'#5A667A',deskTopHi:'#7C8796',deskFront:'#3A4558',deskLine:'#222B3A',laptop:'#C7D0DB',laptopHi:'#FFFFFF',logo:'#FF8A3D',
    chair:'#3A4558',chairHi:'#FF8A3D',chairLeg:'#1B2433',
    boardFrame:'#4FC3FF',boardBg:'#0B1626',boardOff:'#1A2E48',boardInk:'#9FE6FF',boardDim:'#4F7FA6',
    cabinetKind:'cryo',cabinet:'#5A667A',cabinetHi:'#7C8796',drawer:'#4A5872',machineKind:'console',machine:'#2A3446',machineHi:'#4FC3FF',
    coffeeKind:'dispenser',counter:'#5A667A',counterHi:'#7C8796',counterFront:'#46526A',coffee:'#1B2433',coffeeHi:'#2A3446',mug:'#FF8A3D',
    pot:'#7C8796',potHi:'#C7D0DB',leafA:'#3FAF7A',leafB:'#5BD08A',leafC:'#4CC080',stem:'#2E8A5A',
    lampShade:'#FF8A3D',lampPole:'#7C8796',lampGlow:'255,170,110',ball:'#4FC3FF',screenGlow:'79,195,255',ol:'#0E131C',
    sky:()=>['#02040C','#0A1430'],
    view(g,tp){
      for(let i=0;i<26;i++){const h=hash('s'+i);if(Math.sin(tp/600+i*1.3)>-.5)R(g,276+h%40,28+(h>>>8)%38,1,1,i%5?'#FFFFFF':'#9FE6FF');}
      PLANETS[SEASON](g,Math.round(295+Math.sin(tp/9000)*2),47,tp/1000);
      const sx=(tp/1000*14)%120;if(sx<60)R(g,320-sx,36,4,1,'#C7D0DB'),R(g,323-sx,36,2,1,'#FF8A3D');
    },
    wallPaint:metalWall,floorPaint:grating,
    parts:{
      sill:null,
      rug(d,T){R(d,163,142,56,24,'#1B2433');for(let x=164;x<218;x+=4){R(d,x,142,2,1,'#E0B04A');R(d,x,165,2,1,'#E0B04A');}
        R(d,167,146,48,16,'#2A3446');for(let x=171;x<213;x+=6)R(d,x,147,2,14,'#222B3A');R(d,189,150,4,8,'#4FC3FF');},
      door(d,T){R(d,3,38,25,46,T.doorFrame);R(d,5,40,21,44,T.door);R(d,15,40,1,44,'#1B2433');
        for(let y=40;y<84;y+=6){R(d,5,y,3,Math.min(3,84-y),'#E0B04A');if(y+3<84)R(d,23,y+3,3,Math.min(3,81-y),'#E0B04A');}R(d,9,58,4,4,T.doorPanelHi);R(d,18,58,4,4,T.doorPanelHi);},
      sign(d,T){R(d,1,30,29,7,T.sign);R(d,1,36,29,1,T.signLine);},
      plant(d,T){R(d,4,158,10,20,'rgba(160,220,255,.35)');R(d,4,158,10,1,'#C7D0DB');R(d,4,170,10,8,T.pot);R(d,7,160,2,10,T.leafA);R(d,9,162,2,8,T.leafB);},
    },
    live(g,tp){const on=Math.floor(tp/700)%2;R(g,14,35,3,2,on?'#FF5D5D':'#5A2020');R(g,14,35,3,1,on?'#FFB0A0':'#5A2020');},
    liveLights(Ls,tp){if(Math.floor(tp/700)%2)Ls.push({x:15,y:36,r:12,a:.8,c:'255,90,90'});Ls.push({x:191,y:154,r:20,a:.6,c:'79,195,255'});},
    extras(g){R(g,0,69,W,1,'#4FC3FF');}});
function metalWall(g,T){
  R(g,0,0,W,84,T.wall);
  for(let y=0;y<64;y+=21)for(let x=(y/21%2)*16;x<W;x+=32){R(g,x,y,32,1,T.panelEdge);R(g,x,y,1,21,T.panelEdge);R(g,x+1,y+1,30,1,T.stripe);
    R(g,x+3,y+3,1,1,T.panel);R(g,x+28,y+3,1,1,T.panel);R(g,x+3,y+17,1,1,T.panel);R(g,x+28,y+17,1,1,T.panel);}
  for(let x=0;x<W;x+=8){R(g,x,64,4,4,'#E0B04A');R(g,x+4,64,4,4,'#1B2433');}
  R(g,0,68,W,16,T.wain); R(g,0,68,W,1,T.wainHi);
  for(let x=6;x<W;x+=20)for(let k=0;k<3;k++)R(g,x,72+k*3,10,1,T.wainEdge);
  R(g,0,83,W,2,T.base);
}
function grating(g,T){
  R(g,0,85,W,H-85,T.floorA);
  for(let y=85;y<H;y+=10)for(let x=((y-85)/10%2)*10-20;x<W;x+=20){R(g,x,y,20,1,T.seam);R(g,x,y,1,10,T.seam);
    for(let k=0;k<3;k++)R(g,x+4+k*5,y+3+(k%2)*3,2,1,T.floorB);}
}
