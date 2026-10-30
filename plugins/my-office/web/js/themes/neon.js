// Theme "neon": registered with defineTheme, painted by themes/engine.js.
'use strict';
defineTheme('neon',null,{name:'Neon',swatch:['#15112B','#2DE2E6','#FF3DCB','#7B5CFF'],dark:.58,beam:0,dust:'neon',curtain:'#2A2050',neon:true,
    wall:'#17122E',stripe:'#1B1536',wallTop:'#0D0A1E',wainHi:'#2DE2E6',wain:'#1C1638',wainEdge:'#2A2050',panel:'#211A42',panelEdge:'#3A2D6E',base:'#0B0818',
    floorA:'#14102A',floorB:'#120E27',seam:'#25305E',grainA:'#14102A',grainB:'#120E27',
    rugEdge:'#2DE2E6',rugMid:'#120E26',rugIn:'#1E1645',rugDot:'#FF3DCB',rugLine:'#7B5CFF',
    trim:'#2A2050',sill:'#2A2050',sillHi:'#3A2D6E',shelf:'#2A2050',shelfHi:'#7B5CFF',shelfLo:'#1C1638',
    catLook:'holo',signLeds:'neon',signGlow:true,doorKind:'swing',doorHall:'#120E26',doorLight:'255,61,203',doorFrame:'#2A2050',door:'#1C1638',doorPanel:'#221A44',doorPanelHi:'#2A2050',knob:'#2DE2E6',sign:'#0B0818',signLine:'#FF3DCB',
    clockRim:'#2DE2E6',clockRing:'#0B0818',clockFace:'#14102A',ink:'#2DE2E6',
    deskTop:'#2A2050',deskTopHi:'#7B5CFF',deskFront:'#1C1638',deskLine:'#2DE2E6',laptop:'#2A2F45',laptopHi:'#2DE2E6',logo:'#FF3DCB',
    chair:'#221A44',chairHi:'#FF3DCB',chairLeg:'#0B0818',boardFrame:'#2A2050',boardBg:'#05030C',boardOff:'#1E1840',
    cabinetKind:'locker',cabinet:'#221A44',cabinetHi:'#3A2D6E',drawer:'#2A2050',machineKind:'arcade',machine:'#1C1638',machineHi:'#7B5CFF',
    coffeeKind:'espresso',counter:'#221A44',counterHi:'#3A2D6E',counterFront:'#1C1638',coffee:'#0B0818',coffeeHi:'#2A2050',mug:'#FF3DCB',
    pot:'#2A2050',potHi:'#7B5CFF',leafA:'#1FA89A',leafB:'#2DE2E6',leafC:'#22C2B5',stem:'#178077',
    lampShade:'#FF3DCB',lampPole:'#2A2050',lampGlow:'255,61,203',ball:'#2DE2E6',screenGlow:'45,226,230',
    ol:'#4A3A9A',desk:'glass',plantKind:'neon',smallPlant:'cactus',board:'led',boardInk:'#2DE2E6',boardDim:'#6A5FA8',
    sky:n=>skyOf(n,['#8FB8E6','#E3D7EC'],['#0E0826','#3A1A5C'],['#E07AA8','#F5B48C']),
    view(g,tp,n){daySun(g,n,306,31,'#FFE3B0');
      BLD.forEach(([x,top,w],b)=>{R(g,x,top,w,64-top,mix('#7E7AA8','#1B1440',n));R(g,x,top,w,1,mix('#A9A3CC','#3A2D6E',n));
        for(let y=top+2;y<62;y+=3)for(let i=1;i<w-1;i+=2){const h=hash(b+'_'+i+'_'+y);if(h%3)continue;const on=(h%100)/100<n&&Math.sin(tp/1500+h%17)>-.6;R(g,x+i,y,1,1,on?['#2DE2E6','#FF3DCB','#FFD84A'][h%7%3]:mix('#9FB4D0','#2A2050',n));}});
      // the rooftop sign: on the building at x 283 (top 39), on a mast, brighter at night
      R(g,285,35,1,4,mix('#5A5478','#2A2050',n));g.globalAlpha=Math.max(.45,n);R(g,281,31,9,4,'#FF3DCB');R(g,282,32,7,2,'#FF9BE6');g.globalAlpha=1;
      const fx=276+((tp/1000*11)%50)-6;R(g,fx,38,2,1,'#FFD84A');R(g,fx-2,38,2,1,'rgba(255,216,74,.4)');},
    extras(g){R(g,0,85,W,1,'#1E6C80');}});
