// Theme "japan": registered with defineTheme, painted by themes/engine.js.
'use strict';
defineTheme('japan','pixel',{name:'Japon · ryokan',swatch:['#F3EAD7','#B03A2E','#6E8B5E','#2E2A26'],dark:.55,beam:.8,dust:'sun',
    window:'round',sillPot:false,petals:true,desk:'zen',catLook:'mike',signLeds:'lantern',signSpan:[4,26],doorKind:'shoji',doorHall:'#3E3226',doorLight:'255,200,140',plantKind:'bonsai',obstacles:[{x0:177,y0:147,x1:203,y1:162}],standing:[[178,145,24,14,159]], // the tea table: walked around
    board:'plank',
    wall:'#F3EAD7',stripe:'#DCCDAE',wallTop:'#4A3A2C',wainHi:'#7A5E44',wain:'#5A4330',wainEdge:'#4A3A2C',panelEdge:'#4D3828',base:'#2E2219',
    floorA:'#C9C38E',floorB:'#BDB680',seam:'#3E4A3A',grainA:'#C9C38E',grainB:'#BDB680',
    trim:'#5A4330',shelf:'#5A4330',shelfHi:'#7A5E44',shelfLo:'#3E2E22',knob:'#2E2A26',
    clockRim:'#3E2E22',clockRing:'#B03A2E',clockFace:'#F6EEDC',ink:'#2E2A26',
    deskTop:'#D9B98A',deskTopHi:'#E8CFA6',deskFront:'#2E2A26',deskLine:'#1E1A17',laptop:'#E8E2D6',laptopHi:'#FFFFFF',logo:'#B03A2E',
    chair:'#B03A2E',chairHi:'#C9584A',chairLeg:'#2E2A26',
    boardFrame:'#8A6A48',boardBg:'#E9D7B4',boardOff:'#D2BC94',boardInk:'#2E2A26',boardDim:'#9A8566',
    cabinetKind:'tansu',cabinet:'#5A3E2B',cabinetHi:'#7A563C',drawer:'#4D3424',machineKind:'zen',machine:'#2E2A26',machineHi:'#B03A2E',
    coffeeKind:'tea',counter:'#5A3E2B',counterHi:'#7A563C',counterFront:'#4D3424',coffee:'#2E2A26',coffeeHi:'#4A423A',mug:'#E8E0D0',
    pot:'#4A5A6A',potHi:'#5E7080',leafA:'#4E7F52',leafB:'#6E9E66',leafC:'#5E8E5C',stem:'#3E2E22',
    lampShade:'#F6EBD2',lampPole:'#2E2A26',lampGlow:'255,220,160',ball:'#B03A2E',ol:'#2E2219',
    view(g,tp,n){
      // sun and moon at (301..308, 34..38): inside the round window, above Fuji's peak, clear of the branch
      if(n<.9){g.globalAlpha=1-n;R(g,302,34,5,5,'#FFE8A8');R(g,301,35,7,3,'#FFE8A8');g.globalAlpha=1;}
      if(n>.1){g.globalAlpha=n;STARS.forEach((s,i)=>{if(i%2&&Math.sin(tp/700+i)>-.3)R(g,s[0],s[1],1,1,'#FFFFFF');});R(g,302,34,5,5,'#F4F1DE');R(g,304,33,4,4,mix('#26315C','#0B1638',.5));g.globalAlpha=1;}
      const fuji=mix('#7D8FB0','#2A3354',n);
      for(let y=40;y<60;y++){const hw=Math.round((y-40)*1.1);R(g,300-hw,y,2*hw+1,1,y<45?mix('#FFFFFF','#9AA6C4',n):fuji);}
      R(g,276,58,40,8,mix('#7FA070','#1B3038',n));R(g,276,58,40,1,mix('#93B482','#22403A',n));
      R(g,276,32,12,1,'#3E2E22'); R(g,283,33,8,1,'#3E2E22'); R(g,289,34,4,1,'#3E2E22');
      [[278,30],[283,31],[287,33],[280,34],[291,33],[276,33]].forEach(([x,y],i)=>{R(g,x,y,3,2,i%2?'#F7B6C8':'#FFD0DC');R(g,x+1,y-1,1,1,'#FFE4EC');});
    },
    wallPaint:shoji,floorPaint:tatami,
    counterThing:X=>[X+27,151,9,7], // the teapot is what the cat knocks off the counter
    overDoor(g,T){T.parts.sign(g,T);}, // the noren hangs in front of the shoji
    parts:{
      sill:null,rug:null,
      door(d,T){R(d,3,38,25,46,'#3A2C20');R(d,5,40,10,44,'#EFE4CC');R(d,16,40,10,44,'#EFE4CC');
        for(let y=45;y<84;y+=6){R(d,5,y,10,1,'#D9CBAE');R(d,16,y,10,1,'#D9CBAE');}
        R(d,15,40,1,44,'#3A2C20'); R(d,11,62,2,3,'#2E2A26'); R(d,18,62,2,3,'#2E2A26');},
      sign(d,T){R(d,1,30,29,1,'#3A2C20'); [3,12,21].forEach(x=>{R(d,x,31,8,13,'#2E3E5C');R(d,x,43,8,1,shade('#2E3E5C',-.3));}); R(d,13,35,6,5,'#EFE4CC'); R(d,14,36,4,3,'#2E3E5C');},
      plant(d,T){R(d,4,170,10,8,T.pot);R(d,3,169,12,2,T.potHi);[5,8,11].forEach((x,i)=>{R(d,x,150+i*4,2,20-i*4,'#8FB35E');R(d,x,156+i*3,2,1,'#6E8E48');R(d,x+2,152+i*4,2,1,'#6E9E50');});},
    },
    decor(d,T){
      // a low tea table between the two spots where Claudes stop to chat
      floorShadow(d,181,159,18); R(d,180,151,20,3,'#5A3E2B'); R(d,180,151,20,1,'#7A563C'); R(d,182,154,2,5,'#3E2E22'); R(d,196,154,2,5,'#3E2E22');
      R(d,186,148,5,3,'#4A5A6A'); R(d,185,147,7,1,'#5E7080'); R(d,193,149,2,2,'#E8E0D0');
    },
    live(g,tp){
      LANTERNS.forEach((x,i)=>drawLantern(g,x,tp,i));
      if(Math.random()<.008)leaves.push({x:W+2,y:10+Math.random()*50,vx:-12-Math.random()*10,vy:6,life:9,p:Math.random()*6,w:Math.random()<.5?2:1,c:Math.random()<.6?'#F7B6C8':'#FFD9E4'});
    },
    liveLights(Ls){LANTERNS.forEach(x=>Ls.push({x:x+1,y:9,r:18,a:.85,c:'255,150,110'}));},
  });
// Helpers for the room above: paper lanterns (drawn by live, lit at night by liveLights), tatami, shoji.
const LANTERNS=[134,186]; // in the gaps between the shelves and the clock
function drawLantern(g,x,tp,i){
  const sw=Math.round(Math.sin(tp/1300+i*2)*1),lx=x+sw;
  R(g,x,0,1,3,'#2E2A26'); R(g,lx-3,3,8,1,'#2E2A26'); R(g,lx-4,4,10,10,'#C0392B'); R(g,lx-3,4,8,10,'#D9483A');
  for(let y=6;y<13;y+=2)R(g,lx-4,y,10,1,'#A8302A');
  R(g,lx-3,14,8,1,'#2E2A26'); R(g,lx,15,2,2,'#E0B04A');
}
// Tatami: each 48x16 cell is one long mat, or now and then two short ones side by side, so no
// four corners ever meet. The weave runs along each mat; the dark cloth edge runs down its long sides.
function tatamiMat(g,x,y,w,h,T){
  R(g,x,y,w,h,T.floorA);
  if(w>h){for(let j=1;j<h;j+=2)R(g,x,y+j,w,1,T.floorB);R(g,x,y,w,1,T.seam);R(g,x,y+h-1,w,1,T.seam);R(g,x,y,1,h,shade(T.floorA,-.15));}
  else{for(let i=1;i<w;i+=2)R(g,x+i,y,1,h,T.floorB);R(g,x,y,1,h,T.seam);R(g,x+w-1,y,1,h,T.seam);R(g,x,y,w,1,shade(T.floorA,-.15));}
}
function tatami(g,T){
  for(let y=85,row=0;y<H;y+=16,row++)for(let x=-((row%2)*24),k=0;x<W;x+=48,k++){
    if((row+k)%3===0){tatamiMat(g,x,y,24,16,T);tatamiMat(g,x+24,y,24,16,T);}else tatamiMat(g,x,y,48,16,T);
  }
}
function shoji(g,T){
  R(g,0,0,W,84,T.wall);
  for(let x=0;x<W;x+=8)R(g,x,0,1,68,T.stripe);
  for(let y=8;y<68;y+=10)R(g,0,y,W,1,T.stripe);
  for(let x=0;x<W;x+=64){R(g,x,0,3,68,T.wainEdge);R(g,x+1,0,1,68,shade(T.wainEdge,.2));}
  R(g,0,0,W,2,T.wallTop); R(g,0,66,W,3,T.wainEdge);
  R(g,0,69,W,15,T.wain); for(let x=0;x<W;x+=12)R(g,x,69,1,15,T.panelEdge); R(g,0,69,W,1,T.wainHi);
  R(g,0,83,W,2,T.base);
}
