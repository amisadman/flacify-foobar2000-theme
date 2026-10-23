/* flacify/app.js -- panel state, layout, paint dispatch, input, and foobar callbacks
   Part of FLACify, the lossless Spotify-style experience for foobar2000. Loaded by main.js;
   every module shares one global scope, so load order is set there. */

/* ------------------------- state ------------------------- */
var W=window.Width, H=window.Height, R={}, NP=null, npTitleStr='', npArtistStr='';
// Repaint scope flags. dirtyAll (sticky) forces a full paint; partial flags accumulate.
// A full window.Repaint() MUST set dirtyAll (use repaintAll) so a paint serviced while a
// partial flag is pending can't blank the rest of the window.
var dirtyAll=true, dirtyBar=false, dirtyQueue=false, dirtySearch=false, dirtyMain=false, dirtyNav=false, dirtyTitle=false, dirtyViz=false;
function clearDirty(){ dirtyAll=dirtyBar=dirtyQueue=dirtySearch=dirtyMain=dirtyNav=dirtyTitle=dirtyViz=false; }
/* When the oldest pending partial flag was raised. A RepaintRect is serviced within a frame or two,
   so a flag still pending long after it went up means its paint was DEFERRED -- the window was
   minimised, and a minimised window gets no WM_PAINT. The paint that finally arrives on restore is
   the OS repainting the whole window onto a fresh surface, not the region we asked for; taking the
   partial path then drew one panel and left the rest a flat grey until something was hovered. The
   1 Hz clock guarantees a pending flag whenever the window is minimised mid-song, and the mouse
   leaving for the taskbar raises one even when paused. Every partial setter calls markDirty() FIRST,
   so the clock records the oldest flag rather than being reset by each new one. */
var dirtySince=0, DIRTY_STALE_MS=250;
function anyDirty(){ return dirtyBar||dirtyQueue||dirtySearch||dirtyMain||dirtyNav||dirtyTitle||dirtyViz; }
function markDirty(){ if(!anyDirty()) dirtySince=Date.now(); }
function repaintAll(){ dirtyAll=true; window.Repaint(); }
/* Main's views draw the row/card straddling their crop line at full height and mask only the
   10px gutter below it (see the FillSolidRect(r.x,cropY,...) in each), so the remainder lands on
   the player bar. drawBar runs after main in the partial path, so pairing them covers it -- and
   it is far cheaper than the full-window repaint that used to hide this. */
function repaintMain(){ markDirty(); dirtyMain=true; window.RepaintRect(R.main.x,R.main.y,R.main.w,R.main.h); repaintBar(); }
function repaintNav(){ markDirty(); dirtyNav=true; window.RepaintRect(R.navLib.x,R.navLib.y,R.navLib.w,R.navLib.h); }
// drawNav paints both nav cards, so a hover crossing between them must invalidate their union
function repaintNavAll(){ markDirty(); dirtyNav=true; window.RepaintRect(R.navTop.x,R.navTop.y,R.navTop.w,(R.navLib.y+R.navLib.h)-R.navTop.y); }
function repaintQueue(){ markDirty(); dirtyQueue=true; window.RepaintRect(R.queue.x,R.queue.y,R.queue.w,R.queue.h); }
// the visualizer's own band, 30 times a second -- see the fullscreen branch of on_paint
function repaintViz(){ markDirty(); dirtyViz=true; window.RepaintRect(0,VIZ_TOP,W,Math.max(0,(H-172)-VIZ_TOP)); }
function repaintTitle(){ markDirty(); dirtyTitle=true; window.RepaintRect(0,0,W,TBH); }
/* A hover only changes one panel's appearance, so repaint that panel rather than the whole
   window. Hitbox ownership is cleanly panel-aligned (HB_PL/HB_HOME/SBN -> nav, HB_CARD/HB_TR/
   SB/SBH -> main, HB_Q/HB_TABS -> queue, HB_CTRL -> bar, HB_MENU/HB_CAP -> title), so the
   cursor position alone picks the right one. */
function hoverZone(x,y){
  if(y<TBH) return 'title';
  if(R.barY!==undefined && y>=R.barY) return 'bar';
  if(R.queue && x>=R.queue.x) return 'queue';
  if(R.main && x>=R.main.x) return 'main';
  return 'nav';
}
function repaintZone(z){
  if(z==='main') repaintMain();
  else if(z==='nav') repaintNavAll();
  else if(z==='queue') repaintQueue();
  else if(z==='bar') repaintBar();
  else if(z==='title') repaintTitle();
}
var firstRow=0, hoverKey='', scrollKey='', hoverZoneKey='', mx=-1, my=-1, drag=null, dragFrac=0;   // WHEEL_PX: core/props.js
// eased scrolling: animate each rendered position toward its target, repainting only the moving region
var firstRowT=0, navScrollT=0, homeScrollT=0, PL_MAXPX=0, scrollTimer=null;
function scrollTick(){
  var mm=false, nm=false, d1=firstRowT-firstRow, d2=navScrollT-navScroll, d3=homeScrollT-homeScroll, d4=songsScrollT-songsScroll, d5=searchScrollT-searchScroll, d6=plScrollT-plScroll;
  var d7=albumScrollT-albumScroll, d8=albumsScrollT-albumsScroll, d9=(typeof artistsScrollT!=='undefined'?artistsScrollT-artistsScroll:0);
  var d10=(typeof songDetScrollT!=='undefined'?songDetScrollT-songDetScroll:0);
  var d11=(typeof artistScrollT!=='undefined'?artistScrollT-artistScroll:0);
  var d12=(typeof artistSyncScrollT!=='undefined'?artistSyncScrollT-artistSyncScroll:0);
  var d13=(typeof historyScrollT!=='undefined'?historyScrollT-historyScroll:0);
  var d14=(typeof ANALYTICS_SCROLL_T!=='undefined'?ANALYTICS_SCROLL_T-ANALYTICS_SCROLL:0);
  if(Math.abs(d1)>=0.5){ firstRow+=d1*0.25; mm=true; } else firstRow=firstRowT;
  if(Math.abs(d3)>=0.5){ homeScroll+=d3*0.25; mm=true; } else homeScroll=homeScrollT;
  if(Math.abs(d4)>=0.5){ songsScroll+=d4*0.25; mm=true; } else songsScroll=songsScrollT;
  if(Math.abs(d5)>=0.5){ searchScroll+=d5*0.25; mm=true; } else searchScroll=searchScrollT;
  if(Math.abs(d6)>=0.5){ plScroll+=d6*0.25; mm=true; } else plScroll=plScrollT;
  if(Math.abs(d7)>=0.5){ albumScroll+=d7*0.25; mm=true; } else albumScroll=albumScrollT;
  if(Math.abs(d8)>=0.5){ albumsScroll+=d8*0.25; mm=true; } else albumsScroll=albumsScrollT;
  if(Math.abs(d9)>=0.5){ artistsScroll+=d9*0.25; mm=true; } else if(typeof artistsScrollT!=='undefined') artistsScroll=artistsScrollT;
  if(Math.abs(d10)>=0.5){ songDetScroll+=d10*0.25; repaintAll(); } else if(typeof songDetScrollT!=='undefined') songDetScroll=songDetScrollT;
  if(Math.abs(d11)>=0.5){ artistScroll+=d11*0.25; mm=true; } else if(typeof artistScrollT!=='undefined') artistScroll=artistScrollT;
  if(Math.abs(d12)>=0.5){ artistSyncScroll+=d12*0.25; mm=true; } else if(typeof artistSyncScrollT!=='undefined') artistSyncScroll=artistSyncScrollT;
  if(Math.abs(d13)>=0.5){ historyScroll+=d13*0.25; mm=true; } else if(typeof historyScrollT!=='undefined') historyScroll=historyScrollT;
  if(Math.abs(d14)>=0.5){ ANALYTICS_SCROLL+=d14*0.25; mm=true; } else if(typeof ANALYTICS_SCROLL_T!=='undefined') ANALYTICS_SCROLL=ANALYTICS_SCROLL_T;
  if(Math.abs(d2)>=0.5){ navScroll+=d2*0.25; nm=true; } else navScroll=navScrollT;
  if(mm) repaintMain();
  if(nm) repaintNav();
  // one more frame after the scroll settles, so shimSettle can restart the sweep it suppressed
  if(!mm && !nm && Math.abs(d10)<0.5 && Math.abs(d11)<0.5 && Math.abs(d12)<0.5 && Math.abs(d13)<0.5 && Math.abs(d14)<0.5){ stopScrollAnim(); if(shimCount>0) repaintMain(); }
}
function startScrollAnim(){ if(!scrollTimer) scrollTimer=window.SetInterval(scrollTick,16); }
function stopScrollAnim(){ if(scrollTimer){ window.ClearInterval(scrollTimer); scrollTimer=null; } }

function hv(x0,y0,x1,y1){ return mx>=x0 && mx<x1 && my>=y0 && my<y1; }
var HB_PL=[], HB_TR=[], HB_CTRL=[], HB_TABS=[], HB_SEEK=null, HB_VOL=null, HB_Q=[], HB_ALBUM_PLAY=null, HB_ALBUM_SHUFFLE=null, HB_ALBUM_ARTIST=null, HB_ALBUM_CTA=null, HB_ALBUM_OTHER=[];
var HB_CARD=[], HB_HOME=null, HB_CAP=null, HB_MENU=[], SB=null;
var navScroll=0, NAV_MAX=0, SBN=null, HB_ADDPL=null, navDropHover=false;
// deferred "scroll this playlist into view" -- only drawNav knows the row geometry, so it consumes this
var navRevealPl=-1;
function revealPlaylist(i){ navRevealPl=i; }
var plDropHover=false, HB_PLADD_FILES=null, HB_PLADD_FOLDER=null;   // empty-playlist "add songs" zone
// playlist edit: context menu, inline rename, delete confirm
var HB_DOTS=[], ctxMenu=null, CTX_HB=[], renameEdit=null, confirmDel=null, CONF_HB=null, RENAME_HB=null, HB_PL_COVER=null, HB_PL_PLAY=null, HB_PL_SHUFFLE=null;

var rightTab='queue';
var view='home', homeScroll=0, artScroll=0;

/* ------------------------- navigation history (Spotify-style) ------------------------- */
var navHistory=[{view:'home'}], navHistIdx=0, navSuppressPush=false;
function pushNav(newView, opts){
  if(navSuppressPush) return;
  var cur=navHistory[navHistIdx];
  opts=opts||{};
  if(cur && cur.view===newView){
    if(newView==='artist' && cur.artist===opts.artist) return;
    if(newView==='album' && cur.album===opts.album && cur.artist===opts.artist) return;
    if(newView==='playlist' && cur.pl===opts.pl) return;
    if(newView!=='artist' && newView!=='album' && newView!=='playlist') return;
  }
  if(navHistIdx<navHistory.length-1){
    navHistory=navHistory.slice(0,navHistIdx+1);
  }
  var entry={view:newView};
  for(var k in opts){ entry[k]=opts[k]; }
  navHistory.push(entry);
  navHistIdx=navHistory.length-1;
  if(navHistory.length>40){ navHistory.shift(); navHistIdx--; }
}
function applyNavEntry(entry){
  if(!entry) return;
  navSuppressPush=true;
  view=entry.view;
  if(view==='artist'){
    if(entry.artist) loadArtist(entry.artist);
    artScroll=0;
    artistScroll=artistScrollT=0;
  } else if(view==='album'){
    if(entry.album) loadAlbum(entry.album,entry.artist);
    albumScroll=albumScrollT=0;
  } else if(view==='playlist'){
    if(entry.pl!==undefined && entry.pl>=0 && entry.pl<plman.PlaylistCount) plman.ActivePlaylist=entry.pl;
    firstRow=firstRowT=0;
  } else if(view==='songs'){
    songsScroll=songsScrollT=0;
  } else if(view==='albums'){
    albumsScroll=albumsScrollT=0;
  } else if(view==='artists'){
    artistsScroll=artistsScrollT=0;
  } else if(view==='search'){
    searchScroll=searchScrollT=0;
  } else if(view==='artist_sync'){
    artistSyncScroll=artistSyncScrollT=0;
    startSyncProgressPoll();
  } else if(view==='history'){
    historyScroll=historyScrollT=0;
  } else if(view==='analytics'){
    ANALYTICS_SCROLL=ANALYTICS_SCROLL_T=0;
  } else if(view==='home'){
    homeScroll=homeScrollT=0;
  }
  navSuppressPush=false;
  repaintAll();
}
function navCanBack(){ return navHistIdx>0; }
function navCanForward(){ return navHistIdx<navHistory.length-1; }
function navBack(){ if(navCanBack()){ navHistIdx--; applyNavEntry(navHistory[navHistIdx]); } }
function navForward(){ if(navCanForward()){ navHistIdx++; applyNavEntry(navHistory[navHistIdx]); } }
// Fullscreen "chill" mode + its sub-view (default now-playing / lyrics / visualizer)
var fsMode=false, fsView='default', HB_FS=[], vizTimer=null, vizBars=[];
function applyKeyMode(){ try{ window.DlgCode=(view==='search'||renameEdit||(typeof artistStudioModal!=='undefined'&&artistStudioModal)||(typeof inlineFilterOpen!=='undefined'&&inlineFilterOpen))?DLGC_WANTALLKEYS:0; }catch(e){} }

var searchQuery='', searchScroll=0, searchScrollT=0, searchIdx=null, searchQ2=null, searchArts=[], searchTrks=[], HB_SEARCH=null;
var HOME_MAXROW=0, ART_MAXBLOCK=0, SEARCH_MAXPX=0;
// Home "Your Playlists" horizontal shelf: pixel scroll offset + eased target, max, wheel hit-band, h-scrollbar.
var plScroll=0, plScrollT=0, HOME_PLMAX=0, HOME_SHELF_Y0=0, HOME_SHELF_Y1=0, SBH=null;
// The shelf glides freely but always *targets* a card boundary, so the leftmost card keeps its
// rounded edge instead of being cut mid-body (COL.elev against COL.base reads as a seam).
// HOME_STRIDE is published by drawHome, which is the only place the card pitch is known.
var HOME_STRIDE=0;
function snapShelf(px){ var st=HOME_STRIDE||1; return clampPx(Math.round(px/st)*st,HOME_PLMAX); }


function layout(){
  var g=M.gap, top0=TBH+g;   // one uniform gap on every side, incl. below the title bar and above the bar
  R.barY=H-M.barH;
  R.top={x:g,y:top0,bottom:R.barY-g};
  R.navX=g; R.navW=M.navW;
  R.queueW=M.queueW; R.queueX=W-g-R.queueW;
  R.mainX=R.navX+R.navW+g; R.mainW=R.queueX-g-R.mainX;
  var topH=R.top.bottom-R.top.y;
  R.navTop={x:R.navX,y:top0,w:R.navW,h:M.navTopH};
  R.navLib={x:R.navX,y:top0+M.navTopH+g*2,w:R.navW,h:topH-M.navTopH-g*2};   // wider gap to the library card
  R.main={x:R.mainX,y:top0,w:R.mainW,h:topH};
  R.queue={x:R.queueX,y:top0,w:R.queueW,h:topH};
  // frameless; the title-bar strip minus our 3 buttons becomes an OS caption (drag/dbl-click)
  if(UIWizard){ try{ UIWizard.FrameStyle=3; UIWizard.MoveStyle=0; UIWizard.DisableWindowSizing=false; }catch(e){} }
  capW=-1; applyCaption();
  applyKeyMode();
}
// bitmaps are keyed by geometry; and the panel's surface is rebuilt, so the next paint must be full
function on_size(w,h){ W=w; H=h; layout(); plCardCache={}; artCardCache={}; artCardN=0; skelImgs={}; dirtyAll=true; }

// name/count for active playlist use live interop so shifting indices never desync
function activePl(){
  var i=plman.ActivePlaylist;
  var curName = (i>=0 && i<plman.PlaylistCount) ? plman.GetPlaylistName(i) : '';
  if(i<0 || isHiddenPl(curName)){
    var cur = (typeof navHistory!=='undefined' && typeof navHistIdx!=='undefined') ? navHistory[navHistIdx] : null;
    var curPlName = (cur && cur.view==='playlist' && cur.pl!==undefined && cur.pl>=0 && cur.pl<plman.PlaylistCount) ? plman.GetPlaylistName(cur.pl) : '';
    if(curPlName && !isHiddenPl(curPlName)){
      i = cur.pl;
      curName = curPlName;
    } else {
      var vis = (typeof visiblePlaylists==='function') ? visiblePlaylists() : [];
      i = (vis && vis.length) ? vis[0] : 0;
      curName = (i>=0 && i<plman.PlaylistCount) ? plman.GetPlaylistName(i) : '';
    }
  }
  return {i:i, name:curName, count:i>=0?plCount(i):0};
}
function updateNP(){
  var m=(fb.IsPlaying||fb.IsPaused)?fb.GetNowPlaying():null;
  NP=m;
  npTitleStr=m?TF.npTitle.EvalWithMetadb(m):'';
  npArtistStr=m?TF.npArtist.EvalWithMetadb(m):'';
  if(typeof refreshNowPlayingGlow==='function') refreshNowPlayingGlow(false);
}
function repaintBar(){ if(fsMode){ repaintAll(); return; } markDirty(); dirtyBar=true; window.RepaintRect(0,R.barY,W,M.barH); }

/* Only frames that actually redraw main may settle the shimmer -- a bar-only repaint (the 1Hz
   clock) would otherwise count zero skeletons and stop the animation while one is on screen. */
function drawMainCounted(gr){
  shimCount=0; gateWaiting=0;
  drawMain(gr); roundTop(gr,R.main.x,R.main.y,R.main.w);
  shimSettle();
}
function on_paint(gr){
  visPlCache=null;   // one playlist scan per frame, shared by drawNav and drawHome
  gr.SetSmoothingMode(2);
  gr.SetInterpolationMode(5);   // NearestNeighbor: every DrawImage here is 1:1, so filtering is pure cost
  var stale=anyDirty() && (Date.now()-dirtySince)>DIRTY_STALE_MS;   // see markDirty
  if(fsMode){
    /* A visualizer frame changes only the bars. Redrawing the cover, the title, the seek bar and
       the whole transport underneath them 30 times a second was most of the frame's cost, so a
       frame flagged ONLY by the viz repaints just that band. Any other flag (or a paint we did not
       ask for) still takes the full path, so nothing can be left stale behind the bars. */
    var vizOnly=dirtyViz && !stale && fsView==='viz' && !vizMenuOpen && !dirtyAll && !dirtyBar && !dirtyMain
                && !dirtyNav && !dirtyQueue && !dirtySearch && !dirtyTitle;
    clearDirty();
    if(vizOnly){ drawVizBand(gr); return; }
    HB_DOTS=[]; drawFullscreen(gr); return;
  }
  var anyPartial=dirtyBar||dirtyQueue||dirtySearch||dirtyMain||dirtyNav||dirtyTitle;
  // A partial paint skips drawOverlays, so a modal's dim backdrop would not be reapplied over the
  // region it redraws (the bar's 1 Hz repaint would flash back to full brightness). While an
  // overlay owns the screen, every paint takes the full path.
  var modal=renameEdit||ctxMenu||confirmDel||dupPrompt||songDetails||(typeof artistStudioModal!=='undefined'&&artistStudioModal)||(typeof eqModal!=='undefined'&&eqModal);
  if(dirtyAll || !anyPartial || modal || stale){ // full paint, or an OS/stale paint we can't scope
    clearDirty();
    HB_DOTS=[];
    gr.FillSolidRect(0,0,W,H,COL.black);   // black canvas -> panels read as separated cards (Spotify look)
    drawTitleBar(gr);
    // main before nav: the home shelf's leftmost card is drawn partly outside the panel
    // (continuous scroll), so nav must repaint over that bleed -- same reason queue follows main
    drawMainCounted(gr);
    drawNav(gr);
    drawQueue(gr);
    drawBar(gr);
    drawOverlays(gr);
    return;
  }
  // partial composite: only the regions actually flagged (each drawn over live content)
  if(dirtyTitle){ dirtyTitle=false; drawTitleBar(gr); }
  if(dirtyMain||dirtyNav) HB_DOTS=[];   // these rebuild their hover targets
  if(dirtyMain){ dirtyMain=false; drawMainCounted(gr); }
  if(dirtyNav){ dirtyNav=false; drawNav(gr); }
  if(dirtyQueue){ dirtyQueue=false; drawQueue(gr); }
  if(dirtySearch){ dirtySearch=false; if(view==='search') drawSearchBox(gr,R.main); }
  if(dirtyBar){ dirtyBar=false; drawBar(gr); }
}

function drawMain(gr){
  HB_CARD=[]; HB_TR=[]; SB=null; SBH=null; HB_BACK_BTN=null; HB_PL_COVER=null; HB_PL_PLAY=null; HB_PL_SHUFFLE=null;   // clear stale click targets from previous views
  HB_ALBUM_PLAY=null; HB_ALBUM_SHUFFLE=null; HB_ALBUM_ARTIST=null; HB_ALBUM_ARTISTS=[]; HB_ALBUM_CTA=null; HB_ALBUM_OTHER=[];
  HB_ARTIST_PLAY=null; HB_ARTIST_SHUFFLE=null; HB_ARTIST_FOLLOW=null; HB_ARTIST_SEE_MORE=null; HB_ARTIST_LATEST=null; HB_ARTIST_ALBUMS=[]; HB_ARTIST_SINGLES=[]; HB_ARTIST_APPEARS=[];
  HB_ARTIST_PHOTO=null; HB_ARTIST_EDIT_BTN=null; HB_ARTIST_EDIT_BIO_BTN=null; HB_FILTER_BTN=null; HB_INLINE_FILTER=null;
  HB_ARTISTS_SYNC_BTN=null;
  HB_SYNC_FETCH_MISSING=null; HB_SYNC_FETCH_ALL=null; HB_SYNC_STOP=null; HB_SYNC_OPEN_DIR=null; HB_SYNC_ROWS=[];
  HB_ANALYTICS_EXPORT=null; HB_PODIUM=[]; HB_ARTIST_ROW=[]; HB_HEATMAP=[];
  if(view!=='songs'){ HB_SG=null; SG_HB=[]; }
  if(view!=='playlist'){ HB_PLSORT=null; HB_PLSORTDIR=null; PL_SORT_HB=[]; }
  applyKeyMode();
  if(view==='search') startCaret(); else stopCaret();
  var r=R.main; panelBg(gr,r,COL.base);
  if(view==='home'){ drawHome(gr,r); return; }
  if(view==='search'){ drawSearch(gr,r); return; }
  if(view==='artist'){ drawArtist(gr,r); return; }
  if(view==='songs'){ drawSongs(gr,r); return; }
  if(view==='albums'){ drawAlbums(gr,r); return; }
  if(view==='album'){ drawAlbum(gr,r); return; }
  if(view==='artists'){ drawArtists(gr,r); return; }
  if(view==='artist_sync'){ drawArtistSync(gr,r); return; }
  if(view==='history'){ drawHistory(gr,r); return; }
  if(view==='analytics'){ drawAnalytics(gr,r); return; }
  drawPlaylist(gr,r);
}

/* ------------------------- input ------------------------- */
function seekFrac(x){ return HB_SEEK?clamp01((x-HB_SEEK.x)/HB_SEEK.w):0; }
function applyVol(x){
  if(HB_VOL){
    var v=pos2vol(clamp01((x-HB_VOL.x)/HB_VOL.w));
    fb.Volume=v;
    if(v>-99) lastNonMuteVol=v;
    repaintBar();
  }
}
function on_mouse_lbtn_down(x,y){
  if(songDetails){
    if(SONG_DET_SB && inRect(x,y,SONG_DET_SB)){ drag='songDetScroll'; setSongDetScroll(y); return; }
    return;
  }
  if(ctxMenu||confirmDel||renameEdit||sgMenuOpen||plSortMenuOpen||vizMenuOpen||dupPrompt||(typeof artistStudioModal!=='undefined'&&artistStudioModal)) return;   // overlays are modal; dismissal/actions handled on button-up
  if(HB_SEEK && inRect(x,y,HB_SEEK)){ drag='seek'; dragFrac=seekFrac(x); repaintBar(); return; }
  if(HB_VOL && inRect(x,y,HB_VOL)){ drag='vol'; applyVol(x); return; }
  if(SBH && inRect(x,y,SBH)){ drag='scrollh'; setScrollH(x); return; }
  if(SBN && inRect(x,y,SBN)){ drag='scrolln'; setScrollN(y); return; }
  if(SB && inRect(x,y,SB)){ drag='scroll'; setScroll(y); return; }
}
function on_mouse_rbtn_up(x,y){
  if(ctxMenu||confirmDel||renameEdit||dupPrompt||songDetails||(typeof artistStudioModal!=='undefined'&&artistStudioModal)||(typeof eqModal!=='undefined'&&eqModal)) return true;   // a modal is open: swallow
  var i;
  for(i=0;i<HB_TR.length;i++){
    if(inRect(x,y,HB_TR[i])){
      var t=HB_TR[i];
      if(t.pl!==undefined && t.item!==undefined) return openTrackMenu(t.pl,t.item,x,y);
      var h=null;
      if(t.albumRow && t.handles) h=t.handles[t.idx];
      else if(t.songs && songsTracks && songsTracks[t.ti]) h=songsTracks[t.ti].h;
      else if(t.srch && searchTrks && searchTrks[t.idx]) h=searchTrks[t.idx].h;
      else if(t.lib && artistAlbums[t.block] && artistAlbums[t.block].tracks[t.idx]) h=artistAlbums[t.block].tracks[t.idx].handle;
      else if(t.historyRow && t.path) h = typeof getHandleByPath==='function' ? getHandleByPath(t.path) : null;
      if(h) return openGenericTrackMenu(h,x,y);
    }
  }
  for(i=0;i<HB_PL.length;i++){ if(inRect(x,y,HB_PL[i])){ openPlaylistMenu(HB_PL[i].i,x,y); return true; } }
  for(i=0;i<HB_CARD.length;i++){
    if(inRect(x,y,HB_CARD[i])){
      if(HB_CARD[i].kind==='pl'){ openPlaylistMenu(HB_CARD[i].id,x,y); return true; }
      else if(HB_CARD[i].kind==='recent_play' && HB_CARD[i].item){
        var rh = HB_CARD[i].item.handle || (typeof getHandleByPath==='function'?getHandleByPath(HB_CARD[i].item.path):null);
        if(rh){ openGenericTrackMenu(rh,x,y); return true; }
      }
      else if(HB_CARD[i].kind==='recent_song' && HB_CARD[i].track && HB_CARD[i].track.handle){
        openGenericTrackMenu(HB_CARD[i].track.handle,x,y); return true;
      }
    }
  }
  return false;   // elsewhere: let JSplitter's own panel menu through (Reload / Configure / Properties)
}
function playHandleList(handles,idx){
  var arr=[]; for(var i=0;i<handles.length;i++) arr.push(handles[i]);
  var start=arr[idx];
  if(pbShuffle){ shuffleArr(arr); var ci=indexOfHandle(arr,start); if(ci>=0) arr.splice(ci,1); arr.unshift(start); shufSrcName=ROUTE; idx=0; }
  var hl=fb.CreateHandleList();
  for(i=0;i<arr.length;i++) hl.Add(arr[i]);
  var savedActive=plman.ActivePlaylist;
  var pi=plman.FindOrCreatePlaylist(ROUTE,true);
  try{ plman.ClearPlaylist(pi); }catch(e){}
  plman.InsertPlaylistItems(pi,0,hl,false);
  invalidateItems();
  plman.ExecutePlaylistDefaultAction(pi,idx);
  if(savedActive>=0 && savedActive!==pi && !isHiddenPl(plName(savedActive))){
    try{ plman.ActivePlaylist=savedActive; }catch(e){}
  }
}
function playArtistTrack(block,idx){
  var al=artistAlbums[block]; if(!al) return;
  var hs=[]; for(var i=0;i<al.tracks.length;i++) hs.push(al.tracks[i].handle);
  playHandleList(hs,idx);
}
function getSearchIdx(){
  if(searchIdx) return searchIdx;
  var lib=libItems();
  var out=[];
  if(lib && lib.Count){
    var t=libTF('title'), a=libTF('artist'), al=libTF('album'), l=libTF('len');
    for(var i=0;i<t.length;i++) out.push({h:lib[i],title:t[i],artist:a[i],album:al[i],len:l[i],key:(t[i]+' '+a[i]+' '+al[i]).toLowerCase()});
  }
  searchIdx=out; return out;
}
function computeSearch(){
  var q=searchQuery.trim().toLowerCase();
  if(q===searchQ2) return;
  searchQ2=q; searchArts=[]; searchTrks=[];
  if(!q) return;
  var arts=getArtistList(), i;
  for(i=0;i<arts.length && searchArts.length<24;i++){ if(arts[i].name.toLowerCase().indexOf(q)>=0) searchArts.push(arts[i]); }
  var idx=getSearchIdx(), cnt=0;
  for(i=0;i<idx.length && cnt<150;i++){ if(idx[i].key.indexOf(q)>=0){ searchTrks.push(idx[i]); cnt++; } }
}
/* The back button restarts the current track once it is past the first moment of it, and only
   steps back when pressed at the very start -- the rule every streaming player uses, because a
   mis-hit mid-song should not lose your place in the queue. Paused counts too: it rewinds and
   stays paused. Stopped has no position to rewind, so it steps back.
   NOTE: media keys and foobar's own menu call fb.Prev() directly and cannot be intercepted from
   a panel, so those still always step back. */
var PREV_RESTART_SEC=1;
function doPrev(){
  var t=0; try{ t=fb.PlaybackTime; }catch(e){ t=0; }
  if((fb.IsPlaying||fb.IsPaused) && t>PREV_RESTART_SEC){ try{ fb.PlaybackTime=0; return; }catch(e){} }
  fb.Prev();
}
function doCtrl(act){
  if(act==='play') fb.PlayOrPause();
  else if(act==='next') fb.Next();
  else if(act==='prev') doPrev();
  else if(act==='shuffle') toggleShuffle();
  else if(act==='repeat') cycleRepeat();
  else if(act==='fullscreen'){ enterFullscreen(); return; }
  else if(act==='mute'){ toggleMute(); return; }
  else if(act==='like'){ if(NP) toggleLike(NP); return; }
  else if(act==='details'){ if(NP){ openSongDetails(NP); } return; }
  else if(act==='device_picker'){ openAudioDeviceMenu(Math.max(16, Math.min(mx-100, W-320)), Math.max(16, my-160)); return; }
  else if(act==='eq_modal'){ openEqModal(); return; }
  else if(act==='add_to_pl'){ if(NP){ openAddToPlaylistMenu(NP, Math.max(16, Math.min(mx-80, W-260)), Math.min(my-140, H-260)); } return; }
  else if(act==='sleep_timer'){ openSleepTimerMenu(Math.max(16, Math.min(mx-70, W-220)), Math.max(16, my-190)); return; }
  repaintAll();
}
function on_mouse_lbtn_up(x,y){
  var t;
  // ---- modal overlays first ----
  if(typeof artistStudioModal!=='undefined' && artistStudioModal){
    if(ARTIST_STUDIO_HB){
      if(ARTIST_STUDIO_HB.close && inRect(x,y,ARTIST_STUDIO_HB.close)){ closeArtistStudio(); return; }
      if(ARTIST_STUDIO_HB.cancelBtn && inRect(x,y,ARTIST_STUDIO_HB.cancelBtn)){ closeArtistStudio(); return; }
      if(ARTIST_STUDIO_HB.saveBtn && inRect(x,y,ARTIST_STUDIO_HB.saveBtn)){ saveArtistStudio(); return; }
      if(ARTIST_STUDIO_HB.changePhoto && inRect(x,y,ARTIST_STUDIO_HB.changePhoto)){ chooseArtistPhoto(artistStudioModal.artist); return; }
      if(ARTIST_STUDIO_HB.resetBtn && inRect(x,y,ARTIST_STUDIO_HB.resetBtn)){
        removeArtistPhoto(artistStudioModal.artist);
        saveArtistMeta(artistStudioModal.artist, { name: artistStudioModal.artist, bio: '', fans: 0, fansFormatted: '', isCustom: false });
        closeArtistStudio();
        return;
      }
      if(ARTIST_STUDIO_HB.listenersField && inRect(x,y,ARTIST_STUDIO_HB.listenersField)){
        artistStudioModal.activeField='listeners';
        repaintAll();
        return;
      }
      if(ARTIST_STUDIO_HB.bioField && inRect(x,y,ARTIST_STUDIO_HB.bioField)){
        artistStudioModal.activeField='bio';
        repaintAll();
        return;
      }
      if(ARTIST_STUDIO_HB.panel && inRect(x,y,ARTIST_STUDIO_HB.panel)) return;
    }
    closeArtistStudio();
    return;
  }
  if(songDetails){
    if(SONG_DET_HB){
      if(SONG_DET_HB.artist && inRect(x,y,SONG_DET_HB.artist)){
        var modalTargetArtist=SONG_DET_HB.artist.name;
        closeSongDetails();
        if(modalTargetArtist){
          loadArtist(modalTargetArtist);
          artistScroll=artistScrollT=0;
          pushNav('artist',{artist:modalTargetArtist});
          view='artist';
          repaintAll();
        }
        return;
      }
      if((SONG_DET_HB.play && inRect(x,y,SONG_DET_HB.play)) || (SONG_DET_HB.artPlay && inRect(x,y,SONG_DET_HB.artPlay))){
        var sh=songDetails.handle; closeSongDetails();
        if(sh){
          var ap=activePl();
          var foundIdx=-1;
          if(ap && ap.i>=0 && ap.count>0){
            var pit=getItems(ap.i);
            if(pit){
              for(var pi_i=0; pi_i<pit.Count; pi_i++){
                if(pit[pi_i] && pit[pi_i].Path===sh.Path){ foundIdx=pi_i; break; }
              }
            }
          }
          if(foundIdx>=0){
            playPlaylistItem(ap.i, foundIdx);
          } else {
            playHandleList([sh],0);
          }
        }
        return;
      }
      if((SONG_DET_HB.toggleLyrics && inRect(x,y,SONG_DET_HB.toggleLyrics)) ||
         (SONG_DET_HB.toggleLyricsBottom && inRect(x,y,SONG_DET_HB.toggleLyricsBottom)) ||
         (SONG_DET_HB.lyricCard && inRect(x,y,SONG_DET_HB.lyricCard))){
        toggleSongDetailsLyrics();
        return;
      }
      if(inRect(x,y,SONG_DET_HB.close) || !inRect(x,y,SONG_DET_HB.panel)) closeSongDetails();
    } else closeSongDetails();
    return;
  }

  if(typeof eqModal!=='undefined' && eqModal){
    if(EQ_MODAL_HB){
      if(EQ_MODAL_HB.presets && EQ_MODAL_HB.presets.length){
        for(var epi=0; epi<EQ_MODAL_HB.presets.length; epi++){
          var ep=EQ_MODAL_HB.presets[epi];
          if(inRect(x,y,ep)){ selectEqPreset(ep.id); return; }
        }
      }
      if(EQ_MODAL_HB.close && inRect(x,y,EQ_MODAL_HB.close)){ closeEqModal(); return; }
    }
    closeEqModal();
    return;
  }
  if(dupPrompt){
    if(DUP_HB && inRect(x,y,DUP_HB.skip)) dupSkip(); else dupKeep();   // "Add anyway"/outside: leave as-is
    return;
  }

  if(confirmDel){
    if(CONF_HB && inRect(x,y,CONF_HB.del)){ doDeletePlaylist(confirmDel.pl); return; }
    confirmDel=null; repaintAll(); return;   // cancel / click outside
  }
  if(ctxMenu){
    t=hit(CTX_HB,x,y);
    if(t){
      var act=t.act, pl=ctxMenu.pl, nm=ctxMenu.name, itm=ctxMenu.item;
      if(act==='details'){
        var dh=ctxMenu.handle;
        if(!dh && ctxMenu.pl!==undefined && ctxMenu.item!==undefined){
          var dit=getItems(ctxMenu.pl); if(dit) dh=dit[ctxMenu.item];
        }
        ctxMenu=null;
        if(dh) openSongDetails(dh);
        return;
      }
      if(act==='custom_cover'){
        ctxMenu=null; repaintAll();
        choosePlaylistCover(nm);
        return;
      }
      if(act==='remove_custom_cover'){
        ctxMenu=null; repaintAll();
        removePlaylistCover(nm);
        return;
      }
      if(act==='add_to_pl'){
        var targetH=ctxMenu.handle;
        if(!targetH && ctxMenu.pl!==undefined && ctxMenu.item!==undefined){
          var dit2=getItems(ctxMenu.pl); if(dit2) targetH=dit2[ctxMenu.item];
        }
        var cmx=ctxMenu.x, cmy=ctxMenu.y;
        ctxMenu=null; repaintAll();
        if(targetH) openAddToPlaylistMenu(targetH, Math.max(16, Math.min(cmx, W-260)), Math.min(cmy, H-260));
        return;
      }
      if(act==='toggle_like'){
        var targetH2=ctxMenu.handle;
        if(!targetH2 && ctxMenu.pl!==undefined && ctxMenu.item!==undefined){
          var dit3=getItems(ctxMenu.pl); if(dit3) targetH2=dit3[ctxMenu.item];
        }
        ctxMenu=null; repaintAll();
        if(targetH2) toggleLike(targetH2);
        return;
      }
      if(act==='toggle_like_item'){
        var th=t.handle || ctxMenu.handle;
        var cmx2=ctxMenu.x, cmy2=ctxMenu.y;
        if(th) toggleLike(th);
        if(th) openAddToPlaylistMenu(th, cmx2, cmy2);
        return;
      }
      if(act==='toggle_pl_item'){
        var th2=t.handle || ctxMenu.handle;
        var plIdx=t.plIdx;
        var cmx3=ctxMenu.x, cmy3=ctxMenu.y;
        if(th2 && plIdx!==undefined) toggleTrackInPlaylist(th2, plIdx);
        if(th2) openAddToPlaylistMenu(th2, cmx3, cmy3);
        return;
      }
      if(act==='add_to_new_pl'){
        var th3=t.handle || ctxMenu.handle;
        ctxMenu=null; repaintAll();
        if(th3){
          var npl=createNewPlaylist();
          toggleTrackInPlaylist(th3, npl);
          plman.ActivePlaylist=npl;
          pushNav('playlist',{pl:npl});
          view='playlist';
          repaintAll();
        }
        return;
      }
      if(act==='trkremove'){ ctxMenu=null; removeTrackFromPl(pl,itm); return; }
      // navigate to the target first, so the tracks land somewhere the user can see
      if(act==='addfiles'||act==='addfolder'){
        ctxMenu=null; firstRow=firstRowT=0; pushNav('playlist',{pl:pl}); view='playlist'; repaintAll();
        if(act==='addfiles') addFilesToPl(pl); else addFolderToPl(pl);
      }
      else if(act==='rename'){ startRename(pl); }
      else { confirmDel={pl:pl,name:nm}; ctxMenu=null; repaintAll(); }
      return;
    }
    ctxMenu=null; repaintAll(); return;      // click outside menu -> close
  }
  if(renameEdit){
    if(RENAME_HB){
      if(inRect(x,y,RENAME_HB.save)){ if(RENAME_HB.canSave) commitRename(); return; }
      if(inRect(x,y,RENAME_HB.cancel)){ cancelRename(); return; }
      if(inRect(x,y,RENAME_HB.panel)) return;     // click inside the dialog: keep it open
    }
    cancelRename(); return;                        // click on backdrop: dismiss
  }
  if((t=hit(HB_DOTS,x,y))){ openPlaylistMenu(t.pl,t.mx,t.my); return; }
  if(drag==='seek'){ if(fb.PlaybackLength>0) fb.PlaybackTime=fb.PlaybackLength*dragFrac; drag=null; repaintAll(); return; }
  if(drag==='vol'){ drag=null; return; }
  if(drag==='songDetScroll'){ drag=null; repaintAll(); return; }
  if(drag==='scroll'||drag==='scrollh'||drag==='scrolln'){
    var wasH=(drag==='scrollh'); drag=null;
    if(wasH){ plScrollT=snapShelf(plScroll); startScrollAnim(); }   // release the thumb -> settle on a boundary
    repaintAll(); return;
  }
  // an open dropdown is modal-ish: any click either picks an item or closes it
  if(sgMenuOpen){
    if((t=hit(SG_HB,x,y))){ setSongsGroup(t.v); return; }
    sgMenuOpen=false; repaintAll(); return;
  }
  if(HB_SG && inRect(x,y,HB_SG)){ sgMenuOpen=true; repaintAll(); return; }
  if(plSortMenuOpen){
    if((t=hit(PL_SORT_HB,x,y))){ setPlSort(t.v); return; }
    plSortMenuOpen=false; repaintAll(); return;
  }
  if(HB_PLSORT && inRect(x,y,HB_PLSORT)){ plSortMenuOpen=true; repaintAll(); return; }
  if(HB_PLSORTDIR && inRect(x,y,HB_PLSORTDIR)){ togglePlSortDir(); return; }
  if(HB_FILTER_BTN && inRect(x,y,HB_FILTER_BTN)){ toggleInlineFilter(); return; }
  if(HB_INLINE_FILTER){
    if(HB_INLINE_FILTER.close && inRect(x,y,HB_INLINE_FILTER.close)){
      if(inlineFilterText.length>0) clearInlineFilter();
      else closeInlineFilter();
      return;
    }
    if(HB_INLINE_FILTER.box && inRect(x,y,HB_INLINE_FILTER.box)){
      if(!inlineFilterOpen) openInlineFilter();
      return;
    }
  }
  if(fsMode){
    if(vizMenuOpen){                                  // the style list is modal while it is open
      if((t=hit(VIZ_HB,x,y))){ setVizStyle(t.v); return; }
      vizMenuOpen=false; repaintAll(); return;
    }
    if(HB_VIZ && fsView==='viz' && inRect(x,y,HB_VIZ)){ vizMenuOpen=true; repaintAll(); return; }
    if((t=hit(HB_FS,x,y))){ doFsAct(t.act); return; }
    if((t=hit(HB_CTRL,x,y))){ doCtrl(t.act); return; }
    return;
  }
  if(y<TBH){
    if(HB_NAV_BACK && inRect(x,y,HB_NAV_BACK)){ navBack(); return; }
    if(HB_NAV_FWD && inRect(x,y,HB_NAV_FWD)){ navForward(); return; }
    if((t=hit(HB_MENU,x,y))){ openMenu(t.root,t.mx,TBH); return; }
    if(HB_CAP){
      if(x>=HB_CAP.closeX){ fb.Exit(); return; }
      if(x>=HB_CAP.maxX){ if(UIWizard){ try{ UIWizard.ToggleMaximize(); }catch(e){} } repaintAll(); return; }
      if(x>=HB_CAP.minX){ if(UIWizard){ try{ UIWizard.WindowMinimize(); }catch(e){} } return; }
    }
    return;
  }
  if(HB_BACK_BTN && inRect(x,y,HB_BACK_BTN)){ navBack(); return; }
  if((t=hit(HB_TABS,x,y))){ rightTab=t.tab; if(rightTab==='lyrics'){ loadLyrics(); lySnap=true; } else stopLyAnim(); repaintAll(); return; }
  // Album View controls
  if(view==='album'){
    if(HB_ALBUM_PLAY && inRect(x,y,HB_ALBUM_PLAY)){
      if(HB_ALBUM_PLAY.handles) playHandleList(HB_ALBUM_PLAY.handles, 0);
      return;
    }
    if(HB_ALBUM_SHUFFLE && inRect(x,y,HB_ALBUM_SHUFFLE)){
      if(HB_ALBUM_SHUFFLE.handles && HB_ALBUM_SHUFFLE.handles.length){
        var shufList=HB_ALBUM_SHUFFLE.handles.slice(0);
        for(var si=shufList.length-1;si>0;si--){
          var sj=Math.floor(Math.random()*(si+1));
          var tmp=shufList[si]; shufList[si]=shufList[sj]; shufList[sj]=tmp;
        }
        playHandleList(shufList,0);
      }
      return;
    }
    if(HB_ALBUM_ARTISTS && HB_ALBUM_ARTISTS.length){
      for(var ahi=0; ahi<HB_ALBUM_ARTISTS.length; ahi++){
        var aTarget=HB_ALBUM_ARTISTS[ahi];
        if(inRect(x,y,aTarget) && aTarget.artist){
          loadArtist(aTarget.artist);
          artistScroll=artistScrollT=0;
          pushNav('artist',{artist:aTarget.artist});
          view='artist';
          repaintAll();
          return;
        }
      }
    }
    if((HB_ALBUM_ARTIST && inRect(x,y,HB_ALBUM_ARTIST)) || (HB_ALBUM_CTA && inRect(x,y,HB_ALBUM_CTA))){
      var targetArtist=(HB_ALBUM_ARTIST && inRect(x,y,HB_ALBUM_ARTIST))?HB_ALBUM_ARTIST.artist:HB_ALBUM_CTA.artist;
      if(targetArtist){
        loadArtist(targetArtist);
        artistScroll=artistScrollT=0;
        pushNav('artist',{artist:targetArtist});
        view='artist';
        repaintAll();
      }
      return;
    }
    if(HB_ALBUM_OTHER && HB_ALBUM_OTHER.length){
      for(var oi=0;oi<HB_ALBUM_OTHER.length;oi++){
        var oth=HB_ALBUM_OTHER[oi];
        if(inRect(x,y,oth)){
          if(oth.playBtn && inRect(x,y,oth.playBtn)){
            if(oth.album && oth.album.handles) playHandleList(oth.album.handles,0);
          } else if(oth.album){
            loadAlbum(oth.album.name, oth.album.artist);
            albumScroll=albumScrollT=0;
            pushNav('album',{album:oth.album.name,artist:oth.album.artist});
            view='album';
            repaintAll();
          }
          return;
        }
      }
    }
  }

  // Artist View controls: Play, Shuffle, Follow, See More, Latest Release, Shelves
  if(view==='artist'){
    if(HB_ARTIST_PLAY && inRect(x,y,HB_ARTIST_PLAY)){
      if(HB_ARTIST_PLAY.handles && HB_ARTIST_PLAY.handles.length) playHandleList(HB_ARTIST_PLAY.handles, 0);
      return;
    }
    if(HB_ARTIST_SHUFFLE && inRect(x,y,HB_ARTIST_SHUFFLE)){
      if(HB_ARTIST_SHUFFLE.handles && HB_ARTIST_SHUFFLE.handles.length){
        var artShufList=HB_ARTIST_SHUFFLE.handles.slice(0);
        for(var artSi=artShufList.length-1;artSi>0;artSi--){
          var artSj=Math.floor(Math.random()*(artSi+1));
          var artTmp=artShufList[artSi]; artShufList[artSi]=artShufList[artSj]; artShufList[artSj]=artTmp;
        }
        playHandleList(artShufList,0);
      }
      return;
    }
    if(HB_ARTIST_FOLLOW && inRect(x,y,HB_ARTIST_FOLLOW)){
      if(HB_ARTIST_FOLLOW.artist){
        artistFollowingMap[HB_ARTIST_FOLLOW.artist]=!artistFollowingMap[HB_ARTIST_FOLLOW.artist];
        repaintMain();
      }
      return;
    }
    if(HB_ARTIST_PHOTO && inRect(x,y,HB_ARTIST_PHOTO)){
      chooseArtistPhoto(HB_ARTIST_PHOTO.artist);
      return;
    }
    if(HB_ARTIST_EDIT_BTN && inRect(x,y,HB_ARTIST_EDIT_BTN)){
      openArtistStudio(HB_ARTIST_EDIT_BTN.artist);
      return;
    }
    if(HB_ARTIST_EDIT_BIO_BTN && inRect(x,y,HB_ARTIST_EDIT_BIO_BTN)){
      openArtistStudio(HB_ARTIST_EDIT_BIO_BTN.artist);
      return;
    }
    if(HB_ARTIST_SEE_MORE && inRect(x,y,HB_ARTIST_SEE_MORE)){
      artistPopularExpanded=!artistPopularExpanded;
      repaintMain();
      return;
    }
    if(HB_ARTIST_LATEST && inRect(x,y,HB_ARTIST_LATEST)){
      if(HB_ARTIST_LATEST.album){
        loadAlbum(HB_ARTIST_LATEST.album.album, HB_ARTIST_LATEST.album.artist);
        albumScroll=albumScrollT=0;
        pushNav('album',{album:HB_ARTIST_LATEST.album.album, artist:HB_ARTIST_LATEST.album.artist});
        view='album';
        repaintAll();
      }
      return;
    }
    if(HB_ARTIST_ALBUMS && HB_ARTIST_ALBUMS.length){
      for(var aai=0; aai<HB_ARTIST_ALBUMS.length; aai++){
        var aAlb=HB_ARTIST_ALBUMS[aai];
        if(inRect(x,y,aAlb)){
          if(aAlb.playBtn && inRect(x,y,aAlb.playBtn)){
            if(aAlb.album && aAlb.album.tracks && aAlb.album.tracks.length){
              var aTracks=[];
              for(var ati=0; ati<aAlb.album.tracks.length; ati++) aTracks.push(aAlb.album.tracks[ati].handle);
              playHandleList(aTracks, 0);
            }
          } else if(aAlb.album){
            loadAlbum(aAlb.album.album, aAlb.album.artist);
            albumScroll=albumScrollT=0;
            pushNav('album',{album:aAlb.album.album, artist:aAlb.album.artist});
            view='album';
            repaintAll();
          }
          return;
        }
      }
    }
    if(HB_ARTIST_SINGLES && HB_ARTIST_SINGLES.length){
      for(var sai=0; sai<HB_ARTIST_SINGLES.length; sai++){
        var sAlb=HB_ARTIST_SINGLES[sai];
        if(inRect(x,y,sAlb)){
          if(sAlb.playBtn && inRect(x,y,sAlb.playBtn)){
            if(sAlb.album && sAlb.album.tracks && sAlb.album.tracks.length){
              var sTracks=[];
              for(var sti=0; sti<sAlb.album.tracks.length; sti++) sTracks.push(sAlb.album.tracks[sti].handle);
              playHandleList(sTracks, 0);
            }
          } else if(sAlb.album){
            loadAlbum(sAlb.album.album, sAlb.album.artist);
            albumScroll=albumScrollT=0;
            pushNav('album',{album:sAlb.album.album, artist:sAlb.album.artist});
            view='album';
            repaintAll();
          }
          return;
        }
      }
    }
    if(HB_ARTIST_APPEARS && HB_ARTIST_APPEARS.length){
      for(var api=0; api<HB_ARTIST_APPEARS.length; api++){
        var apAlb=HB_ARTIST_APPEARS[api];
        if(inRect(x,y,apAlb) && apAlb.album){
          loadAlbum(apAlb.album.name, apAlb.album.artist);
          albumScroll=albumScrollT=0;
          pushNav('album',{album:apAlb.album.name, artist:apAlb.album.artist});
          view='album';
          repaintAll();
          return;
        }
      }
    }
  }

  if((t=hit(HB_CTRL,x,y))){
    doCtrl(t.act); return;
  }
  if(HB_LIKED && inRect(x,y,HB_LIKED)){
    var lpl=getLikedPlaylistIndex(true);
    if(lpl>=0){ plman.ActivePlaylist=lpl; firstRow=firstRowT=0; pushNav('playlist',{pl:lpl}); view='playlist'; repaintAll(); }
    return;
  }
  if(HB_HISTORY && inRect(x,y,HB_HISTORY)){
    if(view!=='history'){ pushNav('history'); view='history'; historyScroll=historyScrollT=0; }
    repaintAll(); return;
  }
  if(HB_HOME && inRect(x,y,HB_HOME)){ if(view!=='home'){ pushNav('home'); view='home'; } repaintAll(); return; }
  if(HB_SEARCH && inRect(x,y,HB_SEARCH)){ if(view!=='search'){ pushNav('search'); view='search'; } repaintAll(); return; }
  if(HB_ALLSONGS && inRect(x,y,HB_ALLSONGS)){ if(view!=='songs'){ pushNav('songs'); view='songs'; songsScroll=songsScrollT=0; } repaintAll(); return; }
  if(HB_ALBUMS && inRect(x,y,HB_ALBUMS)){ if(view!=='albums'){ pushNav('albums'); view='albums'; albumsScroll=albumsScrollT=0; } repaintAll(); return; }
  if(HB_ARTISTS && inRect(x,y,HB_ARTISTS)){ if(view!=='artists'){ pushNav('artists'); view='artists'; artistsScroll=artistsScrollT=0; } repaintAll(); return; }
  if(HB_ARTIST_SYNC && inRect(x,y,HB_ARTIST_SYNC)){
    if(view!=='artist_sync'){ pushNav('artist_sync'); view='artist_sync'; artistSyncScroll=artistSyncScrollT=0; startSyncProgressPoll(); }
    repaintAll(); return;
  }
  if(HB_ANALYTICS && inRect(x,y,HB_ANALYTICS)){
    if(view!=='analytics'){ pushNav('analytics'); view='analytics'; ANALYTICS_SCROLL=ANALYTICS_SCROLL_T=0; }
    repaintAll(); return;
  }

  // Analytics view controls
  if(view==='analytics'){
    if(HB_ANALYTICS_EXPORT && inRect(x,y,HB_ANALYTICS_EXPORT)){
      exportWrappedCard(); return;
    }
    if(HB_HEATMAP && HB_HEATMAP.length){
      for(var hmi=0; hmi<HB_HEATMAP.length; hmi++){
        if(inRect(x,y,HB_HEATMAP[hmi])){
          var clickedHm = HB_HEATMAP[hmi].hm;
          if(selectedHeatmapDay && selectedHeatmapDay.dateStr === clickedHm.dateStr){
            selectedHeatmapDay = null;
          } else {
            selectedHeatmapDay = clickedHm;
          }
          repaintAll(); return;
        }
      }
    }
    if(HB_PODIUM && HB_PODIUM.length){
      for(var pdi=0; pdi<HB_PODIUM.length; pdi++){
        if(inRect(x,y,HB_PODIUM[pdi])){
          loadArtist(HB_PODIUM[pdi].artist); artistScroll=artistScrollT=0; pushNav('artist',{artist:HB_PODIUM[pdi].artist}); view='artist';
          repaintAll(); return;
        }
      }
    }
    if(HB_ARTIST_ROW && HB_ARTIST_ROW.length){
      for(var ari=0; ari<HB_ARTIST_ROW.length; ari++){
        if(inRect(x,y,HB_ARTIST_ROW[ari])){
          loadArtist(HB_ARTIST_ROW[ari].artist); artistScroll=artistScrollT=0; pushNav('artist',{artist:HB_ARTIST_ROW[ari].artist}); view='artist';
          repaintAll(); return;
        }
      }
    }
  }

  // Artists grid view controls
  if(view==='artists'){
    if(HB_ARTISTS_SYNC_BTN && inRect(x,y,HB_ARTISTS_SYNC_BTN)){
      pushNav('artist_sync'); view='artist_sync'; artistSyncScroll=artistSyncScrollT=0; startSyncProgressPoll();
      repaintAll(); return;
    }
  }

  // Artist Cloud Sync view controls
  if(view==='artist_sync'){
    if(HB_SYNC_FETCH_MISSING && inRect(x,y,HB_SYNC_FETCH_MISSING)){ triggerArtistSync('missing'); return; }
    if(HB_SYNC_FETCH_ALL && inRect(x,y,HB_SYNC_FETCH_ALL)){ triggerArtistSync('all'); return; }
    if(HB_SYNC_STOP && inRect(x,y,HB_SYNC_STOP)){ stopArtistSync(); return; }
    if(HB_SYNC_OPEN_DIR && inRect(x,y,HB_SYNC_OPEN_DIR)){ openArtistCacheFolder(); return; }
    if(HB_SYNC_ROWS && HB_SYNC_ROWS.length){
      for(var sri=0; sri<HB_SYNC_ROWS.length; sri++){
        var sRow=HB_SYNC_ROWS[sri];
        if(inRect(x,y,sRow)){
          if(sRow.fetchBtn && inRect(x,y,sRow.fetchBtn)){
            triggerArtistSync('all', sRow.artist);
          } else if(sRow.viewBtn && inRect(x,y,sRow.viewBtn)){
            loadArtist(sRow.artist); artistScroll=artistScrollT=0; pushNav('artist',{artist:sRow.artist}); view='artist';
          } else if(sRow.artist){
            loadArtist(sRow.artist); artistScroll=artistScrollT=0; pushNav('artist',{artist:sRow.artist}); view='artist';
          }
          repaintAll(); return;
        }
      }
    }
  }
  // History view controls
  if(view==='history'){
    if(HB_HISTORY_CLEAR && inRect(x,y,HB_HISTORY_CLEAR)){
      clearHistory(); repaintAll(); return;
    }
  }

  if(view==='playlist' && HB_PL_COVER && inRect(x,y,HB_PL_COVER)){
    choosePlaylistCover(HB_PL_COVER.name);
    return;
  }
  if(view==='playlist' && HB_PL_PLAY && inRect(x,y,HB_PL_PLAY)){
    var loc=playingLoc();
    if(fb.IsPlaying && loc && loc.IsValid && loc.PlaylistIndex===HB_PL_PLAY.pl){
      fb.PlayOrPause();
    } else if(fb.IsPaused && loc && loc.IsValid && loc.PlaylistIndex===HB_PL_PLAY.pl){
      fb.PlayOrPause();
    } else {
      var it=getItems(HB_PL_PLAY.pl);
      if(it && it.Count>0){
        if(pbShuffle) playShuffled(HB_PL_PLAY.pl, null, plName(HB_PL_PLAY.pl), false);
        else playPlaylistItem(HB_PL_PLAY.pl, 0);
      }
    }
    repaintAll();
    return;
  }
  if(view==='playlist' && HB_PL_SHUFFLE && inRect(x,y,HB_PL_SHUFFLE)){
    it=getItems(HB_PL_SHUFFLE.pl);
    if(it && it.Count>0){
      pbShuffle=true;
      applyPlaybackOrder();
      playShuffled(HB_PL_SHUFFLE.pl, null, plName(HB_PL_SHUFFLE.pl), false);
    }
    repaintAll();
    return;
  }
  if(HB_ADDPL && inRect(x,y,HB_ADDPL)){ var np=createNewPlaylist(); plman.ActivePlaylist=np; revealPlaylist(np); firstRow=firstRowT=0; pushNav('playlist',{pl:np}); view='playlist'; repaintAll(); return; }
  if(HB_PLADD_FILES && inRect(x,y,HB_PLADD_FILES)){ addFilesToPl(plman.ActivePlaylist); return; }
  if(HB_PLADD_FOLDER && inRect(x,y,HB_PLADD_FOLDER)){ addFolderToPl(plman.ActivePlaylist); return; }
  if((t=hit(HB_CARD,x,y))){
    if(t.kind==='pl'){ plman.ActivePlaylist=t.id; firstRow=firstRowT=0; pushNav('playlist',{pl:t.id}); view='playlist'; }
    else if(t.kind==='artist'){
      if(t.pbx!==undefined && x>=t.pbx && x<t.pbx+t.pb && y>=t.pby && y<t.pby+t.pb){
        var aList=artistTracksMap?artistTracksMap[t.id]:null;
        if(aList && aList.length){ playHandleList(aList,0); repaintAll(); return; }
      }
      loadArtist(t.id); artistScroll=artistScrollT=0; pushNav('artist',{artist:t.id}); view='artist';
    }
    else if(t.kind==='album'){
      if(t.pbx!==undefined && x>=t.pbx && x<t.pbx+t.pb && y>=t.pby && y<t.pby+t.pb){
        if(t.handles && t.handles.length){ playHandleList(t.handles,0); repaintAll(); return; }
      }
      loadAlbum(t.name, t.artist); albumScroll=albumScrollT=0; pushNav('album',{album:t.name,artist:t.artist}); view='album';
    }
    else if(t.kind==='recent_song'){
      if(t.pbx!==undefined && x>=t.pbx && x<t.pbx+t.pb && y>=t.pby && y<t.pby+t.pb){
        if(t.track && t.track.handle){ playHandleList([t.track.handle],0); repaintAll(); return; }
      }
      if(t.track && t.track.album){
        loadAlbum(t.track.album, t.track.artist); albumScroll=albumScrollT=0; pushNav('album',{album:t.track.album,artist:t.track.artist}); view='album';
      }
    }
    else if(t.kind==='recent_play'){
      if(t.pbx!==undefined && x>=t.pbx && x<t.pbx+t.pb && y>=t.pby && y<t.pby+t.pb){
        var ph=(t.item ? t.item.handle : null) || (t.item && typeof getHandleByPath==='function'?getHandleByPath(t.item.path):null);
        if(ph){ playHandleList([ph],0); repaintAll(); return; }
      }
      if(t.item){
        if(t.item.album){ loadAlbum(t.item.album, t.item.artist); albumScroll=albumScrollT=0; pushNav('album',{album:t.item.album,artist:t.item.artist}); view='album'; }
        else if(t.item.artist){ loadArtist(t.item.artist); artistScroll=artistScrollT=0; pushNav('artist',{artist:t.item.artist}); view='artist'; }
      }
    }
    else if(t.kind==='daily_mix'){
      var isPlayBtn = (t.pbx!==undefined && x>=t.pbx && x<t.pbx+t.pb && y>=t.pby && y<t.pby+t.pb);
      playDailyMix(t.id, isPlayBtn); repaintAll(); return;
    }
    else if(t.kind==='smart_vault'){
      isPlayBtn = (t.pbx!==undefined && x>=t.pbx && x<t.pbx+t.pb && y>=t.pby && y<t.pby+t.pb);
      playHiResVault(isPlayBtn); repaintAll(); return;
    }
    else if(t.kind==='smart_forgotten'){
      isPlayBtn = (t.pbx!==undefined && x>=t.pbx && x<t.pbx+t.pb && y>=t.pby && y<t.pby+t.pb);
      playForgottenGems(isPlayBtn); repaintAll(); return;
    }
    else if(t.kind==='smart_rotation'){
      isPlayBtn = (t.pbx!==undefined && x>=t.pbx && x<t.pbx+t.pb && y>=t.pby && y<t.pby+t.pb);
      playHeavyRotation(isPlayBtn); repaintAll(); return;
    }
    repaintAll(); return;
  }
  if((t=hit(HB_PL,x,y))){ plman.ActivePlaylist=t.i; firstRow=firstRowT=0; pushNav('playlist',{pl:t.i}); view='playlist'; repaintAll(); return; }
  if((t=hit(HB_Q,x,y))){ if(t.q!==undefined) playQueueItem(t.q); else playQueueNext(t.pl,t.item); repaintAll(); return; }
  /* Rows play on single click (or double click). Clicking heart toggles like! */
  if((t=hit(HB_TR,x,y))){
    if(t.hx0!==undefined && x>=t.hx0 && x<=t.hx1){
      // clicked heart!
      var hh=null;
      if(t.albumRow && t.handles) hh=t.handles[t.idx];
      else if(t.songs && songsTracks && songsTracks[t.ti]) hh=songsTracks[t.ti].h;
      else if(t.srch && searchTrks && searchTrks[t.idx]) hh=searchTrks[t.idx].h;
      else if(t.lib && artistAlbums[t.block] && artistAlbums[t.block].tracks[t.idx]) hh=artistAlbums[t.block].tracks[t.idx].handle;
      else if(t.pl!==undefined && t.item!==undefined){ var plItems=getItems(t.pl); if(plItems) hh=plItems[t.item]; }
      else if(t.historyRow && t.path){
        hh = typeof getHandleByPath==='function' ? getHandleByPath(t.path) : null;
      }
      if(hh) toggleLike(hh);
      return;
    }
    if(t.historyRow && t.path){
      var hlh = typeof getHandleByPath==='function' ? getHandleByPath(t.path) : null;
      if(hlh) playHandleList([hlh],0);
      return;
    }
    playRow(t);
    return;
  }
}
function playRow(t){
  if(t.srch){ var hs=[], m; for(m=0;m<searchTrks.length;m++) hs.push(searchTrks[m].h); playHandleList(hs,t.idx); }
  else if(t.songs) playSongsRow(t.ti);
  else if(t.lib) playArtistTrack(t.block,t.idx);
  else if(t.albumRow) playHandleList(t.handles,t.idx);
  else if(t.historyRow && t.path){
    var hlh = typeof getHandleByPath==='function' ? getHandleByPath(t.path) : null;
    if(hlh) playHandleList([hlh],0);
  }
  else playPlaylistItem(t.pl,t.item);
  repaintAll();
}
// A single click on a list this dense is too easy to fire by accident, and it is the convention
// every desktop player follows -- including the one this theme is modelled on.
function on_mouse_lbtn_dblclk(x,y){
  if(ctxMenu||confirmDel||renameEdit||sgMenuOpen||plSortMenuOpen||vizMenuOpen||dupPrompt||rgPrompt||songDetails) return;
  var t=hit(HB_TR,x,y);
  if(t) playRow(t);
}
function hoverSig(x,y){
  var i;
  if(typeof artistStudioModal!=='undefined' && artistStudioModal){
    if(ARTIST_STUDIO_HB){
      if(ARTIST_STUDIO_HB.close && inRect(x,y,ARTIST_STUDIO_HB.close)) return 'asm_c';
      if(ARTIST_STUDIO_HB.cancelBtn && inRect(x,y,ARTIST_STUDIO_HB.cancelBtn)) return 'asm_can';
      if(ARTIST_STUDIO_HB.saveBtn && inRect(x,y,ARTIST_STUDIO_HB.saveBtn)) return 'asm_save';
      if(ARTIST_STUDIO_HB.changePhoto && inRect(x,y,ARTIST_STUDIO_HB.changePhoto)) return 'asm_photo';
      if(ARTIST_STUDIO_HB.resetBtn && inRect(x,y,ARTIST_STUDIO_HB.resetBtn)) return 'asm_rst';
      if(ARTIST_STUDIO_HB.listenersField && inRect(x,y,ARTIST_STUDIO_HB.listenersField)) return 'asm_lis';
      if(ARTIST_STUDIO_HB.bioField && inRect(x,y,ARTIST_STUDIO_HB.bioField)) return 'asm_bio';
    }
    return 'asm';
  }
  if(songDetails){
    if(SONG_DET_HB){
      if(SONG_DET_HB.close && inRect(x,y,SONG_DET_HB.close)) return 'sdc';
      if(SONG_DET_HB.play && inRect(x,y,SONG_DET_HB.play)) return 'sdp';
      if(SONG_DET_HB.artPlay && inRect(x,y,SONG_DET_HB.artPlay)) return 'sda';
      if(SONG_DET_HB.artist && inRect(x,y,SONG_DET_HB.artist)) return 'sdart';
      if(SONG_DET_HB.toggleLyrics && inRect(x,y,SONG_DET_HB.toggleLyrics)) return 'sdtl';
      if(SONG_DET_HB.toggleLyricsBottom && inRect(x,y,SONG_DET_HB.toggleLyricsBottom)) return 'sdtlb';
      if(SONG_DET_HB.lyricCard && inRect(x,y,SONG_DET_HB.lyricCard)) return 'sdlc';
    }
    if(SONG_DET_SB && inRect(x,y,SONG_DET_SB)) return 'sdsb';
    return 'sd';
  }
  if(fsMode){
    if(vizMenuOpen){ i=hitIdx(VIZ_HB,x,y); return (i<0)?'vz':('vz'+i); }
    if(HB_VIZ && inRect(x,y,HB_VIZ)) return 'vzb';
    if((i=hitIdx(HB_FS,x,y))>=0) return 'f'+i;      // fullscreen icons: hover feedback, same as anywhere
  }
  if(dupPrompt){ if(DUP_HB){ if(inRect(x,y,DUP_HB.skip)) return 'dps'; if(inRect(x,y,DUP_HB.keep)) return 'dpk'; } return 'dp'; }
  if(renameEdit){ if(RENAME_HB){ if(inRect(x,y,RENAME_HB.save)) return 'rns'; if(inRect(x,y,RENAME_HB.cancel)) return 'rnc'; } return 'rn'; }

  if(confirmDel){ if(CONF_HB && inRect(x,y,CONF_HB.del)) return 'cfd'; if(CONF_HB && inRect(x,y,CONF_HB.cancel)) return 'cfc'; return 'cf'; }
  if(ctxMenu){ i=hitIdx(CTX_HB,x,y); return (i<0)?'cx':('cx'+i); }
  if(sgMenuOpen){ i=hitIdx(SG_HB,x,y); return (i<0)?'sg':('sg'+i); }
  if(plSortMenuOpen){ i=hitIdx(PL_SORT_HB,x,y); return (i<0)?'ps':('ps'+i); }
  if((i=hitIdx(HB_DOTS,x,y))>=0) return 'd'+i;
  if(y<TBH){
    if(HB_NAV_BACK && inRect(x,y,HB_NAV_BACK)) return 'nbk';
    if(HB_NAV_FWD && inRect(x,y,HB_NAV_FWD)) return 'nfw';
    if((i=hitIdx(HB_MENU,x,y))>=0) return 'mnu'+i;
    if(HB_CAP && x>=HB_CAP.minX) return 'cap'+(((x-HB_CAP.minX)/HB_CAP.bw)|0);
    return '';
  }
  if(SBH && inRect(x,y,SBH)) return 'sbh';
  if(SBN && inRect(x,y,SBN)) return 'sbn';
  if(HB_BACK_BTN && inRect(x,y,HB_BACK_BTN)) return 'bbk';
  if(HB_ADDPL && inRect(x,y,HB_ADDPL)) return 'addpl';
  if(HB_PLADD_FILES && inRect(x,y,HB_PLADD_FILES)) return 'pladdf';
  if(HB_PLADD_FOLDER && inRect(x,y,HB_PLADD_FOLDER)) return 'pladdd';
  if(HB_PL_COVER && inRect(x,y,HB_PL_COVER)) return 'plcov';
  if(HB_PL_PLAY && inRect(x,y,HB_PL_PLAY)) return 'plp';
  if(HB_PL_SHUFFLE && inRect(x,y,HB_PL_SHUFFLE)) return 'plsh';
  if(HB_ALLSONGS && inRect(x,y,HB_ALLSONGS)) return 'als';
  if(HB_ALBUMS && inRect(x,y,HB_ALBUMS)) return 'albs';
  if(HB_ARTISTS && inRect(x,y,HB_ARTISTS)) return 'arts';
  if(HB_ALBUM_PLAY && inRect(x,y,HB_ALBUM_PLAY)) return 'abp';
  if(HB_ALBUM_SHUFFLE && inRect(x,y,HB_ALBUM_SHUFFLE)) return 'absh';
  if(HB_ALBUM_ARTISTS && HB_ALBUM_ARTISTS.length){
    for(var ahi=0; ahi<HB_ALBUM_ARTISTS.length; ahi++){
      if(inRect(x,y,HB_ALBUM_ARTISTS[ahi])) return 'abar'+(HB_ALBUM_ARTISTS[ahi].id||ahi);
    }
  }
  if(HB_ALBUM_ARTIST && inRect(x,y,HB_ALBUM_ARTIST)) return 'abar';
  if(HB_ALBUM_CTA && inRect(x,y,HB_ALBUM_CTA)) return 'abcta';
  if(HB_ALBUM_OTHER && HB_ALBUM_OTHER.length){
    for(var oi=0;oi<HB_ALBUM_OTHER.length;oi++){
      if(inRect(x,y,HB_ALBUM_OTHER[oi])) return 'abo'+oi;
    }
  }
  if(HB_ARTIST_PLAY && inRect(x,y,HB_ARTIST_PLAY)) return 'artp';
  if(HB_ARTIST_SHUFFLE && inRect(x,y,HB_ARTIST_SHUFFLE)) return 'artsh';
  if(HB_ARTIST_FOLLOW && inRect(x,y,HB_ARTIST_FOLLOW)) return 'artfol';
  if(HB_ARTIST_PHOTO && inRect(x,y,HB_ARTIST_PHOTO)) return 'artpho';
  if(HB_ARTIST_EDIT_BTN && inRect(x,y,HB_ARTIST_EDIT_BTN)) return 'arted';
  if(HB_ARTIST_EDIT_BIO_BTN && inRect(x,y,HB_ARTIST_EDIT_BIO_BTN)) return 'artedbio';
  if(HB_FILTER_BTN && inRect(x,y,HB_FILTER_BTN)) return 'fltbtn';
  if(HB_INLINE_FILTER){
    if(HB_INLINE_FILTER.close && inRect(x,y,HB_INLINE_FILTER.close)) return 'ifc';
    if(HB_INLINE_FILTER.box && inRect(x,y,HB_INLINE_FILTER.box)) return 'ifb';
  }
  if(HB_ARTIST_SEE_MORE && inRect(x,y,HB_ARTIST_SEE_MORE)) return 'artmore';
  if(HB_ARTIST_LATEST && inRect(x,y,HB_ARTIST_LATEST)) return 'artlatest';
  if(HB_ARTIST_ALBUMS && HB_ARTIST_ALBUMS.length){
    for(var aai=0; aai<HB_ARTIST_ALBUMS.length; aai++){
      if(inRect(x,y,HB_ARTIST_ALBUMS[aai])) return 'artalb'+aai;
    }
  }
  if(HB_ARTIST_SINGLES && HB_ARTIST_SINGLES.length){
    for(var sai=0; sai<HB_ARTIST_SINGLES.length; sai++){
      if(inRect(x,y,HB_ARTIST_SINGLES[sai])) return 'artsing'+sai;
    }
  }
  if(HB_ARTIST_APPEARS && HB_ARTIST_APPEARS.length){
    for(var api=0; api<HB_ARTIST_APPEARS.length; api++){
      if(inRect(x,y,HB_ARTIST_APPEARS[api])) return 'artapp'+api;
    }
  }
  if(HB_LIKED && inRect(x,y,HB_LIKED)) return 'likednav';
  if(HB_HISTORY && inRect(x,y,HB_HISTORY)) return 'histnav';
  if(HB_HISTORY_CLEAR && inRect(x,y,HB_HISTORY_CLEAR)) return 'histclear';
  if(HB_ARTIST_SYNC && inRect(x,y,HB_ARTIST_SYNC)) return 'artsync';
  if(HB_ANALYTICS && inRect(x,y,HB_ANALYTICS)) return 'analy';
  if(view==='analytics'){
    if(HB_ANALYTICS_EXPORT && inRect(x,y,HB_ANALYTICS_EXPORT)) return 'anexport';
    if(HB_HEATMAP && HB_HEATMAP.length){
      for(var hmi2=0; hmi2<HB_HEATMAP.length; hmi2++){
        if(inRect(x,y,HB_HEATMAP[hmi2])) return 'anhm'+hmi2;
      }
    }
    if(HB_PODIUM && HB_PODIUM.length){
      for(var pdi2=0; pdi2<HB_PODIUM.length; pdi2++){
        if(inRect(x,y,HB_PODIUM[pdi2])) return 'anpod'+pdi2;
      }
    }
    if(HB_ARTIST_ROW && HB_ARTIST_ROW.length){
      for(var ari2=0; ari2<HB_ARTIST_ROW.length; ari2++){
        if(inRect(x,y,HB_ARTIST_ROW[ari2])) return 'anart'+ari2;
      }
    }
  }
  if(HB_ARTISTS_SYNC_BTN && inRect(x,y,HB_ARTISTS_SYNC_BTN)) return 'artsyncbtn';
  if(HB_SYNC_FETCH_MISSING && inRect(x,y,HB_SYNC_FETCH_MISSING)) return 'syncmiss';
  if(HB_SYNC_FETCH_ALL && inRect(x,y,HB_SYNC_FETCH_ALL)) return 'syncall';
  if(HB_SYNC_STOP && inRect(x,y,HB_SYNC_STOP)) return 'syncstop';
  if(HB_SYNC_OPEN_DIR && inRect(x,y,HB_SYNC_OPEN_DIR)) return 'syncopendir';
  if(HB_SYNC_ROWS && HB_SYNC_ROWS.length){
    for(var sri2=0; sri2<HB_SYNC_ROWS.length; sri2++){
      var sRow2=HB_SYNC_ROWS[sri2];
      if(sRow2.fetchBtn && inRect(x,y,sRow2.fetchBtn)) return 'syncfetch'+sri2;
      if(sRow2.viewBtn && inRect(x,y,sRow2.viewBtn)) return 'syncview'+sri2;
      if(inRect(x,y,sRow2)) return 'syncrow'+sri2;
    }
  }
  if(HB_SG && inRect(x,y,HB_SG)) return 'sgb';
  if(HB_PLSORT && inRect(x,y,HB_PLSORT)) return 'psb';
  if(HB_PLSORTDIR && inRect(x,y,HB_PLSORTDIR)) return 'psd';
  if(SB && inRect(x,y,SB)) return 'sb';
  if((i=hitIdx(HB_CTRL,x,y))>=0) return 'c'+i;
  if((i=hitIdx(HB_TABS,x,y))>=0) return 't'+i;
  if(HB_HOME && inRect(x,y,HB_HOME)) return 'h';
  if(HB_SEARCH && inRect(x,y,HB_SEARCH)) return 's';
  if((i=hitIdx(HB_CARD,x,y))>=0) return 'k'+i;
  if((i=hitIdx(HB_PL,x,y))>=0) return 'p'+HB_PL[i].i;
  if((i=hitIdx(HB_Q,x,y))>=0) return 'q'+i;
  if((i=hitIdx(HB_TR,x,y))>=0) return 'r'+i;
  return '';
}
function on_mouse_move(x,y){
  mx=x; my=y;
  if(drag==='seek'){ dragFrac=seekFrac(x); repaintBar(); return; }
  if(drag==='vol'){ applyVol(x); return; }
  if(drag==='songDetScroll'){ setSongDetScroll(y); return; }
  if(drag==='scroll'){ setScroll(y); return; }
  if(drag==='scrollh'){ setScrollH(x); return; }
  if(drag==='scrolln'){ setScrollN(y); return; }
  var sig=hoverSig(x,y), sk=scrollSection(x,y), z=hoverZone(x,y);
  if(sig!==hoverKey || sk!==scrollKey){   // sk change reveals/hides the section scrollbar
    hoverKey=sig; scrollKey=sk;
    // an overlay owns the whole screen and on_paint forces a full paint while one is open
    if(renameEdit||ctxMenu||confirmDel||dupPrompt||rgPrompt||sgMenuOpen||plSortMenuOpen||songDetails) repaintAll();
    else { repaintZone(hoverZoneKey); if(z!==hoverZoneKey) repaintZone(z); }   // clear the old highlight, then draw the new
  }
  hoverZoneKey=z;
}
// which scrollable section the cursor is over (so entering/leaving reveals the hover scrollbar even over gaps)
function scrollSection(x,y){
  if(R.navLib && x>=R.navLib.x && x<R.navLib.x+R.navLib.w && y>=R.navLib.y && y<R.navLib.y+R.navLib.h) return 'nav';
  if(R.main && x>=R.main.x && x<R.main.x+R.main.w+16 && y>=R.main.y && y<R.main.y+R.main.h){
    if(view==='home') return (y>=HOME_SHELF_Y0 && y<HOME_SHELF_Y1+16)?'shelf':'arts';
    if(view==='playlist') return 'pl';
    if(view==='songs') return 'songs';
    if(view==='search') return 'srch';
    if(view==='albums') return 'albs';
    if(view==='album') return 'alb';
    if(view==='artists') return 'artgr';
    if(view==='artist') return 'art';
    if(view==='artist_sync') return 'artsync';
    if(view==='history') return 'hist';
    if(view==='analytics') return 'analytics';
  }
  return '';
}
function on_mouse_leave(){
  mx=-1; my=-1;
  if(hoverKey!==''||scrollKey!==''){
    hoverKey=''; scrollKey='';
    if(renameEdit||ctxMenu||confirmDel||dupPrompt||rgPrompt||sgMenuOpen||plSortMenuOpen||songDetails) repaintAll();
    else repaintZone(hoverZoneKey);
  }
  hoverZoneKey='';
}
function on_char(code){
  if(songDetails){
    if(code===27){ closeSongDetails(); return; }
  }
  if(typeof artistStudioModal!=='undefined' && artistStudioModal){
    if(code===27){ closeArtistStudio(); return; }
    if(code===13){
      if(artistStudioModal.activeField==='bio'){
        artistStudioModal.bio += '\n';
      } else {
        saveArtistStudio();
      }
      caretOn=true; repaintAll(); return;
    }
    if(code===8){
      if(artistStudioModal.activeField==='listeners'){
        artistStudioModal.listeners=artistStudioModal.listeners.slice(0,-1);
      } else {
        artistStudioModal.bio=artistStudioModal.bio.slice(0,-1);
      }
      caretOn=true; repaintAll(); return;
    }
    if(code>=32){
      var ch=String.fromCharCode(code);
      if(artistStudioModal.activeField==='listeners'){
        if(artistStudioModal.listeners.length<35) artistStudioModal.listeners+=ch;
      } else {
        if(artistStudioModal.bio.length<3000) artistStudioModal.bio+=ch;
      }
      caretOn=true; repaintAll(); return;
    }
    return;
  }
  if(renameEdit){
    if(code===8) renameEdit.text=renameEdit.text.slice(0,-1);
    else if(code===27){ cancelRename(); return; }              // Esc = cancel
    else if(code===13){ commitRename(); return; }              // Enter = commit
    else if(code>=32) renameEdit.text+=String.fromCharCode(code);
    caretOn=true; repaintAll(); return;
  }
  if(code===6){ // Ctrl+F
    if(view==='playlist' || view==='songs' || view==='album'){
      toggleInlineFilter();
    }
    return;
  }
  if(typeof inlineFilterOpen!=='undefined' && inlineFilterOpen){
    if(code===27){
      if(inlineFilterText.length>0) clearInlineFilter();
      else closeInlineFilter();
      return;
    }
    if(code===13){
      if(HB_TR && HB_TR.length>0){
        var ftr=HB_TR[0];
        if(ftr.pl!==undefined && ftr.item!==undefined){
          var dit=getItems(ftr.pl);
          if(dit && dit[ftr.item]) playHandleList([dit[ftr.item]],0);
        } else if(ftr.handles && ftr.handles.length && ftr.idx!==undefined){
          playHandleList(ftr.handles, ftr.idx);
        } else if(ftr.songs && typeof songsTracks!=='undefined' && ftr.ti!==undefined && songsTracks[ftr.ti]){
          playSongsRow(ftr.ti);
        }
      }
      return;
    }
    if(code===8){
      inlineFilterText=inlineFilterText.slice(0,-1);
      caretOn=true; repaintAll(); return;
    }
    if(code>=32){
      inlineFilterText+=String.fromCharCode(code);
      caretOn=true; repaintAll(); return;
    }
    return;
  }
  if(view!=='search') return;
  if(code===8) searchQuery=searchQuery.slice(0,-1);
  else if(code===27) searchQuery='';
  else if(code>=32) searchQuery+=String.fromCharCode(code);
  searchScroll=searchScrollT=0; caretOn=true; repaintAll();   // keep caret solid right after a keystroke
}
function getClipboardText(){
  try{
    if(typeof utils !== 'undefined' && utils.GetClipboardText) return utils.GetClipboardText();
    var doc = new ActiveXObject('htmlfile');
    return doc.parentWindow.clipboardData.getData('Text') || '';
  }catch(e){ return ''; }
}
function on_key_down(vkey){
  var isCtrl = false;
  try{ if(typeof utils !== 'undefined' && utils.IsKeyPressed) isCtrl = utils.IsKeyPressed(0x11); }catch(e){}

  if(isCtrl && vkey === 86){
    var pasteStr = getClipboardText();
    if(pasteStr && pasteStr.length){
      if(typeof artistStudioModal !== 'undefined' && artistStudioModal){
        if(artistStudioModal.activeField === 'listeners'){
          artistStudioModal.listeners = (artistStudioModal.listeners + pasteStr.replace(/[\r\n]/g, '')).slice(0, 35);
        } else {
          artistStudioModal.bio = (artistStudioModal.bio + pasteStr).slice(0, 3000);
        }
        caretOn = true; repaintAll(); return;
      }
      if(renameEdit){
        renameEdit.text += pasteStr.replace(/[\r\n]/g, '');
        caretOn = true; repaintAll(); return;
      }
      if(typeof inlineFilterOpen !== 'undefined' && inlineFilterOpen){
        inlineFilterText += pasteStr.replace(/[\r\n]/g, '');
        caretOn = true; repaintAll(); return;
      }
      if(view === 'search'){
        searchQuery += pasteStr.replace(/[\r\n]/g, '');
        searchScroll=searchScrollT=0; computeSearch();
        caretOn = true; repaintAll(); return;
      }
    }
    return;
  }

  if(vkey === 46){
    if(typeof artistStudioModal !== 'undefined' && artistStudioModal){
      if(artistStudioModal.activeField === 'listeners'){
        artistStudioModal.listeners = artistStudioModal.listeners.slice(0, -1);
      } else {
        artistStudioModal.bio = artistStudioModal.bio.slice(0, -1);
      }
      caretOn = true; repaintAll(); return;
    }
    if(renameEdit){
      renameEdit.text = renameEdit.text.slice(0, -1);
      caretOn = true; repaintAll(); return;
    }
    if(typeof inlineFilterOpen !== 'undefined' && inlineFilterOpen){
      inlineFilterText = inlineFilterText.slice(0, -1);
      caretOn = true; repaintAll(); return;
    }
    if(view === 'search'){
      searchQuery = searchQuery.slice(0, -1);
      searchScroll=searchScrollT=0; computeSearch();
      caretOn = true; repaintAll(); return;
    }
  }
}
function on_mouse_wheel(step){
  if(songDetails){
    songDetScrollT=clampPx(songDetScrollT-step*Math.round(WHEEL_PX*1.8),SONG_DET_MAXPX);
    startScrollAnim();
    return;
  }
  if(fsMode){
    // lyrics with no timestamps don't roll themselves, so here the wheel scrolls them; with nothing
    // to scroll (synced, short enough to fit, or another view) it stays the volume control
    if(fsView==='lyrics' && lyStWheel(step)){ repaintAll(); return; }
    var v=pos2vol(clamp01(vol2pos(fb.Volume)+step*0.04));
    fb.Volume=v;
    if(v>-99) lastNonMuteVol=v;
    repaintAll(); return;
  }
  // right pane: same deal on the Lyrics tab. Consume the wheel either way -- it belongs to this
  // panel, and falling through would scroll the playlist behind the pointer.
  if(R.queue && rightTab==='lyrics' && mx>=R.queue.x && mx<R.queue.x+R.queue.w && my>=R.queue.y && my<R.queue.y+R.queue.h){
    if(lyStWheel(step)) repaintQueue();
    return;
  }
  if(R.navLib && mx>=R.navLib.x && mx<R.navLib.x+R.navLib.w && my>=R.navLib.y && my<R.navLib.y+R.navLib.h){
    navScrollT=clampPx(navScrollT-step*WHEEL_PX,NAV_MAX); startScrollAnim(); return;
  }
  if(mx<R.main.x || mx>=R.main.x+R.main.w) return;
  if(view==='home'){
    if(my>=HOME_SHELF_Y0 && my<HOME_SHELF_Y1){ plScrollT=snapShelf(plScrollT-step*WHEEL_PX); startScrollAnim(); }   // shelf: eased glide onto a card boundary
    else { homeScrollT=clampPx(homeScrollT-step*Math.round(WHEEL_PX*1.7),HOME_MAXROW); startScrollAnim(); }   // artists: bigger step, tall cards
    return;
  }
  else if(view==='songs'){ songsScrollT=clampPx(songsScrollT-step*WHEEL_PX,SONGS_MAXPX); startScrollAnim(); return; }
  else if(view==='search'){ searchScrollT=clampPx(searchScrollT-step*WHEEL_PX,SEARCH_MAXPX); startScrollAnim(); return; }
  else if(view==='artist'){ artistScrollT=clampPx(artistScrollT-step*WHEEL_PX,ARTIST_MAXPX); startScrollAnim(); return; }
  else if(view==='albums'){ albumsScrollT=clampPx(albumsScrollT-step*Math.round(WHEEL_PX*1.7),ALBUMS_MAXPX); startScrollAnim(); return; }
  else if(view==='artists'){ artistsScrollT=clampPx(artistsScrollT-step*Math.round(WHEEL_PX*1.7),ARTISTS_MAXPX); startScrollAnim(); return; }
  else if(view==='artist_sync'){ artistSyncScrollT=clampPx(artistSyncScrollT-step*WHEEL_PX,ARTIST_SYNC_MAXPX); startScrollAnim(); return; }
  else if(view==='history'){ historyScrollT=clampPx(historyScrollT-step*WHEEL_PX,HISTORY_MAXPX); startScrollAnim(); return; }
  else if(view==='analytics'){ ANALYTICS_SCROLL_T=clampPx(ANALYTICS_SCROLL_T-step*Math.round(WHEEL_PX*1.7),ANALYTICS_MAX_SCROLL); startScrollAnim(); return; }
  else if(view==='album'){ albumScrollT=clampPx(albumScrollT-step*WHEEL_PX,ALBUM_MAXPX); startScrollAnim(); return; }
  firstRowT=clampPx(firstRowT-step*WHEEL_PX,PL_MAXPX); startScrollAnim();
}
/* ---- drag & drop external files: two targets, the library section (-> new playlist) and the
   playlist view body (-> appends to it); everywhere else denies. We never see the dropped paths
   (DropTargetAction is write-only), so we name a destination and the component does the insert. */
function overLib(x,y){ return !!R.navLib && x>=R.navLib.x && x<R.navLib.x+R.navLib.w && y>=R.navLib.y && y<R.navLib.y+R.navLib.h; }
// body of the playlist view -> index of the playlist to append to, or -1 if that's not a valid target
function plDropTarget(x,y){
  if(fsMode || view!=='playlist' || !R.main) return -1;
  if(x<R.main.x || x>=R.main.x+R.main.w || y<R.main.y || y>=R.main.y+R.main.h) return -1;
  var i=plman.ActivePlaylist;
  if(i<0 || plman.IsPlaylistLocked(i)) return -1;   // autoplaylists etc. can't take manual inserts
  return i;
}
function dragUpdate(action,x,y){
  var ext=!action.IsInternal;                        // ignore drags started inside the skin
  var onLib=ext && overLib(x,y), onPl=!onLib && ext && plDropTarget(x,y)>=0;
  if(onLib||onPl) action.Effect=(action.Effect&1)?1:((action.Effect&4)?4:0);  // prefer copy, else link
  else action.Effect=0;                                                        // deny elsewhere
  setDropHover(onLib,onPl);
}
// repaint only the section whose cue changed -- drag-over fires on every mouse move
function setDropHover(onLib,onPl){
  if(onLib!==navDropHover){ navDropHover=onLib; repaintNav(); }
  if(onPl!==plDropHover){ plDropHover=onPl; repaintMain(); }
}
function on_drag_enter(action,x,y,mask){ dragUpdate(action,x,y); }
function on_drag_over(action,x,y,mask){ dragUpdate(action,x,y); }
function on_drag_leave(){ setDropHover(false,false); }
function on_drag_drop(action,x,y,mask){
  var ext=!action.IsInternal, hit=ext&&(action.Effect&5), pi=hit?plDropTarget(x,y):-1;   // 5 = copy|link
  if(hit && overLib(x,y)){
    var np=createNewPlaylist();
    action.Playlist=np; action.Base=0; action.ToSelect=true;            // component drops the files into it
    action.Effect=(action.Effect&1)?1:4;
    plman.ActivePlaylist=np; revealPlaylist(np); firstRow=firstRowT=0; view='playlist';
  } else if(pi>=0){
    plman.UndoBackup(pi);                                              // so ctrl+Z undoes the import
    armDupWatch(pi);                                                   // snapshot before the component inserts
    action.Playlist=pi; action.Base=plman.PlaylistItemCount(pi); action.ToSelect=true;   // append at end
    action.Effect=(action.Effect&1)?1:4;
  } else action.Effect=0;
  navDropHover=false; plDropHover=false; repaintAll();
}
function on_script_unload(){
  stopLyAnim(); stopCaret(); stopViz(); stopScrollAnim(); stopShimAnim(); stopMemWatch();
  if(dupWatch && dupWatch.timer) window.ClearTimeout(dupWatch.timer);
}
function invalidateLibrary(){
  artistList=null; artistTracksMap=null; artistCandCache={}; coverPickCache={}; warmed={}; searchIdx=null; searchQ2=null;
  albumList=null; albumMap={}; recentTracksList=null; currentAlbum=null;
  songsIdx=null; songsRows=null; songsTracks=null; libCovCache=null; libCount_=-1;
  libItems_=null; libTFCache={}; libPathMap=null;   // everything above is derived from these
  rgStat=null; rgScanFailed=false;
  warmJob=null; jobs={};           // anything in flight refers to the old library
  gates={}; rowGate={}; shelfHandles=null; artsGating=false;   // every section re-gates
}
function libChanged(){ invalidateLibrary(); artCardCache={}; artCardN=0; repaintAll(); }
function on_library_items_added(){ libChanged(); }
function on_library_items_removed(){ libChanged(); }
function on_library_items_changed(){ libChanged(); }

/* ------------------------- playback callbacks ------------------------- */
function on_playback_new_track(){
  updateNP();
  if(typeof historyOnNewTrack==='function') historyOnNewTrack(NP);
  // shuffle + loop-all: on wrapping from the last shuffled track back to the first, reshuffle the rest
  if(pbShuffle){
    var loc=playingLoc();
    var sp=playlistOfName(SHUF), idx=(loc&&loc.IsValid&&loc.PlaylistIndex===sp)?loc.PlaylistItemIndex:-1;
    if(sp>=0 && idx>=0){
      var cnt=plman.PlaylistItemCount(sp);
      if(pbRepeat===1 && lastShufIdx===cnt-1 && idx===0) reshuffleTail(sp);
      lastShufIdx=idx;
    } else lastShufIdx=-1;
  } else lastShufIdx=-1;
  repaintAll();
}
function npChanged(){ updateNP(); repaintAll(); }
function on_playback_dynamic_info_track(){ npChanged(); }
function on_playback_stop(){ npChanged(); }
function on_playback_pause(){ npChanged(); }
function on_playback_time(){
  repaintBar();
  if(typeof historyOnTime==='function' && NP) historyOnTime(fb.PlaybackTime, NP);
  var lyricsShown=(rightTab==='lyrics')||(fsMode&&fsView==='lyrics');
  if(lyricsShown && lyrics && lyrics!=='none' && lyrics.synced){ var c=currentLyricLine(); if(c!==lyCur){ lyCur=c; startLyAnim(); } }
}
function on_playback_seek(){ repaintAll(); }
function on_playback_order_changed(){ syncOrderFromFb(); repaintAll(); }
function on_playback_queue_changed(){ repaintAll(); }
function on_volume_change(){
  if(fb.Volume>-99) lastNonMuteVol=fb.Volume;
  repaintBar();
  if(fsMode) repaintAll();
}
// Keep ReplayGain disabled so playback volume is bit-perfect and never attenuated
function on_replaygain_mode_changed(){
  try{ if(fb.ReplaygainMode !== 0) fb.ReplaygainMode = 0; }catch(e){}
  repaintMain();
}
function on_metadb_changed(handles,fromhook){ if(fromhook) return; invalidateItems(); albKeyCache={}; hueCache={}; artistCandCache={}; coverPickCache={}; songsIdx=null; songsRows=null; songsTracks=null; updateNP(); repaintAll(); }
/* A switch changes which playlist is ACTIVE, not what any playlist contains -- and every cache
   invalidateItems() drops is keyed by playlist index, so none of them went stale here. Dropping
   them meant each switch re-derived covers and re-ran the art gates against an artCache that had
   since evicted those albums: the view fell back to its skeleton and the artwork reloaded. The
   caches that genuinely depend on playlist CONTENT are still cleared by the callbacks that mean
   content changed (items added/removed/reordered, playlists changed). */
function on_playlist_switch(){ firstRow=firstRowT=0; repaintAll(); }
function on_playlists_changed(){ invalidateItems(); loadLiked(); repaintAll(); }
function on_playlist_items_added(pl){ invalidateItems(); loadLiked(); if(dupWatch && dupWatch.pl===pl) scheduleDupScan(); repaintAll(); }
function on_playlist_items_removed(){ invalidateItems(); loadLiked(); repaintAll(); }
function on_playlist_items_reordered(){ invalidateItems(); repaintAll(); }
function on_item_focus_change(){ repaintAll(); }

layout();
updateNP();
loadLiked();
if(typeof loadHistory==='function') loadHistory();
syncOrderFromFb(); applyPlaybackOrder();   // normalize native order (we manage shuffle ourselves)
capVolume();       // pull a remembered volume back under the slider's ceiling
startMemWatch();   // caches grow into the component's spare memory and back off as it fills
