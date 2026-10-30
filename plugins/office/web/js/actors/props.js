// Item sprites shared by the decor, the item bar and the Claudes' hands: the mug a Claude sips from
// is the same mug as on the desks and the counter. drawProp draws from the top-left corner.
'use strict';
const PROP_SIZE={mug:[4,4],teacup:[3,3],cookie:[4,4],donut:[5,3],ball:[4,4],flower:[3,6],blossom:[3,3],gift:[5,5]};
const COOKIE_ROWS=['.cc.','cckc','ckcc','.cc.'];
// Pixels gone after each bite, eaten from the top right.
const COOKIE_BITES=[[],['3,0','3,1','2,0'],['3,0','3,1','2,0','3,2','2,1','1,0'],['3,0','3,1','2,0','3,2','2,1','1,0','0,1','1,1','2,2','3,3']];
// drawHeld also takes dx, dy (a shake). o: col (mug or ball colour), fill (0..1 of coffee or tea left), bites (cookie, 0..4), open (gift).
function drawProp(g,kind,x,y,o){
  o=o||{};x=Math.round(x);y=Math.round(y);
  const full=o.fill==null||o.fill>.01;
  switch(kind){
    case 'mug':{const c=o.col||'#FFFFFF';
      R(g,x,y,3,4,c);R(g,x+3,y+1,1,2,c);R(g,x,y+1,1,2,shade(c,.3));R(g,x+2,y+1,1,3,shade(c,-.12));
      R(g,x,y,3,1,full?(o.fill!=null&&o.fill<.5?'#8A5A3A':'#6B3A22'):shade(c,-.35));break;}
    case 'teacup':R(g,x,y,3,3,'#E8E0D0');R(g,x,y+1,3,1,'#5E7A6A');R(g,x,y,3,1,full?'#8AA868':'#C9C0AE');break;
    case 'cookie':{const k=o.bites|0;if(k>=4)break;const gone=new Set(COOKIE_BITES[k]);
      COOKIE_ROWS.forEach((r,j)=>{for(let i=0;i<4;i++){if(r[i]==='.'||gone.has(i+','+j))continue;R(g,x+i,y+j,1,1,r[i]==='k'?'#5A3418':'#D49A5A');}});break;}
    case 'donut':R(g,x+1,y,3,1,'#E58AA8');R(g,x,y+1,2,1,'#E58AA8');R(g,x+3,y+1,2,1,'#E58AA8');R(g,x+1,y+2,3,1,'#C98A4A');R(g,x+2,y,1,1,'#FFFFFF');R(g,x+4,y+1,1,1,'#7FD1FF');break;
    case 'ball':{const c=o.col||'#FF6B6B';R(g,x+1,y,2,1,c);R(g,x,y+1,4,1,c);R(g,x,y+2,4,1,'#FFFFFF');R(g,x+1,y+3,2,1,c);R(g,x+1,y+1,1,1,shade(c,.5));break;}
    case 'flower':R(g,x+1,y+2,1,4,'#3E9A4A');R(g,x,y+4,1,1,'#6CC070');R(g,x+1,y,1,1,'#FF8FB8');R(g,x,y+1,3,1,'#FF8FB8');R(g,x+1,y+1,1,1,'#FFD84A');break;
    case 'blossom':R(g,x+1,y,1,1,'#FF8FB8');R(g,x,y+1,3,1,'#FF8FB8');R(g,x+1,y+2,1,1,'#FF8FB8');R(g,x+1,y+1,1,1,'#FFD84A');break;
    case 'gift':
      if(!o.open){R(g,x,y,5,2,'#E58A6A');R(g,x+2,y,1,2,'#FFFFFF');R(g,x+1,y-1,1,1,'#FFFFFF');R(g,x+3,y-1,1,1,'#FFFFFF');}
      R(g,x,y+2,5,3,'#D97557');R(g,x+2,y+2,1,3,'#FFFFFF');if(o.open)R(g,x+1,y+2,3,1,shade('#D97557',-.35));break;
  }
}
// Where a hand takes hold of each prop (pixel in the sprite): the mug by its handle, the flower by
// its stem, the cookie by its edge. A side hand's fingers sit on that pixel; two hands in front
// (side 0) hold the prop by its sides at that row.
const GRIP={mug:[3,1],teacup:[2,1],cookie:[3,2],donut:[4,1],ball:[3,2],flower:[1,4],blossom:[1,2],gift:[4,3]};
// The prop's box for a hand (hand = top-left of the 2x2 hand tip): out to the left of a left hand,
// mirrored out to the right of a right hand, centred between two hands in front.
function heldBox(hand,o){
  const [w,h]=PROP_SIZE[o.kind]||[3,3],[gx,gy]=GRIP[o.kind]||[w-1,h>>1];
  if(hand.side<0)return {x:hand.x-gx,y:hand.y-gy,w,h,flip:false};
  if(hand.side>0)return {x:hand.x+1-(w-1-gx),y:hand.y-gy,w,h,flip:true};
  return {x:hand.x-(w>>1),y:hand.y-gy,w,h,flip:false};
}
// A prop in hand, then the fingers over it (skin: the Claude's colour), so it is held, not floating.
// rim: a dark edge round the prop, so an orange gift still shows against an orange Claude.
let heldCv=null;
function drawHeld(g,hand,o,skin,rim){
  const b=heldBox(hand,o),dx=o.dx|0;b.y+=o.dy|0;
  if(rim){
    if(!heldCv){heldCv=document.createElement('canvas');heldCv.width=heldCv.height=12;}
    const h=heldCv.getContext('2d');h.clearRect(0,0,12,12);h.save();
    if(b.flip){h.translate(2*2+b.w,0);h.scale(-1,1);}
    drawProp(h,o.kind,2,3,o);h.restore();
    h.globalCompositeOperation='source-in';h.fillStyle=rim;h.fillRect(0,0,12,12);h.globalCompositeOperation='source-over';
    [[-1,0],[1,0],[0,-1],[0,1]].forEach(([i,j])=>g.drawImage(heldCv,b.x+dx-2+i,b.y-3+j));
  }
  if(b.flip){g.save();g.translate(2*b.x+b.w+dx,0);g.scale(-1,1);drawProp(g,o.kind,b.x,b.y,o);g.restore();}
  else drawProp(g,o.kind,b.x+dx,b.y,o);
  if(!skin)return;
  if(hand.side<0)R(g,hand.x,hand.y,1,1,skin);
  else if(hand.side>0)R(g,hand.x+1,hand.y,1,1,skin);
  else{R(g,b.x+dx,hand.y,1,1,skin);R(g,b.x+dx+b.w-1,hand.y,1,1,skin);}
}
