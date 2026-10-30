// The tab's icon: the head of the room's cat, in pixels like the room (CAT_LOOKS gives its colours).
'use strict';
// What only the face shows: each ear's colour, a patch on the head, the Siamese mask, a collar.
const FACES={
  calico:{earL:'#E0883A',earR:'#2B2A33',patch:'#E0883A'},
  claude:{collar:'#D97757'},
  mike:{earL:'#2E2A26',earR:'#D9823A',patch:'#2E2A26',collar:'#B03A2E'},
  astro:{earL:'#FF8A3D',earR:'#FF8A3D',patch:'#FF8A3D',rim:'#BFE6FF'},
  siamese:{earL:'#5A4030',earR:'#5A4030',mask:'#5A4030',collar:'#2B5A9E'},
  white:{collar:'#2F5D4E'},
  holo:{scan:true},
};
// r rim, f fur, m muzzle, L R ears, e eye, p pupil, n nose, c collar
const CAT_HEAD=[
  '..r..........r..',
  '.rLr........rRr.',
  '.rLLr......rRRr.',
  '.rLLLr....rRRRr.',
  '.rLLLLrrrrRRRRr.',
  '.rffffffffffffr.',
  '.rffffffffffffr.',
  '.rffepffffepffr.',
  '.rffepffffepffr.',
  '.rffffffffffffr.',
  '.rffffffffffffr.',
  '.rfffffnnfffffr.',
  '.rffmmmmmmmmffr.',
  '.rffmmmmmmmmffr.',
  '..rffffffffffr..',
  '...cccccccccc...',
];
const FAVICON_PX=4; // whole pixels, so a sharp screen shows it sharp
function paintCatHead(g,L,F){
  const rim=F.rim||(L===CAT_LOOKS.black?'#8A86A0':'#26243A');
  CAT_HEAD.forEach((row,y)=>[...row].forEach((k,x)=>{
    let c={r:rim,f:L.fur,m:L.hi,L:F.earL||L.fur,R:F.earR||L.fur,e:L.eye,p:'#14131C',n:'#E08F8F',c:F.collar||rim}[k];
    if(!c)return;
    if(k==='f'&&F.patch&&y<=7&&x<=6)c=F.patch;
    if((k==='f'||k==='m')&&F.mask&&y>=7&&x>=3&&x<=12)c=k==='m'?shade(F.mask,.2):F.mask;
    if(k!=='r'&&F.scan&&y%3===1)c=L.hi;
    g.fillStyle=c;g.fillRect(x*FAVICON_PX,y*FAVICON_PX,FAVICON_PX,FAVICON_PX);
  }));
}
const faviconEl=document.getElementById('favicon'),faviconSrcs={};
function faviconFor(key){
  if(faviconSrcs[key])return faviconSrcs[key];
  const c=document.createElement('canvas');c.width=c.height=16*FAVICON_PX;
  paintCatHead(c.getContext('2d'),CAT_LOOKS[key]||CAT_LOOKS.black,FACES[key]||{});
  return faviconSrcs[key]=c.toDataURL('image/png');
}
function showFavicon(){faviconEl.href=faviconFor(TH.catLook);}
