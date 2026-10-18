/* verdant/views/albums.js -- all albums view: responsive grid of album cards
   Part of Verdant, a Spotify-style theme for foobar2000. Loaded by main.js;
   every module shares one global scope, so load order is set there. */

var albumsScroll=0, albumsScrollT=0, ALBUMS_MAXPX=0;

function drawAlbums(gr, r){
  HB_CARD=[];
  var pad=M.cpad, x0=r.x+pad, w=r.w-pad*2, i;
  var list=getAlbumList();

  var titleY=r.y+22;
  tL(gr,'Albums',FONT.sect2,COL.text,x0,titleY,w,30);
  tL(gr,fmtNum(list.length)+' albums in your library',FONT.meta,COL.text2,x0,titleY+32,w,20);

  var gy=titleY+64, cropY=r.y+r.h, viewH=cropY-gy;
  if(!list.length){
    tC(gr,'No albums in your library',FONT.sect,COL.text2,r.x,r.y+Math.round(r.h/2)-20,r.w,24);
    tC(gr,'Add folders via foobar Preferences > Media Library.',FONT.qArtist,COL.text3,r.x,r.y+Math.round(r.h/2)+10,r.w,18);
    return;
  }

  var gap=18, cardW=176;
  var cols=Math.max(2,Math.floor((w+gap)/(cardW+gap)));
  cardW=Math.floor((w-gap*(cols-1))/cols);
  var cardH=cardW+62, rowStep=cardH+12;

  var totalRows=Math.max(1,Math.ceil(list.length/cols));
  var contentH=totalRows*rowStep, maxPx=Math.max(0,contentH-viewH);
  ALBUMS_MAXPX=maxPx;
  albumsScroll=clampPx(albumsScroll,maxPx); albumsScrollT=clampPx(albumsScrollT,maxPx);

  var startRow=Math.floor(albumsScroll/rowStep);
  for(i=startRow*cols; i<list.length; i++){
    var col=(i%cols), row=Math.floor(i/cols);
    var ax=x0+col*(cardW+gap), ay=gy+row*rowStep-albumsScroll;
    if(ay>=cropY) break;
    if(ay+cardH<=gy) continue;

    var alb=list[i];
    var hov=hv(ax,Math.max(ay,gy),ax+cardW,Math.min(ay+cardH,cropY));

    // Card background
    if(hov) gr.FillRoundRect(ax-6,ay-6,cardW+12,cardH+12,8,8,COL.rowHover);

    // Cover image
    drawRounded(gr,ax,ay,cardW,6,alb.handle,alb.name);

    // Play icon on card hover
    if(hov){
      var pb=42, pbx=ax+cardW-pb-8, pby=ay+cardW-pb-8;
      gr.FillEllipse(pbx,pby,pb,pb,COL.green);
      drawIcon(gr,'play',COL.black,pbx,pby,pb,pb,20);
    }

    // Text labels
    var ty=ay+cardW+10;
    tL(gr,alb.name,FONT.card,hov?COL.green:COL.text,ax,ty,cardW,20);
    var sub=(alb.year?alb.year+' '+CH_DOT+' ':'')+alb.artist;
    tL(gr,sub,FONT.plSub,COL.text2,ax,ty+22,cardW,18);

    var cy0=Math.max(ay,gy), cy1=Math.min(ay+cardH,cropY);
    if(cy1>cy0) HB_CARD.push({x0:ax-6,y0:cy0,x1:ax+cardW+6,y1:cy1,kind:'album',name:alb.name,artist:alb.artist,handles:alb.handles});
  }

  // Sticky header mask
  gr.FillSolidRect(r.x,r.y,r.w,gy-r.y,COL.base);
  tL(gr,'Albums',FONT.sect2,COL.text,x0,titleY,w,30);
  tL(gr,fmtNum(list.length)+' albums in your library',FONT.meta,COL.text2,x0,titleY+32,w,20);

  // Bottom gutter
  gr.FillSolidRect(r.x,cropY,r.w,M.pad+2,COL.black);

  // Scrollbar
  drawScrollbar(gr,x0+w+8,gy,viewH,albumsScroll,maxPx,viewH,contentH,hv(x0,gy,x0+w+16,cropY)||drag==='scroll');
}
