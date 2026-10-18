/* verdant/views/home.js -- home view: playlist shelf + artist grid
   Part of Verdant, a Spotify-style theme for foobar2000. Loaded by main.js;
   every module shares one global scope, so load order is set there. */

function drawHome(gr,r){
  HB_CARD=[];
  var pad=M.cpad, x0=r.x+pad, w=r.w-pad*2, rightEdge=r.x+r.w, i;
  var gap=16, cardW=176, cols=Math.max(2,Math.floor((w+gap)/(cardW+gap)));
  cardW=Math.floor((w-gap*(cols-1))/cols);
  var cardH=cardW+56;

  // ---- 1) Playlists Shelf (Top Pinned) ----
  var shelfTitleY=r.y+16, shelfY=shelfTitleY+38;
  var pls=visiblePlaylists();
  var scardW=(pls.length>cols)?Math.floor((w-cols*gap)/(cols+0.4)):cardW, scardH=scardW+54;

  var listReady=ensureBuilt('arts',function(){ return artistList!==null; },
                            function(){ return [function(){ libTF('artistName'); },function(){ getArtistList(); }]; });
  var arts=listReady?artistList:[];

  var shelfReady=ensureBuilt('shelfh',function(){ return shelfHandles!==null; },function(){ return shelfSteps(pls); })
                 && gateReady('shelf',shelfHandles);
  var artsReady=listReady;
  if(artsReady && !warmed['home']){ warmed['home']=1; startWarmHome(arts,pls); }

  // Geometry for scrollable body (Recently Added + Artist Grid)
  var shelfBot=shelfY+scardH+(pls.length>cols?22:14);
  var gy=shelfBot+6, cropY=r.y+r.h, viewH=cropY-gy;
  var rowStep=cardH+8;

  // Recently added 5 songs
  var recSongs=getRecentTracks(5);
  var recCols=Math.min(5, Math.max(2, cols));
  var rcardW=Math.floor((w-gap*(recCols-1))/recCols);
  var rcardH=rcardW+64;
  var recSecH=recSongs.length?(36+rcardH+18):0;

  var totalRows=Math.max(1,Math.ceil(arts.length/cols));
  var contentH=recSecH + totalRows*rowStep + 40;
  var maxPx=Math.max(0,contentH-viewH);
  HOME_MAXROW=maxPx;
  homeScroll=clampPx(homeScroll,maxPx); homeScrollT=clampPx(homeScrollT,maxPx);

  var cy=gy-homeScroll;

  // ---- Render Recently Added Section ----
  if(recSongs.length){
    var rTitleY=cy;
    if(rTitleY+28>gy && rTitleY<cropY){
      tL(gr,'Recently Added',FONT.sect2,COL.text,x0,rTitleY,w,28);
    }
    var rCardsY=rTitleY+34;
    for(var ri=0; ri<recSongs.length && ri<recCols; ri++){
      var rx=x0+ri*(rcardW+gap), ry=rCardsY;
      if(ry>=cropY) break;
      if(ry+rcardH<=gy) continue;

      var tr=recSongs[ri];
      var rHov=hv(rx,Math.max(ry,gy),rx+rcardW,Math.min(ry+rcardH,cropY));

      if(rHov) gr.FillRoundRect(rx-6,ry-6,rcardW+12,rcardH+12,8,8,COL.rowHover);

      drawRounded(gr,rx,ry,rcardW,6,tr.handle,tr.title);

      // Play button on hover
      if(rHov){
        var pb=40, pbx=rx+rcardW-pb-8, pby=ry+rcardW-pb-8;
        gr.FillEllipse(pbx,pby,pb,pb,COL.green);
        drawIcon(gr,'play',COL.black,pbx,pby,pb,pb,18);
      }

      // Title & Artist
      var rty=ry+rcardW+8;
      tL(gr,tr.title,FONT.card,rHov?COL.green:COL.text,rx,rty,rcardW,20);
      tL(gr,tr.artist,FONT.plSub,COL.text2,rx,rty+20,rcardW,16);

      // "NEW RELEASE · ALBUM" tag
      var tagH=18, tagW=Math.min(rcardW, 90), tagY=rty+38;
      gr.FillRoundRect(rx,tagY,tagW,tagH,4,4,RGBA(30,215,96,28));
      tC(gr,'ALBUM',FONT.eyebrow,COL.green,rx,tagY,tagW,tagH);

      var vry0=Math.max(ry,gy), vry1=Math.min(ry+rcardH,cropY);
      if(vry1>vry0){
        HB_CARD.push({x0:rx-6,y0:vry0,x1:rx+rcardW+6,y1:vry1,kind:'recent_song',track:tr,rx:rx,ry:ry,rcardW:rcardW,rcardH:rcardH});
      }
    }
    cy+=recSecH;
  }

  // ---- Render Artists in Your Library Section ----
  var artTitleY=cy;
  if(artTitleY+28>gy && artTitleY<cropY){
    tL(gr,'Artists in your library',FONT.sect2,COL.text,x0,artTitleY,w,28);
  }
  var gridTop=artTitleY+36;

  if(!artsReady){
    if(listReady || skelVisible('arts')){ skelCardsCached(gr,x0,Math.max(gridTop,gy),w,cropY-Math.max(gridTop,gy),cardW,gap); shimmer(gr,x0,Math.max(gridTop,gy),w,cropY-Math.max(gridTop,gy)); }
  } else {
    for(i=0; i<arts.length; i++){
      var col=(i%cols), row=Math.floor(i/cols), ay=gridTop+row*rowStep;
      if(ay>=cropY) break;
      if(ay+cardH<=gy) continue;
      drawArtistCard(gr,x0+col*(cardW+gap),ay,cardW,arts[i],gy,cropY);
    }
  }

  // Gutter below panel
  gr.FillSolidRect(r.x,cropY,r.w,M.pad+2,COL.black);

  // ---- 2) Sticky Top Shelf: Your Playlists ----
  gr.FillSolidRect(r.x,r.y,r.w,gy-r.y,COL.base);
  tL(gr,'Your Playlists',FONT.sect2,COL.text,x0,shelfTitleY,w,28);

  var stride=scardW+gap, shelfW=Math.max(0,pls.length*stride-gap);
  HOME_PLMAX=Math.max(0,shelfW-w); HOME_STRIDE=stride;
  plScroll=clampPx(plScroll,HOME_PLMAX); plScrollT=clampPx(plScrollT,HOME_PLMAX);
  if(!shelfReady){
    skelCardsCached(gr,x0,shelfY,w,scardH,scardW,gap); shimmer(gr,x0,shelfY,w,scardH);
  } else {
    for(i=Math.floor(plScroll/stride);i<pls.length;i++){
      var cx=Math.round(x0+i*stride-plScroll); if(cx>=rightEdge) break;
      drawPlaylistCard(gr,cx,shelfY,scardW,pls[i],x0,rightEdge);
    }
  }
  HOME_SHELF_Y0=shelfY; HOME_SHELF_Y1=shelfY+scardH;
  var sbY=shelfY+scardH+6;
  drawScrollbarH(gr,x0,sbY,w,plScroll,HOME_PLMAX,w,shelfW,hv(x0,shelfY,rightEdge,sbY+10)||drag==='scrollh');

  // ---- 3) Vertical Scrollbar ----
  drawScrollbar(gr,x0+w+8,gy,viewH,homeScroll,maxPx,viewH,contentH,hv(x0,gy,x0+w+16,cropY)||drag==='scroll');
}
