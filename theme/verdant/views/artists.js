/* verdant/views/artists.js -- all artists view: responsive grid of circular artist cards
   Part of Verdant, a Spotify-style theme for foobar2000. Loaded by main.js;
   every module shares one global scope, so load order is set there. */

var artistsScroll=0, artistsScrollT=0, ARTISTS_MAXPX=0;

function drawArtists(gr, r){
  HB_CARD=[];
  var pad=M.cpad, x0=r.x+pad, w=r.w-pad*2, i;
  var list=getArtistList();

  var titleY=r.y+22;
  tL(gr,'Artists',FONT.sect2,COL.text,x0,titleY,w,30);
  tL(gr,fmtNum(list.length)+' artists in your library',FONT.meta,COL.text2,x0,titleY+32,w,20);

  var gy=titleY+64, cropY=r.y+r.h, viewH=cropY-gy;
  if(!list.length){
    tC(gr,'No artists in your library',FONT.sect,COL.text2,r.x,r.y+Math.round(r.h/2)-20,r.w,24);
    tC(gr,'Add folders via foobar Preferences > Media Library.',FONT.qArtist,COL.text3,r.x,r.y+Math.round(r.h/2)+10,r.w,18);
    return;
  }

  var gap=18, cardW=176;
  var cols=Math.max(2,Math.floor((w+gap)/(cardW+gap)));
  cardW=Math.floor((w-gap*(cols-1))/cols);
  var cardH=cardW+56, rowStep=cardH+14;

  var totalRows=Math.max(1,Math.ceil(list.length/cols));
  var contentH=totalRows*rowStep, maxPx=Math.max(0,contentH-viewH);
  ARTISTS_MAXPX=maxPx;
  artistsScroll=clampPx(artistsScroll,maxPx); artistsScrollT=clampPx(artistsScrollT,maxPx);

  var startRow=Math.floor(artistsScroll/rowStep);
  for(i=startRow*cols; i<list.length; i++){
    var col=(i%cols), row=Math.floor(i/cols);
    var ax=x0+col*(cardW+gap), ay=gy+row*rowStep-artistsScroll;
    if(ay>=cropY) break;
    if(ay+cardH<=gy) continue;

    var art=list[i];
    var hov=hv(ax,Math.max(ay,gy),ax+cardW,Math.min(ay+cardH,cropY));

    // Card background
    if(hov) gr.FillRoundRect(ax-6,ay-6,cardW+12,cardH+12,8,8,COL.rowHover);

    // Circular artist portrait (with Deezer API caching)
    drawCircle(gr,ax,ay,cardW,art.handle,art.name);

    // Play icon on card hover
    if(hov){
      var pb=42, pbx=ax+cardW-pb-6, pby=ay+cardW-pb-6;
      gr.FillEllipse(pbx,pby,pb,pb,COL.green);
      drawIcon(gr,'play',COL.black,pbx,pby,pb,pb,20);
    }

    // Artist name and subtitle
    var ty=ay+cardW+10;
    tL(gr,art.name,FONT.card,hov?COL.green:COL.text,ax,ty,cardW,20);
    tL(gr,'Artist',FONT.plSub,COL.text2,ax,ty+22,cardW,18);

    var cy0=Math.max(ay,gy), cy1=Math.min(ay+cardH,cropY);
    if(cy1>cy0) HB_CARD.push({x0:ax-6,y0:cy0,x1:ax+cardW+6,y1:cy1,kind:'artist',id:art.name});
  }

  // Sticky header mask
  gr.FillSolidRect(r.x,r.y,r.w,gy-r.y,COL.base);
  tL(gr,'Artists',FONT.sect2,COL.text,x0,titleY,w,30);
  tL(gr,fmtNum(list.length)+' artists in your library',FONT.meta,COL.text2,x0,titleY+32,w,20);

  // Bottom gutter
  gr.FillSolidRect(r.x,cropY,r.w,M.pad+2,COL.black);

  // Scrollbar
  drawScrollbar(gr,x0+w+8,gy,viewH,artistsScroll,maxPx,viewH,contentH,hv(x0,gy,x0+w+16,cropY)||drag==='scroll');
}
