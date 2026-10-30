// Theme "claude": registered with defineTheme, painted by themes/engine.js.
'use strict';
defineTheme('claude',null,{name:'Claude',swatch:['#F4EFE6','#D97757','#3D3929','#8DAE79'],dark:.42,beam:.6,dust:'sun',curtain:'#E6D9C4',
    wall:'#F4EFE6',stripe:'#F4EFE6',wallTop:'#E6DCCB',wainHi:'#FBF8F2',wain:'#EAE1D2',wainEdge:'#D9CDB8',panel:'#EAE1D2',panelEdge:'#E2D7C4',base:'#CDBFA6',
    floorA:'#DCC8A6',floorB:'#D5C09C',seam:'#C2AA82',grainA:'#E3D0B0',grainB:'#CBB48E',
    rugEdge:'#C96442',rugMid:'#F4EFE6',rugIn:'#D97757',rugDot:'#FBF8F2',rugLine:'#C96442',
    trim:'#FFFDF8',sill:'#D9CDB8',sillHi:'#EAE1D2',shelf:'#A8946F',shelfHi:'#C4B08A',shelfLo:'#8C7957',
    catLook:'claude',signLeds:'dot',signSpan:[10,28],doorKind:'swing',doorHall:'#5A4F42',doorLight:'255,230,190',doorFrame:'#A8946F',door:'#EAE1D2',doorPanel:'#E0D5C2',doorPanelHi:'#F1EADF',knob:'#D97757',sign:'#D97757',signLine:'#3D3929',
    clockRim:'#3D3929',clockRing:'#D97757',clockFace:'#FFFDF8',ink:'#3D3929',
    deskTop:'#FFFDF8',deskTopHi:'#FFFFFF',deskFront:'#3D3929',deskLine:'#3D3929',laptop:'#3D3929',laptopHi:'#5A5547',logo:'#D97757',
    chair:'#D97757',chairHi:'#E89478',chairLeg:'#3D3929',boardFrame:'#3D3929',boardBg:'#FFFDF8',boardOff:'#E6DCCB',
    cabinetKind:'credenza',cabinet:'#5A5547',cabinetHi:'#77715F',drawer:'#68624F',machineKind:'kiosk',machine:'#3D3929',machineHi:'#5A5547',
    coffeeKind:'pourover',counter:'#8DAE79',counterHi:'#A9C597',counterFront:'#7A9B67',coffee:'#3D3929',coffeeHi:'#5A5547',mug:'#D97757',
    pot:'#D97757',potHi:'#E89478',leafA:'#6F8F5E',leafB:'#8DAE79',leafC:'#7E9F6B',stem:'#5A7A4A',
    lampShade:'#D97757',lampPole:'#3D3929',lampGlow:'255,214,170',ball:'#D97757',
    ol:'#6E604C',desk:'studio',plantKind:'snake',smallPlant:'succulent',board:'paper',boardInk:'#3D3929',boardDim:'#9C8F78',
    sky:n=>skyOf(n,['#BFD9E6','#F3EEE6'],['#141B33','#343A58'],['#E9A07A','#F6D7B4']),
    view(g,tp,n){daySun(g,n,302,34,'#F6C8A0');nightSky(g,tp,n,302,33);drawClouds(g,tp,1-n*.8,'#FFFDF8');
      drawHills(g,n,'#B9C9A3','#22303A',7);},
    wallDecor(g){R(g,0,2,W,1,'#E2D7C4');},
    extras(g){pattern(g,SPARK,4,31,'#FFFDF8');}});
