/* flacify/views/nav.js -- left sidebar: nav rows, playlist list, add-playlist footer
   Part of FLACify, the lossless Spotify-style experience for foobar2000. Loaded by main.js;
   every module shares one global scope, so load order is set there. */

var HB_ALBUMS=null, HB_ARTISTS=null, HB_ARTIST_SYNC=null, HB_LIKED=null, HB_HISTORY=null, HB_ANALYTICS=null;
// one sidebar row: cover + name + subtitle. pi<0 draws the library mosaic instead of a playlist cover.
function drawNavRow(gr,y,h,on,hov,pi,name,sub){
  if(on||hov) gr.FillRoundRect(R.navLib.x+8,y,R.navLib.w-16,h-4,6,6,on?COL.rowActive:COL.rowHover);
  var cs=38, cx=R.navLib.x+16, cy=y+(h-cs)/2;
  if(pi>=0) drawPlCover(gr,cx,cy,cs,4,pi,name);
  else if(pi===-1) drawLibCover(gr,cx,cy,cs,4);
  else if(pi===-2){
    gr.FillRoundRect(cx,cy,cs,cs,4,4,RGBA(255,255,255,16));
    drawIcon(gr,'album',on?COL.green:COL.text2,cx,cy,cs,cs,20);
  } else if(pi===-3){
    gr.FillEllipse(cx,cy,cs,cs,RGBA(255,255,255,16));
    drawIcon(gr,'artist',on?COL.green:COL.text2,cx,cy,cs,cs,18);
  } else if(pi===-4){
    gr.FillEllipse(cx,cy,cs,cs,RGBA(255,255,255,16));
    drawIcon(gr,'sync',on?COL.green:COL.text2,cx,cy,cs,cs,18);
  } else if(pi===-5){
    drawLikedCover(gr,cx,cy,cs,4);
  } else if(pi===-6){
    gr.FillRoundRect(cx,cy,cs,cs,4,4,RGBA(255,255,255,16));
    drawIcon(gr,'clock',on?COL.green:COL.text2,cx,cy,cs,cs,18);
  } else if(pi===-7){
    gr.FillRoundRect(cx,cy,cs,cs,4,4,RGBA(255,255,255,16));
    drawIcon(gr,'chart',on?COL.green:COL.text2,cx,cy,cs,cs,18);
  } else {
    gr.FillEllipse(cx,cy,cs,cs,RGBA(255,255,255,16));
    drawIcon(gr,'home',on?COL.green:COL.text2,cx,cy,cs,cs,18);
  }
  var tx=cx+cs+12, tw=R.navLib.x+R.navLib.w-16-tx-((hov&&pi>=0)?26:0);   // leave room for the "..." button
  tL(gr,name,FONT.pl,on?COL.green:COL.text,tx,y+6,tw,20);
  tL(gr,sub,FONT.plSub,COL.text2,tx,y+26,tw,16);
}
function drawNav(gr){
  HB_PL=[];
  // top card: Home + Search as two wide icon buttons spanning the sidebar
  panelBg(gr,R.navTop,COL.base);
  var m=16, g=12, bh=54, iy=R.navTop.y+Math.round((R.navTop.h-bh)/2);
  var bw=Math.floor((R.navTop.w-2*m-g)/2);
  var hx=R.navTop.x+m, sx2=hx+bw+g;
  var hon=(view==='home'), hhov=hv(hx,iy,hx+bw,iy+bh);
  if(hon||hhov) gr.FillRoundRect(hx,iy,bw,bh,10,10,hon?COL.rowActive:COL.rowHover);
  drawIcon(gr,'home',hon?COL.text:COL.text2,hx,iy,bw,bh,26);
  HB_HOME={x0:hx,y0:iy,x1:hx+bw,y1:iy+bh};
  var son=(view==='search'), shov=hv(sx2,iy,sx2+bw,iy+bh);
  if(son||shov) gr.FillRoundRect(sx2,iy,bw,bh,10,10,son?COL.rowActive:COL.rowHover);
  drawIcon(gr,'search',son?COL.text:COL.text2,sx2,iy,bw,bh,26);
  HB_SEARCH={x0:sx2,y0:iy,x1:sx2+bw,y1:iy+bh};
  // The canvas gap between the two cards is inside the region repaintNavAll invalidates but is
  // painted by neither of them -- it used to survive only because a full paint cleared the whole
  // window first, so drawNav has to own it now.
  var gapY=R.navTop.y+R.navTop.h;
  gr.FillSolidRect(R.navTop.x,gapY,R.navTop.w,R.navLib.y-gapY,COL.black);
  // library card
  panelBg(gr,R.navLib,COL.base);
  tL(gr,'Your Library',FONT.lib,COL.text2,R.navLib.x+18,R.navLib.y+14,R.navLib.w-56,26);
  var ap=activePl();
  var active=ap.i, pls=visiblePlaylists();
  var footH=72, footTop=R.navLib.y+R.navLib.h-footH;   // pinned "add playlist" footer, always visible
  var pinY0=R.navLib.y+44, pinH=38;                    // pinned "Liked Songs" row
  var pinY1=pinY0+pinH+2;                              // pinned "All Songs" row
  var pinY2=pinY1+pinH+2;                              // pinned "Albums" row
  var pinY3=pinY2+pinH+2;                              // pinned "Artists" row
  var pinY4=pinY3+pinH+2;                              // pinned "History" row
  var pinY5=pinY4+pinH+2;                              // pinned "Artist Sync" row
  var pinY6=pinY5+pinH+2;                              // pinned "Analytics" row
  // scrollable playlist list (continuous pixel scroll), cropped just above the footer
  var listTop=pinY6+pinH+8, rh=54, cropY=footTop-6, viewH=cropY-listTop;
  var contentH=pls.length*rh, maxPx=Math.max(0,contentH-viewH);
  NAV_MAX=maxPx;
  navScroll=clampPx(navScroll,maxPx); navScrollT=clampPx(navScrollT,maxPx);
  // honour a pending "scroll this playlist into view" request now that the row geometry is known
  if(navRevealPl>=0){
    var rk=-1, ri; for(ri=0;ri<pls.length;ri++){ if(pls[ri]===navRevealPl){ rk=ri; break; } }
    navRevealPl=-1;
    if(rk>=0){
      var rt=rk*rh, want=navScrollT;
      if(rt<want) want=rt;                                 // above the viewport: bring it to the top edge
      else if(rt+rh>want+viewH) want=rt+rh-viewH;          // below it: bring it to the bottom edge
      want=Math.max(0,Math.min(want,maxPx));
      if(want!==navScrollT){ navScrollT=want; startScrollAnim(); }   // eased, same as wheel scrolling
    }
  }
  for(var k=Math.floor(navScroll/rh); k<pls.length; k++){
    var ry=listTop+k*rh-navScroll; if(ry>=cropY) break;
    var i2=pls[k], nm=plName(i2);
    // clamp hover + click targets to the visible band: a row scrolled under the pinned
    // header is painted over, so it must not answer the mouse there either
    var hy0=Math.max(ry,listTop), hy1=Math.min(ry+rh,cropY);
    var rowHov=(hy1>hy0) && hv(R.navLib.x,hy0,R.navLib.x+R.navLib.w,hy1);
    drawNavRow(gr,ry,rh,view==='playlist'&&i2===active,rowHov,i2,nm,plCount(i2)+' songs');
    if(rowHov && ry>=listTop) drawDots(gr,R.navLib.x+R.navLib.w-32,ry+(rh-24)/2,i2);
    if(hy1>hy0) HB_PL.push({x0:R.navLib.x,y0:hy0,x1:R.navLib.x+R.navLib.w,y1:hy1,i:i2});
  }
  // crop partial rows top & bottom, redraw the sticky header block, then the scrollbar
  gr.FillSolidRect(R.navLib.x,R.navLib.y+M.radius+2,R.navLib.w,listTop-R.navLib.y-M.radius-2,COL.base);
  gr.FillSolidRect(R.navLib.x,cropY,R.navLib.w,R.navLib.y+R.navLib.h-cropY,COL.base);
  tL(gr,'Your Library',FONT.lib,COL.text2,R.navLib.x+18,R.navLib.y+14,R.navLib.w-56,26);

  var likedPl=getLikedPlaylistIndex(false);
  var isLikedView=(view==='playlist'&&active===likedPl);
  drawNavRow(gr,pinY0,pinH,isLikedView,hv(R.navLib.x,pinY0,R.navLib.x+R.navLib.w,pinY0+pinH),-5,'Liked Songs',fmtNum(likedCount)+' songs');
  HB_LIKED={x0:R.navLib.x,y0:pinY0,x1:R.navLib.x+R.navLib.w,y1:pinY0+pinH};

  drawNavRow(gr,pinY1,pinH,view==='songs',hv(R.navLib.x,pinY1,R.navLib.x+R.navLib.w,pinY1+pinH),-1,'All Songs',fmtNum(libCount())+' songs');
  HB_ALLSONGS={x0:R.navLib.x,y0:pinY1,x1:R.navLib.x+R.navLib.w,y1:pinY1+pinH};

  drawNavRow(gr,pinY2,pinH,view==='albums'||view==='album',hv(R.navLib.x,pinY2,R.navLib.x+R.navLib.w,pinY2+pinH),-2,'Albums',fmtNum(getAlbumList().length)+' albums');
  HB_ALBUMS={x0:R.navLib.x,y0:pinY2,x1:R.navLib.x+R.navLib.w,y1:pinY2+pinH};

  drawNavRow(gr,pinY3,pinH,view==='artists'||view==='artist',hv(R.navLib.x,pinY3,R.navLib.x+R.navLib.w,pinY3+pinH),-3,'Artists',fmtNum(getArtistList().length)+' artists');
  HB_ARTISTS={x0:R.navLib.x,y0:pinY3,x1:R.navLib.x+R.navLib.w,y1:pinY3+pinH};

  drawNavRow(gr,pinY4,pinH,view==='history',hv(R.navLib.x,pinY4,R.navLib.x+R.navLib.w,pinY4+pinH),-6,'History','Recently played');
  HB_HISTORY={x0:R.navLib.x,y0:pinY4,x1:R.navLib.x+R.navLib.w,y1:pinY4+pinH};

  drawNavRow(gr,pinY5,pinH,view==='artist_sync',hv(R.navLib.x,pinY5,R.navLib.x+R.navLib.w,pinY5+pinH),-4,'Artist Sync','Cloud media manager');
  HB_ARTIST_SYNC={x0:R.navLib.x,y0:pinY5,x1:R.navLib.x+R.navLib.w,y1:pinY5+pinH};

  drawNavRow(gr,pinY6,pinH,view==='analytics',hv(R.navLib.x,pinY6,R.navLib.x+R.navLib.w,pinY6+pinH),-7,'Analytics','Wrapped & telemetry');
  HB_ANALYTICS={x0:R.navLib.x,y0:pinY6,x1:R.navLib.x+R.navLib.w,y1:pinY6+pinH};

  gr.DrawLine(R.navLib.x+16,listTop-6,R.navLib.x+R.navLib.w-16,listTop-6,1,COL.line);
  drawScrollbarN(gr,R.navLib.x+R.navLib.w-9,listTop,viewH,navScroll,maxPx,viewH,contentH,hv(R.navLib.x,R.navLib.y,R.navLib.x+R.navLib.w,R.navLib.y+R.navLib.h)||drag==='scrolln');
  drawAddPlaylist(gr,footTop,footH);
}
// pinned sidebar footer: click to create a blank playlist, or drop files on it to import
function drawAddPlaylist(gr,footTop,footH){
  var bx=R.navLib.x+12, bw=R.navLib.w-24, by=footTop+6, bh=footH-16;
  var hot=hv(bx,by,bx+bw,by+bh), drop=navDropHover;
  var rad=Math.min(10,bw/2,bh/2);
  if(drop)      gr.FillRoundRect(bx,by,bw,bh,rad,rad,RGBA(30,215,96,26));
  else if(hot)  gr.FillRoundRect(bx,by,bw,bh,rad,rad,COL.rowHover);
  strokeRound(gr,bx,by,bw,bh,rad,drop?2:1,drop?COL.green:(hot?COL.text3:COL.line));
  // circular badge, echoing the empty-playlist state in the main panel
  var bs=30, ax=bx+13, ay=by+Math.round((bh-bs)/2);
  gr.FillEllipse(ax,ay,bs,bs,drop?RGBA(30,215,96,46):RGBA(255,255,255,hot?26:16));
  drawIcon(gr,'add',drop?COL.green:(hot?COL.text:COL.text2),ax,ay,bs,bs,18);
  var tx=ax+bs+12, tw=bx+bw-12-tx;
  if(drop){ tL(gr,'Drop to import',FONT.pl,COL.green,tx,by+Math.round((bh-20)/2),tw,20); }
  else {
    var ty=by+Math.round((bh-35)/2);          // two-line block, optically centred
    tL(gr,'New playlist',FONT.pl,hot?COL.text:COL.text2,tx,ty,tw,19);
    tL(gr,'drag a file or click',FONT.plSub,COL.text3,tx,ty+19,tw,16);
  }
  HB_ADDPL={x0:bx,y0:by,x1:bx+bw,y1:by+bh};
}
