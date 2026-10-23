/* flacify/views/home.js -- home view: playlist shelf + artist grid
   Part of FLACify, the lossless Spotify-style experience for foobar2000. Loaded by main.js;
   every module shares one global scope, so load order is set there. */

function drawHome(gr,r){
  HB_CARD=[];
  var pad=M.cpad, x0=r.x+pad, w=r.w-pad*2, rightEdge=r.x+r.w, i;
  var gap=16, cardW=176, cols=Math.max(2,Math.floor((w+gap)/(cardW+gap)));
  cardW=Math.floor((w-gap*(cols-1))/cols);
  var cardH=cardW+56;

  // Ambient Hero Gradient Glow (subtle ambient tint from currently playing or base)
  var homeGlow = (typeof getSmoothAmbientRGB==='function') ? getSmoothAmbientRGB() : COL.base;
  gr.FillGradRect(r.x, r.y, r.w, Math.min(340, Math.round(r.h * 0.5)), 90, blend(homeGlow, COL.base, 0.40), COL.base, 1.0);

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

  // Geometry for scrollable body (Recently Played + Recently Added + Artist Grid)
  var shelfBot=shelfY+scardH+(pls.length>cols?22:14);
  var gy=shelfBot+6, cropY=r.y+r.h, viewH=cropY-gy;
  var rowStep=cardH+8;

  // Daily Mixes & Smart Playlists (Offline Clustering Engine)
  var dMixes = (typeof getDailyMixes === 'function') ? getDailyMixes() : [];
  var mcols = Math.min(4, Math.max(2, cols));
  var mcardW = Math.floor((w - gap * (mcols - 1)) / mcols);
  var mcardH = mcardW + 64;
  var mixSecH = dMixes.length ? (36 + mcardH + 20) : 0;

  // Audiophile Smart Playlists
  var scols = Math.min(3, Math.max(2, cols));
  var scardW2 = Math.floor((w - gap * (scols - 1)) / scols);
  var scardH2 = 78;
  var smartSecH = 36 + scardH2 + 20;

  // Recently played tracks from Listening History
  var recPlays=(typeof getRecentlyPlayedDistinct==='function')?getRecentlyPlayedDistinct(cols):[];
  var pcardW=Math.floor((w-gap*(cols-1))/cols);
  var pcardH=pcardW+64;
  var playSecH=recPlays.length?(36+pcardH+20):0;

  // Recently added 5 songs
  var recSongs=getRecentTracks(5);
  var recCols=Math.min(5, Math.max(2, cols));
  var rcardW=Math.floor((w-gap*(recCols-1))/recCols);
  var rcardH=rcardW+64;
  var recSecH=recSongs.length?(36+rcardH+18):0;

  var totalRows=Math.max(1,Math.ceil(arts.length/cols));
  var contentH=mixSecH + smartSecH + playSecH + recSecH + totalRows*rowStep + 40;
  var maxPx=Math.max(0,contentH-viewH);
  HOME_MAXROW=maxPx;
  homeScroll=clampPx(homeScroll,maxPx); homeScrollT=clampPx(homeScrollT,maxPx);

  var cy=gy-homeScroll;

  // ---- Render Made For You -- Daily Mixes Section ----
  if(dMixes.length){
    var mTitleY = cy;
    if(mTitleY + 28 > gy && mTitleY < cropY){
      tL(gr, 'Made For You -- Daily Mixes', FONT.sect2, COL.text, x0, mTitleY, w - 120, 28);
    }
    var mCardsY = mTitleY + 34;
    var mixAccents = [RGB(225, 29, 72), RGB(6, 182, 212), RGB(16, 185, 129), RGB(245, 158, 11)];

    for(var mi = 0; mi < dMixes.length && mi < mcols; mi++){
      var mx = x0 + mi * (mcardW + gap), my = mCardsY;
      if(my >= cropY) break;
      if(my + mcardH <= gy) continue;

      var mix = dMixes[mi];
      var mHov = hv(mx - 6, Math.max(my - 6, gy), mx + mcardW + 6, Math.min(my + mcardH + 6, cropY));
      if(mHov) gr.FillRoundRect(mx - 6, my - 6, mcardW + 12, mcardH + 12, 8, 8, COL.rowHover);

      // Artwork: 2x2 Mosaic or Single cover
      var miBmp = (mix.cands && mix.cands.length >= 4 && typeof mosaicImg === 'function') ? mosaicImg(mix.cands, 'mix' + mix.id, mcardW, 6) : null;
      if(miBmp){
        gr.DrawImage(miBmp, mx, my, mcardW, mcardW, 0, 0, miBmp.Width, miBmp.Height, 0, 255);
      } else {
        var sH = (mix.single && typeof mix.single === 'object' && mix.single.Path) ? mix.single : (mix.handles && mix.handles.length ? mix.handles[0] : null);
        drawRounded(gr, mx, my, mcardW, 6, sH, mix.title);
      }

      // Bottom gradient on art
      gr.FillGradRect(mx, my + mcardW - 32, mcardW, 32, 90, RGBA(0, 0, 0, 0), RGBA(0, 0, 0, 200));

      // Pill tag
      var mixCol = mixAccents[mi % mixAccents.length];
      gr.FillRoundRect(mx + 8, my + mcardW - 24, 78, 18, 4, 4, RGBA(0, 0, 0, 170));
      gr.FillSolidRect(mx + 8, my + mcardW - 24, 3, 18, mixCol);
      tL(gr, 'DAILY MIX', FONT.eyebrow, COL.text, mx + 16, my + mcardW - 24, 68, 18);

      // Play button on hover
      var mpb = 40, mpbx = mx + mcardW - mpb - 8, mpby = my + mcardW - mpb - 8;
      if(mHov){
        var pbHot = hv(mpbx, mpby, mpbx + mpb, mpby + mpb);
        gr.FillEllipse(mpbx, mpby, mpb, mpb, pbHot ? RGB(45, 230, 115) : COL.green);
        drawIcon(gr, 'play', COL.black, mpbx, mpby, mpb, mpb, 18);
      }

      // Title & Description
      var mty = my + mcardW + 8;
      tL(gr, mix.title, FONT.card, mHov ? COL.green : COL.text, mx, mty, mcardW, 20);
      tL(gr, mix.desc || mix.category, FONT.plSub, COL.text2, mx, mty + 20, mcardW, 32);

      var vmy0 = Math.max(my - 6, gy), vmy1 = Math.min(my + mcardH + 6, cropY);
      if(vmy1 > vmy0){
        HB_CARD.push({ x0: mx - 6, y0: vmy0, x1: mx + mcardW + 6, y1: vmy1, kind: 'daily_mix', id: mix.id, pbx: mpbx, pby: mpby, pb: mpb });
      }
    }
    cy += mixSecH;
  }

  // ---- Render Audiophile Smart Vaults Section ----
  var smTitleY = cy;
  if(smTitleY + 28 > gy && smTitleY < cropY){
    tL(gr, 'Audiophile Vaults & Smart Collections', FONT.sect2, COL.text, x0, smTitleY, w - 120, 28);
  }
  var smCardsY = smTitleY + 34;
  var smartDefs = [
    { kind: 'smart_vault', title: '24-bit Hi-Res Vault', sub: 'Studio Master Quality (>= 24-bit / DSD)', icon: 'sparkle', col: RGB(16, 185, 129) },
    { kind: 'smart_forgotten', title: 'Forgotten Gems', sub: 'High-affinity tracks from your library', icon: 'clock', col: RGB(6, 182, 212) },
    { kind: 'smart_rotation', title: 'Heavy Rotation', sub: 'Your most-played favorites on repeat', icon: 'equalizer', col: RGB(245, 158, 11) }
  ];

  for(var si = 0; si < scols && si < smartDefs.length; si++){
    var sx = x0 + si * (scardW2 + gap), sy = smCardsY;
    if(sy >= cropY) break;
    if(sy + scardH2 <= gy) continue;

    var sd = smartDefs[si];
    var sHov = hv(sx - 4, Math.max(sy - 4, gy), sx + scardW2 + 4, Math.min(sy + scardH2 + 4, cropY));
    gr.FillRoundRect(sx, sy, scardW2, scardH2, 8, 8, sHov ? COL.rowHover : COL.elev);

    // Left Icon Badge Box
    var ibs = 48, ibx = sx + 14, iby = sy + Math.floor((scardH2 - ibs) / 2);
    gr.FillRoundRect(ibx, iby, ibs, ibs, 6, 6, RGBA(255, 255, 255, 14));
    drawIcon(gr, sd.icon, sd.col, ibx, iby, ibs, ibs, 24);

    // Text details
    var stx = ibx + ibs + 12, stw = scardW2 - (stx - sx) - 48;
    tL(gr, sd.title, FONT.card, sHov ? COL.green : COL.text, stx, sy + 18, stw, 20);
    tL(gr, sd.sub, FONT.plSub, COL.text2, stx, sy + 40, stw, 16);

    // Play button on right
    var spb = 34, spbx = sx + scardW2 - spb - 12, spby = sy + Math.floor((scardH2 - spb) / 2);
    if(sHov){
      gr.FillEllipse(spbx, spby, spb, spb, COL.green);
      drawIcon(gr, 'play', COL.black, spbx, spby, spb, spb, 16);
    }

    var vsy0 = Math.max(sy - 4, gy), vsy1 = Math.min(sy + scardH2 + 4, cropY);
    if(vsy1 > vsy0){
      HB_CARD.push({ x0: sx - 4, y0: vsy0, x1: sx + scardW2 + 4, y1: vsy1, kind: sd.kind, pbx: spbx, pby: spby, pb: spb });
    }
  }
  cy += smartSecH;

  // ---- Render Recently Played (History) Section ----
  if(recPlays.length){
    var pTitleY=cy;
    if(pTitleY+28>gy && pTitleY<cropY){
      tL(gr,'Recently Played',FONT.sect2,COL.text,x0,pTitleY,w-120,28);
    }
    var pCardsY=pTitleY+34;
    for(var pi=0; pi<recPlays.length && pi<cols; pi++){
      var px=x0+pi*(pcardW+gap), py=pCardsY;
      if(py>=cropY) break;
      if(py+pcardH<=gy) continue;

      var it=recPlays[pi];
      var pHov=hv(px-6,Math.max(py-6,gy),px+pcardW+6,Math.min(py+pcardH+6,cropY));

      if(pHov) gr.FillRoundRect(px-6,py-6,pcardW+12,pcardH+12,8,8,COL.rowHover);

      var h=it.handle||(typeof getHandleByPath==='function'?getHandleByPath(it.path):null);
      if(h && !it.handle) it.handle=h;
      drawRounded(gr,px,py,pcardW,6,h,it.album||it.title);

      // Play button on hover
      var pb=40, pbx=px+pcardW-pb-8, pby=py+pcardW-pb-8;
      if(pHov){
        gr.FillEllipse(pbx,pby,pb,pb,COL.green);
        drawIcon(gr,'play',COL.black,pbx,pby,pb,pb,18);
      }

      // Title & Artist
      var pty=py+pcardW+8;
      tL(gr,it.title,FONT.card,pHov?COL.green:COL.text,px,pty,pcardW,20);
      tL(gr,it.artist,FONT.plSub,COL.text2,px,pty+20,pcardW,16);

      // Relative time tag
      var pTagH=18, pTagW=Math.min(pcardW,84), pTagY=pty+38;
      gr.FillRoundRect(px,pTagY,pTagW,pTagH,4,4,RGBA(255,255,255,14));
      tC(gr,fmtRelativeTime(it.time),FONT.eyebrow,COL.text2,px,pTagY,pTagW,pTagH);

      var vpy0=Math.max(py-6,gy), vpy1=Math.min(py+pcardH+6,cropY);
      if(vpy1>vpy0){
        HB_CARD.push({x0:px-6,y0:vpy0,x1:px+pcardW+6,y1:vpy1,kind:'recent_play',item:it,px:px,py:py,pcardW:pcardW,pcardH:pcardH,pbx:pbx,pby:pby,pb:pb});
      }
    }
    cy+=playSecH;
  }

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
      var rHov=hv(rx-6,Math.max(ry-6,gy),rx+rcardW+6,Math.min(ry+rcardH+6,cropY));

      if(rHov) gr.FillRoundRect(rx-6,ry-6,rcardW+12,rcardH+12,8,8,COL.rowHover);

      drawRounded(gr,rx,ry,rcardW,6,tr.handle,tr.title);

      // Play button on hover
      var rpb=40, rpbx=rx+rcardW-rpb-8, rpby=ry+rcardW-rpb-8;
      if(rHov){
        gr.FillEllipse(rpbx,rpby,rpb,rpb,COL.green);
        drawIcon(gr,'play',COL.black,rpbx,rpby,rpb,rpb,18);
      }

      // Title & Artist
      var rty=ry+rcardW+8;
      tL(gr,tr.title,FONT.card,rHov?COL.green:COL.text,rx,rty,rcardW,20);
      tL(gr,tr.artist,FONT.plSub,COL.text2,rx,rty+20,rcardW,16);

      // "NEW RELEASE · ALBUM" tag
      var tagH=18, tagW=Math.min(rcardW, 90), tagY=rty+38;
      gr.FillRoundRect(rx,tagY,tagW,tagH,4,4,RGBA(30,215,96,28));
      tC(gr,'ALBUM',FONT.eyebrow,COL.green,rx,tagY,tagW,tagH);

      var vry0=Math.max(ry-6,gy), vry1=Math.min(ry+rcardH+6,cropY);
      if(vry1>vry0){
        HB_CARD.push({x0:rx-6,y0:vry0,x1:rx+rcardW+6,y1:vry1,kind:'recent_song',track:tr,rx:rx,ry:ry,rcardW:rcardW,rcardH:rcardH,pbx:rpbx,pby:rpby,pb:rpb});
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
    var startRow = Math.max(0, Math.floor((gy - gridTop) / rowStep));
    for(i=startRow*cols; i<arts.length; i++){
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
