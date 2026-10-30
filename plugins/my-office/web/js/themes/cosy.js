// Theme "cosy": registered with defineTheme, painted by themes/engine.js.
'use strict';
defineTheme('cosy',null,{name:'Cosy lo-fi',swatch:['#3B2D4F','#6A4C55','#E0B04A','#7A2E3A'],dark:.52,beam:0,dust:null,curtain:'#7A2E3A',lights:true,cat:true,rain:true,
    wall:'#6A4C55',stripe:'#644750',wallTop:'#4F3840',wainHi:'#8C6A5A',wain:'#5E3F2E',wainEdge:'#4A3023',panel:'#563A2B',panelEdge:'#4C3326',base:'#3A251B',
    floorA:'#6E4A33',floorB:'#674530',seam:'#543826',grainA:'#76503A',grainB:'#5E3F2C',
    rugEdge:'#7A2E3A',rugMid:'#E0B04A',rugIn:'#9E3D4C',rugDot:'#F3D9A6',rugLine:'#B85565',
    trim:'#8C6A5A',sill:'#5E3F2E',sillHi:'#7A5643',shelf:'#5E3F2E',shelfHi:'#7A5643',shelfLo:'#432C20',
    signLeds:'fairy',doorKind:'swing',doorHall:'#2E1E1A',doorLight:'255,190,120',doorFrame:'#432C20',door:'#5E3F2E',doorPanel:'#543826',doorPanelHi:'#664632',knob:'#E0B04A',sign:'#2A1E2E',signLine:'#E0B04A',
    clockRim:'#E0B04A',clockRing:'#3A251B',clockFace:'#F3E3C6',ink:'#3A251B',
    deskTop:'#4A2E1F',deskTopHi:'#6B4530',deskFront:'#55735E',deskLine:'#3A5042',laptop:'#9AA0AE',laptopHi:'#C3C8D2',logo:'#E0B04A',
    chair:'#7A2E3A',chairHi:'#9E3D4C',chairLeg:'#2A1E1A',boardFrame:'#6B4530',boardBg:'#2F3D35',boardOff:'#46594D',
    cabinetKind:'dresser',cabinet:'#8F7B6C',cabinetHi:'#A8937F',drawer:'#7E6A5C',machineKind:'radio',machine:'#3A2E48',machineHi:'#54456A',
    coffeeKind:'moka',counter:'#7A2E3A',counterHi:'#9E3D4C',counterFront:'#66252F',coffee:'#2A1E2E',coffeeHi:'#3E2E44',mug:'#E0B04A',
    pot:'#9E4A2E',potHi:'#B85F3E',leafA:'#4E7F52',leafB:'#679A65',leafC:'#5A8C5C',stem:'#3B6440',
    lampShade:'#E0B04A',lampPole:'#2A1E1A',lampGlow:'255,190,110',ball:'#E0B04A',
    ol:'#1C110B',desk:'cottage',plantKind:'fern',smallPlant:'cactus',board:'chalk',boardInk:'#F1EBDD',boardDim:'#9FB0A3',
    sky:n=>skyOf(n,['#8A96B0','#C2C8D6'],['#141530','#3B2D4F'],['#6A6E8C','#A895A8']),
    view(g,tp,n){if(n>.3){g.globalAlpha=Math.min(1,(n-.3)*1.5);R(g,304,33,5,5,'#F1E6C8');R(g,303,34,7,3,'#F1E6C8');g.globalAlpha=1;}
      R(g,276,57,38,7,mix('#5E6478','#232541',n));R(g,276,54,12,3,mix('#525870','#1E2038',n));R(g,298,53,10,4,mix('#525870','#1E2038',n));snowOn(g,276,57,38,n);snowOn(g,276,54,12,n);snowOn(g,298,53,10,n);
      if(n>.25)[[280,58],[284,59],[301,55],[305,56],[309,59]].forEach(([x,y],i)=>{if(Math.sin(tp/1900+i*2.3)>-.7)R(g,x,y,1,1,'#FFC970');});
      if(SEASON==='winter')return; // it snows instead (windowWeather)
      for(let i=0;i<16;i++){const x=276+((i*7.3+tp/1000*9)%38),y=30+((i*13.7+tp/1000*55)%34);R(g,x,y,1,2,'rgba(160,185,235,.55)');}
      for(let i=0;i<3;i++){const y=30+((tp/1000*(5+i*2)+i*11)%34);R(g,281+i*11,y,1,2,'rgba(200,215,245,.5)');}},
    extras(g){R(g,278,72,32,10,'#8A7466');R(g,278,72,32,1,'#A28C7E');for(let x=280;x<309;x+=3)R(g,x,73,1,9,'#6E5A4E');R(g,278,82,32,1,'rgba(0,0,0,.25)');}});
