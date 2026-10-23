/* flacify/views/album.js -- album details view: Spotify-grade hero, interactive artist profile, action controls, tracklist, artist spotlight, discography shelf, and release footer
   Part of FLACify, the lossless Spotify-style experience for foobar2000. Loaded by main.js;
   every module shares one global scope, so load order is set there. */

var albumScroll=0, albumScrollT=0, ALBUM_MAXPX=0;
var HB_ALBUM_ARTIST=null, HB_ALBUM_ARTISTS=[], HB_ALBUM_PLAY=null, HB_ALBUM_SHUFFLE=null, HB_ALBUM_CTA=null, HB_ALBUM_OTHER=[];

function drawAlbum(gr, r){
  HB_TR=[];
  HB_ALBUM_PLAY=null;
  HB_ALBUM_ARTIST=null;
  HB_ALBUM_ARTISTS=[];
  HB_ALBUM_SHUFFLE=null;
  HB_ALBUM_CTA=null;
  HB_ALBUM_OTHER=[];

  var alb=currentAlbum;
  if(!alb){
    tC(gr,'No album selected',FONT.sect,COL.text2,r.x,r.y+Math.round(r.h/2)-20,r.w,24);
    return;
  }

  var pad=M.cpad, x0=r.x+pad, w=r.w-pad*2;
  var scroll=Math.round(albumScroll);
  var cropY=r.y+r.h;
  var cover=alb.handle;

  // 1. Dynamic Ambient Tinted Gradient (Anchored to view top)
  var gradH=Math.max(380, Math.min(500, Math.round(r.h*0.65)));
  gr.FillGradRect(r.x, r.y, r.w, gradH, 90, blend(artHue(cover,alb.name), COL.base, 0.46), COL.base, 1.0);

  // 2. Hero Section: Enlarged Cover Artwork (250x250) & Typography
  var artSz=250;
  var ax=x0, ay=r.y+24-scroll;

  if(ay+artSz>r.y && ay<cropY){
    // Subtle color aura behind 250px artwork
    var pal=(typeof getAlbumPalette==='function')?getAlbumPalette(cover,alb.name):null;
    var auraCol=pal?pal.aura:RGBA(30,215,96,60);
    if(typeof drawArtworkAura==='function'){
      drawArtworkAura(gr, ax, ay, artSz, 8, auraCol);
    } else {
      gr.FillRoundRect(ax+4, ay+6, artSz, artSz, 10, 10, RGBA(0,0,0,150));
    }
    drawRounded(gr, ax, ay, artSz, 8, cover, alb.name);
  }

  // Right Column: Eyebrow, Title, Interactive Artist Row, and Lossless Specs
  var tx=ax+artSz+28, tw=r.x+r.w-pad-tx;
  var ty=ay+6;

  // Eyebrow badge
  var typeTxt=(alb.count>1 ? (alb.count>6 ? 'ALBUM' : 'EP') : 'SINGLE');
  if(ty+18>r.y && ty<cropY) tL(gr, typeTxt, FONT.eyebrow, COL.text, tx, ty, tw, 18);
  ty+=24;

  // Album Title (Dynamic font size for long titles)
  var titleFont=(alb.name.length>26 ? FONT.sect2 : FONT.title);
  var titleH=(alb.name.length>26 ? 38 : 68);
  if(ty+titleH>r.y && ty<cropY) tL(gr, alb.name, titleFont, COL.text, tx, ty, tw, titleH);
  ty+=titleH+14;

  // Interactive Artist Profile Row (Avatars + Clickable Individual Names + Stats)
  var aavSz=26;
  var arts=alb.artists||[{name:alb.artist, handle:alb.artistHandle}];
  var numAv=Math.min(3, arts.length);
  var avOverlap=18;
  var totalAvW=(numAv===1)?aavSz:( (numAv-1)*avOverlap + aavSz );

  if(ty+aavSz>r.y && ty<cropY){
    for(var avi=0; avi<numAv; avi++){
      var avX=tx+avi*avOverlap;
      if(numAv>1) gr.FillEllipse(avX-1, ty-1, aavSz+2, aavSz+2, COL.base);
      drawCircle(gr, avX, ty, aavSz, arts[avi].handle, arts[avi].name);
      HB_ALBUM_ARTISTS.push({
        x0:avX, y0:Math.max(ty, r.y), x1:avX+aavSz, y1:Math.min(ty+aavSz, cropY),
        artist:arts[avi].name, id:'hav_'+avi
      });
    }
  }

  var curArtX=tx+totalAvW+10;
  for(var ai=0; ai<arts.length; ai++){
    var aName=arts[ai].name;
    var aW=Math.round(gr.CalcTextWidth(aName, FONT.pl));
    var aHov=hv(curArtX, Math.max(ty, r.y), curArtX+aW, Math.min(ty+aavSz, cropY));
    if(ty+aavSz>r.y && ty<cropY){
      tL(gr, aName, FONT.pl, aHov ? COL.green : COL.text, curArtX, ty, aW, aavSz);
      if(aHov) gr.FillSolidRect(curArtX, ty+aavSz-4, aW, 1, COL.green);
      HB_ALBUM_ARTISTS.push({
        x0:curArtX, y0:Math.max(ty, r.y), x1:curArtX+aW, y1:Math.min(ty+aavSz, cropY),
        artist:aName, id:'hnm_'+ai
      });
      if(ai===0) HB_ALBUM_ARTIST={x0:tx, y0:Math.max(ty, r.y), x1:curArtX+aW, y1:Math.min(ty+aavSz, cropY), artist:aName};
    }
    curArtX+=aW;
    if(ai<arts.length-1){
      var sep=', ';
      var sepW=Math.round(gr.CalcTextWidth(sep, FONT.pl));
      if(ty+aavSz>r.y && ty<cropY) tL(gr, sep, FONT.pl, COL.text2, curArtX, ty, sepW, aavSz);
      curArtX+=sepW;
    }
  }

  var metaRestW=tx+tw-curArtX;
  if(ty+aavSz>r.y && ty<cropY && metaRestW>10){
    var mx=curArtX;
    if(alb.year){
      var dStr=' '+CH_DOT+' ';
      var dW=Math.round(gr.CalcTextWidth(dStr, FONT.meta));
      tL(gr, dStr, FONT.meta, COL.text2, mx, ty, dW, aavSz);
      mx+=dW;
      var yStr=String(alb.year);
      var yW=Math.round(gr.CalcTextWidth(yStr, FONT.meta));
      tL(gr, yStr, FONT.meta, COL.white, mx, ty, yW, aavSz);
      mx+=yW;
    }
    var d2Str=' '+CH_DOT+' ';
    var d2W=Math.round(gr.CalcTextWidth(d2Str, FONT.meta));
    tL(gr, d2Str, FONT.meta, COL.text2, mx, ty, d2W, aavSz);
    mx+=d2W;
    var cStr=String(alb.count);
    var cW=Math.round(gr.CalcTextWidth(cStr, FONT.meta));
    tL(gr, cStr, FONT.meta, COL.white, mx, ty, cW, aavSz);
    mx+=cW;
    var restStr=' song'+(alb.count===1?'':'s')+', ';
    var restW=Math.round(gr.CalcTextWidth(restStr, FONT.meta));
    tL(gr, restStr, FONT.meta, COL.text2, mx, ty, restW, aavSz);
    mx+=restW;
    var durStr=fmtDur(alb.totalSec);
    var metaDurW=Math.round(gr.CalcTextWidth(durStr, FONT.meta));
    tL(gr, durStr, FONT.meta, COL.white, mx, ty, metaDurW, aavSz);
  }
  ty+=aavSz+18;

  // Hi-Res Lossless Specs Glass Pill
  var specsText='';
  if(alb.codec) specsText+=String(alb.codec).toUpperCase();
  if(alb.bitdepth) specsText+=(specsText?' '+CH_DOT+' ':'')+alb.bitdepth+'-bit';
  if(alb.samplerate){
    var sr=parseFloat(alb.samplerate);
    var srStr=(sr>1000)?(sr/1000).toFixed(1)+' kHz':sr+' Hz';
    specsText+=(specsText?' / ':'')+srStr;
  }
  if(alb.bitrate) specsText+=(specsText?' '+CH_DOT+' ':'')+alb.bitrate+' kbps';

  if(specsText){
    var pillW=Math.max(160, Math.round(gr.CalcTextWidth(specsText, FONT.plSub))+28);
    var pillH=26;
    if(ty+pillH>r.y && ty<cropY){
      gr.FillRoundRect(tx, ty, pillW, pillH, pillH/2, pillH/2, RGBA(255,255,255,16));
      strokeRound(gr, tx, ty, pillW, pillH, pillH/2, 1, RGBA(255,255,255,36));
      tC(gr, specsText, FONT.plSub, COL.green, tx, ty, pillW, pillH);
    }
  }

  // 3. Action Controls Bar: Big Play Button (56px) + Shuffle Button (38px)
  var playRowY=ay+artSz+24;
  var pb=56;
  var pbHot=hv(x0, Math.max(playRowY, r.y), x0+pb, Math.min(playRowY+pb, cropY));
  if(playRowY+pb>r.y && playRowY<cropY){
    gr.FillEllipse(x0, playRowY, pb, pb, pbHot ? RGB(45,230,115) : COL.green);
    drawIcon(gr, 'play', COL.black, x0, playRowY, pb, pb, 24);
    HB_ALBUM_PLAY={x0:x0, y0:Math.max(playRowY, r.y), x1:x0+pb, y1:Math.min(playRowY+pb, cropY), handles:alb.handles};
  }

  var shufX=x0+pb+18, shufSz=38, shufY=playRowY+Math.round((pb-shufSz)/2);
  var shufHot=hv(shufX, Math.max(shufY, r.y), shufX+shufSz, Math.min(shufY+shufSz, cropY));
  if(shufY+shufSz>r.y && shufY<cropY){
    gr.FillEllipse(shufX, shufY, shufSz, shufSz, shufHot ? RGBA(255,255,255,24) : RGBA(255,255,255,12));
    strokeRound(gr, shufX, shufY, shufSz, shufSz, shufSz/2, 1, shufHot ? COL.green : RGBA(255,255,255,28));
    drawIcon(gr, 'shuffle', shufHot ? COL.green : COL.text2, shufX, shufY, shufSz, shufSz, 18);
    HB_ALBUM_SHUFFLE={x0:shufX, y0:Math.max(shufY, r.y), x1:shufX+shufSz, y1:Math.min(shufY+shufSz, cropY), handles:alb.handles};
  }

  var fltBtnX=shufX+shufSz+14, fltBtnSz=38, fltBtnY=shufY;
  if(fltBtnY+fltBtnSz>r.y && fltBtnY<cropY){
    drawFilterButton(gr, fltBtnX, fltBtnY, fltBtnSz);
  }

  // 4. Compute Filtered Track Rows
  var displayTracks=(alb && alb.trackRows)?alb.trackRows:[];
  if(typeof inlineFilterText!=='undefined' && inlineFilterText.length>0){
    var afq=inlineFilterText.toLowerCase();
    displayTracks=[];
    for(var adi=0; adi<(alb.trackRows?alb.trackRows.length:0); adi++){
      var atr=alb.trackRows[adi];
      if(!atr) continue;
      var atTitle=(atr.title||'').toLowerCase();
      var atArtist=(atr.artist||'').toLowerCase();
      if(atTitle.indexOf(afq)!==-1 || atArtist.indexOf(afq)!==-1){
        displayTracks.push(atr);
      }
    }
  }

  // Tracklist Column Headers & Inline Filter
  var filterActive=(typeof inlineFilterOpen!=='undefined'&&inlineFilterOpen)||(typeof inlineFilterText!=='undefined'&&inlineFilterText.length>0);
  var listTop=playRowY+pb+24;
  if(filterActive){
    if(listTop+34>r.y && listTop<cropY) drawInlineFilterBar(gr, x0, listTop, w, 32, displayTracks.length, alb.trackRows.length);
    listTop+=42;
  }
  var numW=34, durW=60;
  var titleX=x0+numW+16, titleW=w-numW-durW-32;
  var durX=x0+w-durW;

  if(listTop+24>r.y && listTop<cropY){
    tL(gr, '#', FONT.head, COL.text2, x0, listTop, numW, 20);
    tL(gr, 'TITLE', FONT.head, COL.text2, titleX, listTop, titleW, 20);
    drawIcon(gr, 'clock', COL.text2, durX+durW-18, listTop, 16, 20, 15);
    gr.FillSolidRect(x0, listTop+26, w, 1, COL.line);
  }

  var rowsTop=listTop+34;
  var rh=50;

  if(displayTracks.length===0 && alb.trackRows.length>0 && rowsTop+40>r.y && rowsTop<cropY){
    tC(gr,'No tracks match "'+inlineFilterText+'"',FONT.sect,COL.text2,x0,rowsTop+20,w,24);
    tC(gr,'Press Escape to clear the filter',FONT.meta,COL.text3,x0,rowsTop+50,w,20);
  }

  for(var d=0; d<displayTracks.length; d++){
    var ry=rowsTop+d*rh;
    if(ry+rh<=r.y) continue;
    if(ry>=cropY) break;

    var tr=displayTracks[d];
    if(!tr) continue;
    var isPlaying=!!(NP && tr.handle && NP.Path===tr.handle.Path);
    var isHov=hv(x0-6, Math.max(ry, r.y), x0+w+6, Math.min(ry+rh, cropY));

    if(isHov) gr.FillRoundRect(x0-6, ry, w+12, rh, 4, 4, COL.rowHover);

    // Number / Playing Indicator / Hover Play
    if(isHov) drawIcon(gr, 'play', COL.text, x0, ry, numW, rh, 14);
    else if(isPlaying) drawIcon(gr, 'equalizer', COL.green, x0, ry, numW, rh, 14);
    else tL(gr, String(tr.trackno||(d+1)), FONT.rowNum, COL.white, x0, ry, numW, rh);

    // Title + Collaboration/Featured Artist Subline
    if(tr.artist && tr.artist!==alb.artist){
      tL(gr, tr.title||'Unknown Track', FONT.rowTitle, isPlaying ? COL.green : COL.text, titleX, ry+6, titleW, 20);
      tL(gr, tr.artist, FONT.plSub, COL.text3, titleX, ry+27, titleW, 16);
    } else {
      tL(gr, tr.title||'Unknown Track', FONT.rowTitle, isPlaying ? COL.green : COL.text, titleX, ry, titleW, rh);
    }

    // Duration
    tR(gr, tr.dur||'0:00', FONT.rowCell, isPlaying ? COL.green : COL.white, durX, ry, durW, rh);

    var cy0=Math.max(ry, r.y), cy1=Math.min(ry+rh, cropY);
    if(cy1>cy0){
      HB_TR.push({x0:x0-6, y0:cy0, x1:x0+w+6, y1:cy1, albumRow:true, idx:(tr.idx!==undefined?tr.idx:d), handles:alb.handles, pgx0:x0, pgx1:x0+numW});
    }
  }

  // 6. Artist Spotlight Section (Below Tracklist)
  var curY=rowsTop+displayTracks.length*rh+28;
  if(curY>r.y && curY<cropY) gr.FillSolidRect(x0, curY, w, 1, COL.line);
  curY+=24;

  var spotArts=alb.artists||[{
    name:alb.artist,
    handle:alb.artistHandle,
    albumCount:alb.artistAlbumCount,
    songCount:alb.artistSongCount
  }];

  if(curY+20>r.y && curY<cropY){
    tL(gr, (spotArts.length>1?'ARTIST SPOTLIGHTS':'ARTIST SPOTLIGHT'), FONT.head, COL.text3, x0, curY, w, 18);
  }
  curY+=24;

  var cardH=92;
  for(var si=0; si<spotArts.length; si++){
    var sArt=spotArts[si];
    var scY=curY;
    if(scY+cardH>r.y && scY<cropY){
      var scHov=hv(x0, Math.max(scY, r.y), x0+w, Math.min(scY+cardH, cropY));
      gr.FillRoundRect(x0, scY, w, cardH, 10, 10, scHov ? RGB(32,32,32) : RGB(24,24,24));
      strokeRound(gr, x0, scY, w, cardH, 10, 1, scHov ? RGBA(255,255,255,28) : RGBA(255,255,255,14));

      // Circular portrait
      var spArtSz=64;
      var spAx=x0+16, spAy=scY+14;
      drawCircle(gr, spAx, spAy, spArtSz, sArt.handle, sArt.name);

      // Artist name and stats
      var spTx=spAx+spArtSz+18;
      var spTw=w-spArtSz-170;
      tL(gr, 'ARTIST', FONT.eyebrow, COL.text3, spTx, scY+15, spTw, 15);
      tL(gr, sArt.name, FONT.sect, scHov ? COL.green : COL.text, spTx, scY+32, spTw, 24);
      var aAlbCount=sArt.albumCount||1;
      var aSngCount=sArt.songCount||alb.count;
      var statsTxt=aAlbCount+' album'+(aAlbCount===1?'':'s')+' '+CH_DOT+' '+aSngCount+' song'+(aSngCount===1?'':'s')+' in your library';
      tL(gr, statsTxt, FONT.plSub, COL.text2, spTx, scY+58, spTw, 18);

      // View Artist button
      var ctaW=114, ctaH=34;
      var ctaX=x0+w-ctaW-20, ctaY=scY+Math.round((cardH-ctaH)/2);
      var ctaHov=hv(ctaX, Math.max(ctaY, r.y), ctaX+ctaW, Math.min(ctaY+ctaH, cropY));
      gr.FillRoundRect(ctaX, ctaY, ctaW, ctaH, ctaH/2, ctaH/2, ctaHov ? RGBA(255,255,255,24) : RGBA(255,255,255,10));
      strokeRound(gr, ctaX, ctaY, ctaW, ctaH, ctaH/2, 1, ctaHov ? COL.green : RGBA(255,255,255,30));
      tC(gr, 'View Artist', FONT.plSub, ctaHov ? COL.green : COL.text, ctaX, ctaY, ctaW, ctaH);

      HB_ALBUM_ARTISTS.push({
        x0:x0, y0:Math.max(scY, r.y), x1:x0+w, y1:Math.min(scY+cardH, cropY),
        artist:sArt.name, id:'spot_'+si
      });
      if(si===0) HB_ALBUM_CTA={x0:x0, y0:Math.max(scY, r.y), x1:x0+w, y1:Math.min(scY+cardH, cropY), artist:sArt.name};
    }
    curY+=cardH+14;
  }
  curY+=20;

  // 7. Discography & Songs Shelves for All Artists
  var shelfArts=alb.artists||[{name:alb.artist, otherAlbums:alb.otherAlbums, otherTracks:[]}];
  for(var sai=0; sai<shelfArts.length; sai++){
    var shArt=shelfArts[sai];

    // Case A: Artist has other albums in the library
    if(shArt.otherAlbums && shArt.otherAlbums.length>0){
      var maxOthers=Math.min(5, shArt.otherAlbums.length);
      var headTxt='More by '+shArt.name;
      var headW=Math.min(w, Math.round(gr.CalcTextWidth(headTxt, FONT.sect))+12);
      var headHov=hv(x0, Math.max(curY, r.y), x0+headW, Math.min(curY+26, cropY));

      if(curY+26>r.y && curY<cropY){
        tL(gr, headTxt, FONT.sect, headHov ? COL.green : COL.text, x0, curY, headW, 24);
        HB_ALBUM_ARTISTS.push({
          x0:x0, y0:Math.max(curY, r.y), x1:x0+headW, y1:Math.min(curY+26, cropY),
          artist:shArt.name, id:'more_hdr_'+sai
        });
      }
      curY+=34;

      var oCardW=140, oGap=16, oCardH=oCardW+56;
      for(var oi=0; oi<maxOthers; oi++){
        var ocX=x0+oi*(oCardW+oGap);
        var ocY=curY;
        if(ocX+oCardW>x0+w) break;

        if(ocY+oCardH>r.y && ocY<cropY){
          var oAlb=shArt.otherAlbums[oi];
          if(!oAlb) continue;
          var oHov=hv(ocX-6, Math.max(ocY-6, r.y), ocX+oCardW+6, Math.min(ocY+oCardH+6, cropY));
          if(oHov) gr.FillRoundRect(ocX-6, ocY-6, oCardW+12, oCardH+12, 8, 8, COL.rowHover);

          drawRounded(gr, ocX, ocY, oCardW, 6, oAlb.handle, oAlb.name);

          var oPlayBox=null;
          if(oHov){
            var opb=38, opx=ocX+oCardW-opb-6, opy=ocY+oCardW-opb-6;
            gr.FillEllipse(opx, opy, opb, opb, COL.green);
            drawIcon(gr, 'play', COL.black, opx, opy, opb, opb, 18);
            oPlayBox={x0:opx, y0:opy, x1:opx+opb, y1:opy+opb};
          }

          tL(gr, oAlb.name, FONT.card, oHov ? COL.green : COL.text, ocX, ocY+oCardW+10, oCardW, 20);
          tL(gr, oAlb.year || 'Album', FONT.plSub, COL.text3, ocX, ocY+oCardW+32, oCardW, 16);

          HB_ALBUM_OTHER.push({
            x0:ocX-6,
            y0:Math.max(ocY-6, r.y),
            x1:ocX+oCardW+6,
            y1:Math.min(ocY+oCardH+6, cropY),
            album:oAlb,
            playBtn:oPlayBox
          });
        }
      }
      curY+=oCardH+30;
    }
    // Case B: No other full albums, but has other tracks in library
    else if(shArt.otherTracks && shArt.otherTracks.length>0){
      var sHeadTxt='More songs by '+shArt.name;
      var sHeadW=Math.min(w, Math.round(gr.CalcTextWidth(sHeadTxt, FONT.sect))+12);
      var sHeadHov=hv(x0, Math.max(curY, r.y), x0+sHeadW, Math.min(curY+26, cropY));

      if(curY+26>r.y && curY<cropY){
        tL(gr, sHeadTxt, FONT.sect, sHeadHov ? COL.green : COL.text, x0, curY, sHeadW, 24);
        HB_ALBUM_ARTISTS.push({
          x0:x0, y0:Math.max(curY, r.y), x1:x0+sHeadW, y1:Math.min(curY+26, cropY),
          artist:shArt.name, id:'more_songs_hdr_'+sai
        });
      }
      curY+=32;

      var srh=42;
      for(var oti=0; oti<shArt.otherTracks.length; oti++){
        var ot=shArt.otherTracks[oti];
        if(!ot) continue;
        var oty=curY+oti*srh;
        if(oty+srh<=r.y) continue;
        if(oty>=cropY) break;

        var otHov=hv(x0-4, Math.max(oty, r.y), x0+w+4, Math.min(oty+srh, cropY));
        if(otHov) gr.FillRoundRect(x0-4, oty, w+8, srh, 4, 4, COL.rowHover);

        if(otHov) drawIcon(gr, 'play', COL.text, x0, oty, 28, srh, 14);
        else tL(gr, String(oti+1), FONT.rowNum, COL.text2, x0, oty, 28, srh);

        var otTitleX=x0+38, otDurW=56;
        var otTitleW=w-38-otDurW-16;
        tL(gr, ot.title||'Unknown Track', FONT.rowTitle, otHov ? COL.green : COL.text, otTitleX, oty+4, otTitleW, 18);
        tL(gr, ot.album || shArt.name, FONT.plSub, COL.text3, otTitleX, oty+22, otTitleW, 16);
        tR(gr, ot.dur||'0:00', FONT.rowCell, COL.text2, x0+w-otDurW, oty, otDurW, srh);

        var ocy0=Math.max(oty, r.y), ocy1=Math.min(oty+srh, cropY);
        if(ocy1>ocy0){
          HB_TR.push({
            x0:x0-4, y0:ocy0, x1:x0+w+4, y1:ocy1,
            albumRow:true, idx:0, handles:(ot.handle ? [ot.handle] : []), pgx0:x0, pgx1:x0+28
          });
        }
      }
      curY+=shArt.otherTracks.length*srh+28;
    }
  }

  // 8. Release Footer (Copyright & Barcode)
  if(curY+20>r.y && curY<cropY){
    if(alb.year) tL(gr, 'Release Date: '+(alb.date||alb.year), FONT.meta, COL.text3, x0, curY, w, 18);
  }
  curY+=22;

  var cText=alb.copyright ? (chr(0xA9)+' '+alb.copyright+'   '+chr(0x2117)+' '+alb.copyright) : (chr(0xA9)+' '+alb.artist);
  if(curY+20>r.y && curY<cropY) tL(gr, cText, FONT.plSub, COL.text3, x0, curY, w, 18);
  curY+=26;

  var bHashStr = ('000000000' + Math.abs(hash(alb.name + (alb.artist||'')))).slice(-9);
  var codeToDraw = alb.barcode || alb.isrc || ('506' + bHashStr);
  if(curY+44>r.y && curY<cropY){
    drawBarcode(gr, x0, curY, 200, 44, codeToDraw, COL.text, COL.text2);
  }
  curY+=64;

  // 9. Sticky Column Header Pinning
  if(scroll>listTop-r.y){
    gr.FillSolidRect(r.x, r.y, r.w, 36, COL.base);
    tL(gr, '#', FONT.head, COL.text2, x0, r.y+8, numW, 20);
    tL(gr, 'TITLE', FONT.head, COL.text2, titleX, r.y+8, titleW, 20);
    drawIcon(gr, 'clock', COL.text2, durX+durW-18, r.y+8, 16, 20, 15);
    gr.FillSolidRect(x0, r.y+35, w, 1, COL.line);
  }

  // 10. Compute Max Scroll & Draggable Scrollbar
  var totalContentH=curY+scroll-r.y;
  var viewH=r.h;
  var maxPx=Math.max(0, totalContentH-viewH+20);
  ALBUM_MAXPX=maxPx;
  albumScroll=clampPx(albumScroll, maxPx);
  albumScrollT=clampPx(albumScrollT, maxPx);

  drawScrollbar(gr, x0+w+8, r.y, r.h, albumScroll, maxPx, r.h, totalContentH, hv(x0, r.y, x0+w+16, r.y+r.h)||drag==='scroll');
}
