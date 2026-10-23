/* flacify/views/playlist.js -- playlist view, empty state, and the file drop zone
   Part of FLACify, the lossless Spotify-style experience for foobar2000. Loaded by main.js;
   every module shares one global scope, so load order is set there. */

var HB_PL_PLAY=null, HB_PL_SHUFFLE=null;

function drawPlaylist(gr,r){
  HB_TR=[]; HB_PLADD_FILES=null; HB_PLADD_FOLDER=null; HB_PL_PLAY=null; HB_PL_SHUFFLE=null;
  var p=activePl();
  // the header reads meta too (track count, total duration), so the whole view waits on it, and
  // then on the artwork the reveal will actually show
  var metaOk=ensureBuilt('meta'+p.i,function(){ return metaReady(p.i); },function(){ return metaSteps(p.i); });
  if(!metaOk || !gateReady('plart'+p.i,rowHandlesPl(p.i),0,ROW_GATE_MS)){   // 0 = the default cap
    if(metaOk || skelVisible('meta'+p.i)) drawViewSkeleton(gr,r);
    return;
  }
  var isLikedPl=(p.name===(typeof LIKED_PLAYLIST_NAME!=='undefined'?LIKED_PLAYLIST_NAME:'Liked Songs'));
  var headHue=isLikedPl?RGB(75,45,145):artHue(plChoice(p.i).single,p.name);
  gr.FillGradRect(r.x,r.y,r.w,M.headH,90,blend(headHue,COL.base,0.42),COL.base,1.0);
  var ax=r.x+M.cpad, ay=r.y+32, art=188;
  var pal=(typeof getAlbumPalette==='function')?getAlbumPalette(isLikedPl?null:plChoice(p.i).single,p.name):null;
  var auraCol=pal?pal.aura:RGBA(30,215,96,60);
  if(typeof drawArtworkAura==='function') drawArtworkAura(gr,ax,ay,art,8,auraCol);
  if(isLikedPl) drawLikedCover(gr,ax,ay,art,8);
  else {
    drawPlCover(gr,ax,ay,art,8,p.i,p.name);
    var covHot=hv(ax,ay,ax+art,ay+art);
    if(covHot){
      gr.FillRoundRect(ax,ay,art,art,8,8,RGBA(0,0,0,150));
      var isz=40, icx=ax+(art-isz)/2, icy=ay+(art-isz)/2-12;
      drawIcon(gr,'album',COL.white,icx,icy,isz,isz,32);
      var lbl=(typeof hasCustomPlCover==='function'&&hasCustomPlCover(p.name))?'Change photo':'Choose photo';
      var lblW=Math.round(gr.CalcTextWidth(lbl,FONT.plSub))+24, lblH=26;
      var lblX=ax+(art-lblW)/2, lblY=icy+isz+8;
      gr.FillRoundRect(lblX,lblY,lblW,lblH,lblH/2,lblH/2,RGBA(255,255,255,24));
      gr.DrawRoundRect(lblX,lblY,lblW,lblH,lblH/2,lblH/2,1,RGBA(255,255,255,140));
      gr.GdiDrawText(lbl,FONT.plSub,COL.white,lblX,lblY,lblW,lblH,DT_C);
    }
    HB_PL_COVER={x0:ax,y0:ay,x1:ax+art,y1:ay+art,pl:p.i,name:p.name};
  }

  // Right Column: Eyebrow, Title, Description, Stats, and Action Controls Bar
  var rx0=r.x+r.w-M.cpad;
  var tx=ax+art+24, tw=Math.max(120,rx0-tx);
  var isMix=(p.name.indexOf('Daily Mix')===0);
  var eyebrowTxt=isMix?'DAILY MIX':(isLikedPl?'PLAYLIST':'PLAYLIST');
  tL(gr,eyebrowTxt,FONT.eyebrow,isMix?COL.green:COL.text2,tx,ay+2,tw,18);

  var titleY=ay+22;
  var titleFont=(p.name.length>24?FONT.sect2:FONT.title);
  var tH=lineH(gr,titleFont);
  var titleH=Math.max(tH,(titleFont===FONT.title?62:34));
  tL(gr,p.name,titleFont,COL.text,tx,titleY,tw,titleH);

  var desc=(typeof getPlaylistDescription==='function')?getPlaylistDescription(p.name):'';
  var curY=titleY+titleH+10;
  if(desc){
    var descH=Math.max(18,lineH(gr,FONT.plSub));
    tL(gr,desc,FONT.plSub,COL.text2,tx,curY,tw,descH);
    curY+=descH+10;
  }

  var meta0=getMeta(p.i);
  var pCntStr=fmtNum(p.count);
  var pCntW=Math.round(gr.CalcTextWidth(pCntStr, FONT.meta));
  tL(gr, pCntStr, FONT.meta, COL.white, tx, curY, pCntW, 20);
  var pRestX=tx+pCntW;
  var sLbl=' song'+(p.count===1?'':'s');
  var sLblW=Math.round(gr.CalcTextWidth(sLbl, FONT.meta));
  tL(gr, sLbl, FONT.meta, COL.text2, pRestX, curY, sLblW, 20);
  pRestX+=sLblW;
  if(meta0.totalSec>0){
    var dotSep=' '+CH_DOT+' ';
    var dotSepW=Math.round(gr.CalcTextWidth(dotSep, FONT.meta));
    tL(gr, dotSep, FONT.meta, COL.text2, pRestX, curY, dotSepW, 20);
    pRestX+=dotSepW;
    var durStr=fmtDur(meta0.totalSec);
    var metaDurW=Math.round(gr.CalcTextWidth(durStr, FONT.meta));
    tL(gr, durStr, FONT.meta, COL.white, pRestX, curY, metaDurW, 20);
  }
  curY+=22;

  // Action Controls Bar: Big Play Button (48px) + Shuffle (38px) + Filter + Sort Controls
  var actY=Math.max(curY+10, ay+138);
  var pbSz=48;
  var loc=playingLoc();
  var isPlayingThisPl=(fb.IsPlaying && loc && loc.IsValid && loc.PlaylistIndex===p.i);
  var pbHot=hv(tx,actY,tx+pbSz,actY+pbSz);
  gr.FillEllipse(tx,actY,pbSz,pbSz,pbHot?RGB(45,230,115):COL.green);
  drawIcon(gr,isPlayingThisPl?'pause':'play',COL.black,tx,actY,pbSz,pbSz,20);
  HB_PL_PLAY={x0:tx,y0:actY,x1:tx+pbSz,y1:actY+pbSz,pl:p.i};

  var shufSz=38, shufX=tx+pbSz+14, shufY=actY+Math.round((pbSz-shufSz)/2);
  var shufHot=hv(shufX,shufY,shufX+shufSz,shufY+shufSz);
  var isShufActive=(pbShuffle && loc && loc.IsValid && loc.PlaylistIndex===p.i);
  gr.FillEllipse(shufX,shufY,shufSz,shufSz,shufHot?RGBA(255,255,255,24):RGBA(255,255,255,12));
  strokeRound(gr,shufX,shufY,shufSz,shufSz,shufSz/2,1,(shufHot||isShufActive)?COL.green:RGBA(255,255,255,28));
  drawIcon(gr,'shuffle',(shufHot||isShufActive)?COL.green:COL.text2,shufX,shufY,shufSz,shufSz,18);
  HB_PL_SHUFFLE={x0:shufX,y0:shufY,x1:shufX+shufSz,y1:shufY+shufSz,pl:p.i};

  var sortDirW=38, sortPillW=180, sortGap=8, fltBtnSz=38, fltGap=8;
  var sortTotalW=sortPillW+sortGap+sortDirW+fltGap+fltBtnSz;
  var fltBtnX=Math.max(shufX+shufSz+16,rx0-sortTotalW);
  var sortY=actY+Math.round((pbSz-38)/2);
  var sortX=fltBtnX+fltBtnSz+fltGap;
  drawFilterButton(gr,fltBtnX,sortY,fltBtnSz);
  HB_PLSORT=drawDropPill(gr,sortX,sortY,sortPillW,38,'Sort: '+labelOf(PL_SORTS,plSort,'Artist'),plSortMenuOpen);
  drawSortDirBtn(gr,sortX+sortPillW+sortGap,sortY,sortDirW,38);

  // track list
  var lx=r.x+M.cpad, rx=r.x+r.w-M.cpad;
  var listTop=r.y+M.headH+8;
  var filterActive=(typeof inlineFilterOpen!=='undefined'&&inlineFilterOpen)||(typeof inlineFilterText!=='undefined'&&inlineFilterText.length>0);
  var filterH=34;
  var filterY=listTop;
  var colTop=filterActive ? (listTop+filterH+10) : listTop;
  var rowsTop=colTop+34;

  var numW=30, durW=54, heartW=28, cgap=16;
  var albumW=Math.round((rx-lx-numW-durW-heartW-cgap*4)*0.34);
  var titleX=lx+numW+cgap, titleW=(rx-lx-numW-durW-heartW-albumW-cgap*4);
  var albumX=titleX+titleW+cgap;
  var heartX=albumX+albumW+cgap;
  loc=playingLoc();
  var items=getItems(p.i), meta=getMeta(p.i), shufHere=npIsShuffleOf(p.name);
  var order=getPlOrder(p.i);   // display position -> native item index
  var displayOrder=order;
  if(typeof inlineFilterText!=='undefined' && inlineFilterText.length>0){
    var fq=inlineFilterText.toLowerCase();
    displayOrder=[];
    for(var oi=0; oi<order.length; oi++){
      var oj=order[oi];
      var tT=(meta.title[oj]||'').toLowerCase();
      var tA=(meta.artist[oj]||'').toLowerCase();
      var tAl=(meta.album[oj]||'').toLowerCase();
      if(tT.indexOf(fq)!==-1 || tA.indexOf(fq)!==-1 || tAl.indexOf(fq)!==-1){
        displayOrder.push(oj);
      }
    }
  }
  var displayCount=displayOrder.length;
  var rh=M.rowH, cropY=r.y+r.h, viewH=cropY-rowsTop;
  var contentH=displayCount*rh, maxPx=Math.max(0,contentH-viewH);   // firstRow is a PIXEL offset
  PL_MAXPX=maxPx;
  firstRow=clampPx(firstRow,maxPx); firstRowT=clampPx(firstRowT,maxPx);
  warmOnce('pl'+p.i,items);
  for(var d=Math.floor(firstRow/rh); d<displayCount; d++){
    var ry=rowsTop+d*rh-firstRow; if(ry>=cropY) break;
    var j=displayOrder[d]; var h=items[j]; if(!h){ continue; }
    var isPlaying=(loc && loc.IsValid && loc.PlaylistIndex===p.i && loc.PlaylistItemIndex===j)
                  || (shufHere && sameHandle(h,NP));   // playing from this playlist's hidden shuffle copy
    // the row whose context menu is open stays lit (brighter than hover)
    var isMenuRow=!!(ctxMenu && ctxMenu.kind==='track' && ctxMenu.pl===p.i && ctxMenu.item===j);
    var isHover=hv(r.x,ry,r.x+r.w,ry+rh)||isMenuRow;
    if(isHover) gr.FillRoundRect(lx-8,ry,rx-lx+16,rh,4,4,isMenuRow?COL.rowActive:COL.rowHover);
    var titleCol=isPlaying?COL.green:COL.text;
    if(isHover) drawIcon(gr,'play',COL.text,lx,ry,numW,rh,14);
    else tL(gr,String(d+1),FONT.rowNum,isPlaying?COL.green:COL.white,lx,ry,numW,rh);
    var cs=40, cy=ry+(rh-cs)/2, alb=meta.album[j];
    drawCover(gr,titleX,cy,cs,3,h,alb||String(j),meta.artkey[j]);
    var ttx=titleX+cs+12, ttw=titleW-cs-12;
    tL(gr,meta.title[j],FONT.rowTitle,titleCol,ttx,ry+8,ttw,20);
    tL(gr,meta.artist[j],FONT.rowArtist,COL.text2,ttx,ry+30,ttw,16);
    tL(gr,alb,FONT.rowCell,COL.text2,albumX,ry,albumW,rh);
    var lk=isLiked(h);
    if(isHover || lk){
      var hCol=lk?COL.green:(hv(heartX-4,ry+(rh-18)/2-2,heartX+22,ry+(rh-18)/2+20)?COL.text:COL.text2);
      drawIcon(gr,lk?'heartFilled':'heart',hCol,heartX,ry+(rh-18)/2,18,18,15);
    }
    tR(gr,meta.len[j],FONT.rowCell,isPlaying?COL.green:COL.white,rx-durW,ry,durW,rh);
    HB_TR.push({x0:lx-8,y0:ry,x1:rx+8,y1:ry+rh,pl:p.i,item:j,pgx0:lx,pgx1:lx+numW,hx0:heartX-6,hx1:heartX+24});
  }
  // crop the partial rows top & bottom, then draw the sticky column header on top
  gr.FillSolidRect(r.x,rowsTop-rh,r.w,rh,COL.base);
  if(filterActive) gr.FillSolidRect(r.x,filterY-4,r.w,rowsTop-filterY+4,COL.base);
  gr.FillSolidRect(r.x,cropY,r.w,M.pad+2,COL.black);   // gutter below the panel
  if(p.count===0){ drawPlEmpty(gr,r,rowsTop-rh,cropY); drawSortMenu(gr); return; }   // no column headings over a void
  if(displayCount===0 && p.count>0){
    tC(gr,'No tracks match "'+inlineFilterText+'"',FONT.sect,COL.text2,r.x,rowsTop+40,r.w,24);
    tC(gr,'Press Escape to clear the filter',FONT.meta,COL.text3,r.x,rowsTop+70,r.w,20);
  }

  // Draw sticky filter bar (if active)
  if(filterActive){
    drawInlineFilterBar(gr,lx,filterY,rx-lx,filterH,displayOrder.length,p.count);
  }

  tL(gr,'#',FONT.head,COL.text2,lx,colTop,numW,20);
  tL(gr,'TITLE',FONT.head,COL.text2,titleX,colTop,titleW,20);
  tL(gr,'ALBUM',FONT.head,COL.text2,albumX,colTop,albumW,20);
  drawIcon(gr,'clock',COL.text2,rx-16,colTop,16,20,15);
  gr.DrawLine(lx,colTop+26,rx,colTop+26,1,COL.line);
  drawScrollbar(gr,rx+8,rowsTop,viewH,firstRow,maxPx,viewH,contentH,hv(r.x,r.y,r.x+r.w,cropY)||drag==='scroll');
  // the empty-state zone isn't on screen here, so outline the list itself as the target
  if(plDropHover){
    var iy=rowsTop-rh, ih=cropY-iy, ix=lx-12, iw=rx-lx+24, ir=Math.min(12,iw/2,ih/2);
    gr.FillRoundRect(ix,iy,iw,ih,ir,ir,RGBA(30,215,96,20));
    strokeRound(gr,ix,iy,iw,ih,ir,2,COL.green);
    var lh=34, ly=iy+ih-lh-18, lw=Math.min(iw-32,pillW(gr,'Drop to add to this playlist'));
    if(lw>=lh && ih>lh+36){                                  // radius is lh/2, so lw must clear it
      gr.FillRoundRect(cxOf(ix,iw,lw),ly,lw,lh,lh/2,lh/2,COL.green);
      tC(gr,'Drop to add to this playlist',FONT.pl,COL.black,cxOf(ix,iw,lw),ly,lw,lh);
    }
  }
  drawSortMenu(gr);
}
// zero-track playlist: centred badge/headline/buttons, or one big drop cue while files are
// dragged over it. Degrades from the top down as the panel gets shorter.
function drawPlEmpty(gr,r,top,bottom){
  var availH=bottom-top, availW=r.w-M.cpad*2;
  if(availW<220 || availH<110) return;
  var cx=r.x+Math.round(r.w/2);
  if(plDropHover){ drawDropZone(gr,cx,top,availW,availH); return; }

  var badge=availH>=250, sub=availH>=170;
  var blockH=(badge?86:0)+40+(sub?24:0)+24+PILL_H;
  var y=top+Math.round((availH-blockH)/2);
  if(badge){
    var bs=64, bx=cx-bs/2;
    gr.FillEllipse(bx,y,bs,bs,RGBA(255,255,255,16));
    drawIcon(gr,'add',COL.text2,bx,y,bs,bs,26);
    y+=86;
  }
  tC(gr,"Let's add some songs",FONT.sect2,COL.text,r.x,y,r.w,40); y+=40;
  if(sub){ tC(gr,'Drag files here, or browse your computer.',FONT.meta,COL.text2,r.x,y,r.w,24); y+=24; }
  y+=24;
  // the pair hugs its labels and centres as a group, so widths stay balanced at any UISCALE
  var w1=pillW(gr,'Browse files'), w2=pillW(gr,'Browse folder'), gap=12;
  var px=cx-Math.round((w1+w2+gap)/2);
  HB_PLADD_FILES=drawPill(gr,px,y,w1,'Browse files',true);
  HB_PLADD_FOLDER=drawPill(gr,px+w1+gap,y,w2,'Browse folder',false);
}
// green wash + rounded outline + label: the shape the cursor is aiming at
function drawDropZone(gr,cx,top,availW,availH){
  var bw=Math.min(560,availW), bh=Math.min(260,availH-24);
  var bx=cx-Math.round(bw/2), by=top+Math.round((availH-bh)/2), rad=Math.min(14,bw/2,bh/2);
  gr.FillRoundRect(bx,by,bw,bh,rad,rad,RGBA(30,215,96,26));
  strokeRound(gr,bx,by,bw,bh,rad,2,COL.green);
  var iy=by+Math.round(bh/2)-40;
  drawIcon(gr,'add',COL.green,bx,iy,bw,34,34);
  tC(gr,'Drop to add to this playlist',FONT.sect,COL.green,bx,iy+44,bw,26);
}
/* Pill buttons: primary is a solid white capsule with black text, secondary is outlined. Both
   nudge outward on hover (no transforms here, so "scale" is a 2px grow) inside a padded hitbox. */
var PILL_H=42;
function pillW(gr,label){ return Math.max(140,gr.CalcTextWidth(label,FONT.pl)+48); }
function drawPill(gr,x,y,w,label,primary){
  var hb={x0:x-3,y0:y-3,x1:x+w+3,y1:y+PILL_H+3};
  var g=hv(hb.x0,hb.y0,hb.x1,hb.y1)?2:0;
  var bx=x-g, by=y-g, bw=w+g*2, bh=PILL_H+g*2, rad=bh/2;
  if(primary) gr.FillRoundRect(bx,by,bw,bh,rad,rad,COL.text);
  else strokeRound(gr,bx,by,bw,bh,rad,g?2:1,g?COL.text:COL.text2);
  tC(gr,label,FONT.pl,primary?COL.black:COL.text,bx,by,bw,bh);
  return hb;
}
