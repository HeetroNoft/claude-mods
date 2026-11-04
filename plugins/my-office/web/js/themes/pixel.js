// Theme "pixel": registered with defineTheme, painted by themes/engine.js.
'use strict';
defineTheme('pixel',null,{name:'Pixel · day & night',swatch:['#8CC6E6','#EADCC4','#A96F42','#D97557'],dark:.5,beam:1,dust:'sun',curtain:'#C9604A',
    wall:'#EADCC4',stripe:'#E3D3B8',wallTop:'#CDB896',wainHi:'#F6ECDB',wain:'#C3956A',wainEdge:'#9C6E46',panel:'#B98B60',panelEdge:'#A87B52',base:'#6E452A',
    floorA:'#C08A5C',floorB:'#B98356',seam:'#9A653D',grainA:'#C99464',grainB:'#AE784A',
    rugEdge:'#1B2E52',rugMid:'#D97557',rugIn:'#1B2E52',rugDot:'#F3E3C6',rugLine:'#2E4673',
    trim:'#F7F1E6',sill:'#9A6239',sillHi:'#B87A4C',shelf:'#8A5A36',shelfHi:'#A9744A',shelfLo:'#6E452A',
    catLook:'calico',signLeds:'bulb',doorKind:'swing',doorHall:'#2A2F45',doorLight:'255,214,140',doorFrame:'#6E452A',door:'#8A5A36',doorPanel:'#7A4D2D',doorPanelHi:'#8F5E39',knob:'#E0B04A',sign:'#00132F',signLine:'#D97557',
    clockRim:'#D97557',clockRing:'#00132F',clockFace:'#FFFDF8',ink:'#00132F',
    deskTop:'#6B3F22',deskTopHi:'#8C5634',deskFront:'#5A321A',deskLine:'#3E2010',laptop:'#C8CDD6',laptopHi:'#EEF1F5',logo:'#D97557',
    chair:'#24324F',chairHi:'#34466B',chairLeg:'#1A2236',boardFrame:'#6E452A',boardBg:'#0E2141',boardOff:'#22385E',
    cabinetKind:'metal',cabinet:'#5B6B82',cabinetHi:'#7D8DA4',drawer:'#6C7C94',machineKind:'classic',machine:'#2B3A55',machineHi:'#41557A',
    coffeeKind:'drip',counter:'#8A5A36',counterHi:'#B87A4C',counterFront:'#7A4D2D',coffee:'#00132F',coffeeHi:'#1B2E52',mug:'#D97557',
    pot:'#C0643E',potHi:'#D77A52',leafA:'#4E8F5A',leafB:'#6DAF6E',leafC:'#5E9E68',stem:'#3E7A4A',
    lampShade:'#D97557',lampPole:'#00132F',lampGlow:'255,214,140',ball:'#FF6B6B',
    ol:'#3A2212',desk:'wood',board:'navy',boardInk:'#FFFFFF',boardDim:'#7D93B8',
    sky:n=>n<.5?[mix('#8CC6E6','#E9885A',n*2),mix('#DDF0F6','#F7D59C',n*2)]:[mix('#E9885A','#0B1638',(n-.5)*2),mix('#F7D59C','#26315C',(n-.5)*2)],
    view(g,tp,n){
      if(n<.95){g.globalAlpha=1-n;R(g,303,34,5,5,'#FFE58A');R(g,302,35,7,3,'#FFE58A');R(g,304,33,3,7,'#FFE58A');g.globalAlpha=1;}
      if(n>.05){g.globalAlpha=n;STARS.forEach((s,i)=>{if(Math.sin(tp/700+i*1.7)>-.4)R(g,s[0],s[1],1,1,'#FFFFFF');});
        R(g,302,33,5,5,'#F4F1DE');R(g,301,34,7,3,'#F4F1DE');R(g,304,32,4,5,mix('#26315C','#0B1638',.5));g.globalAlpha=1;}
      drawClouds(g,tp,1-n*.75,'#FFFFFF');
      drawHills(g,n,'#7FB08A','#1B3038',0);
      const gy=Math.max(hillTop(287),hillTop(291))+1; // the house's floor, on the lower of the ground under its walls
      R(g,287,gy-5,5,5,mix('#E9D9C0','#2A2F45',n)); R(g,286,gy-6,7,1,mix('#B85F3E','#3A2430',n)); R(g,288,gy-7,3,1,mix('#B85F3E','#3A2430',n));snowOn(g,286,gy-6,7,n);snowOn(g,288,gy-7,3,n);
      R(g,289,gy-4,1,1,n>.5?'#FFD27A':'#7A6A55'); R(g,290,gy-2,1,2,mix('#8A5A3A','#1E1A22',n));
    }});
