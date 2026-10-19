/* verdant/views/artist.js -- Spotify-grade Artist Profile view
   Featuring Deezer high-res imagery, verified artist badge, online fan stats,
   popular tracks top-10, latest release spotlight, discography shelves, bio card,
   and 60fps full-page continuous scrolling with sticky top bar.
   Part of Verdant, a Spotify-style theme for foobar2000. Loaded by main.js. */

var HB_ARTIST_PLAY=null, HB_ARTIST_SHUFFLE=null, HB_ARTIST_FOLLOW=null, HB_ARTIST_SEE_MORE=null;
var HB_ARTIST_LATEST=null, HB_ARTIST_ALBUMS=[], HB_ARTIST_SINGLES=[], HB_ARTIST_APPEARS=[];
var artistFollowingMap={};

function wrapText(gr, str, font, maxW, maxLines){
  if(!str) return [];
  var words=String(str).split(/\s+/);
  var lines=[], curLine='';
  for(var i=0; i<words.length; i++){
    var testLine=curLine ? (curLine+' '+words[i]) : words[i];
    if(gr.CalcTextWidth(testLine, font) > maxW && curLine){
      lines.push(curLine);
      curLine=words[i];
      if(maxLines && lines.length>=maxLines-1) break;
    } else {
      curLine=testLine;
    }
  }
  if(curLine && (!maxLines || lines.length<maxLines)){
    lines.push(curLine);
  }
  return lines;
}

function drawArtist(gr, r){
  HB_TR=[];
  HB_ARTIST_PLAY=null;
  HB_ARTIST_SHUFFLE=null;
  HB_ARTIST_FOLLOW=null;
  HB_ARTIST_SEE_MORE=null;
  HB_ARTIST_LATEST=null;
  HB_ARTIST_ALBUMS=[];
  HB_ARTIST_SINGLES=[];
  HB_ARTIST_APPEARS=[];

  if(!viewArtist){
    tC(gr, 'No artist selected', FONT.sect, COL.text2, r.x, r.y+Math.round(r.h/2)-20, r.w, 24);
    return;
  }

  var pad=M.cpad, x0=r.x+pad, w=r.w-pad*2;
  var scroll=Math.round(artistScroll);
  var cropY=r.y+r.h;

  // Retrieve artist online metadata and first handle for fallback artwork
  var meta=getArtistMeta(viewArtist);
  var heroImg=getArtistHeroImg(viewArtist);
  var firstHandle=(artistAlbums.length && artistAlbums[0].handle) ? artistAlbums[0].handle : null;

  // Collect all artist handles for play/shuffle buttons
  var allArtistHandles=[];
  for(var ai=0; ai<artistAlbums.length; ai++){
    for(var ti=0; ti<artistAlbums[ai].tracks.length; ti++){
      allArtistHandles.push(artistAlbums[ai].tracks[ti].handle);
    }
  }
  for(var si=0; si<artistSingles.length; si++){
    for(var sti=0; sti<artistSingles[si].tracks.length; sti++){
      allArtistHandles.push(artistSingles[si].tracks[sti].handle);
    }
  }

  // 1. Dynamic Ambient Tinted Gradient (Anchored to view top, just like album view)
  var gradH=Math.max(380, Math.min(500, Math.round(r.h*0.65)));
  gr.FillGradRect(r.x, r.y, r.w, gradH, 90, blend(artHue(firstHandle, viewArtist), COL.base, 0.42), COL.base, 1.0);

  // 2. Hero Section: Enlarged Artist Portrait Card (240x240) & Rich Metadata (Matching Album view)
  var artSz=240;
  var ax=x0, ay=r.y+24-scroll;

  if(ay+artSz>r.y && ay<cropY){
    // Ambient drop shadow behind artist portrait card
    gr.FillRoundRect(ax+4, ay+6, artSz, artSz, 10, 10, RGBA(0,0,0,160));
    drawArtistCard(gr, ax, ay, artSz, 8, firstHandle, viewArtist);
    strokeRound(gr, ax, ay, artSz, artSz, 8, 1, RGBA(255,255,255,24));
  }

  // Right Column: Eyebrow, White Title, Description, and Stats with Pure White Numbers
  var tx=ax+artSz+28, tw=r.x+r.w-pad-tx;
  var ty=ay+6;

  // Eyebrow: Verified Artist Badge
  var vbW=126, vbH=24;
  if(ty+vbH>r.y && ty<cropY){
    gr.FillRoundRect(tx, ty, vbW, vbH, vbH/2, vbH/2, RGBA(41,128,255,180));
    strokeRound(gr, tx, ty, vbW, vbH, vbH/2, 1, RGBA(255,255,255,60));
    drawIcon(gr, 'badge', COL.white, tx+6, ty, 18, vbH, 14);
    tL(gr, 'Verified Artist', FONT.eyebrow, COL.white, tx+26, ty, vbW-28, vbH);
  }
  ty+=vbH+12;

  // Artist Title (User requested: "make the artist name white")
  var nameFont=(viewArtist.length>22 ? FONT.sect2 : FONT.title);
  var nameH=(viewArtist.length>22 ? 40 : 64);
  if(ty+nameH>r.y && ty<cropY){
    tL(gr, viewArtist, nameFont, COL.white, tx, ty, tw, nameH);
  }
  ty+=nameH+10;

  // Wikipedia Short Description / Bio teaser (if available)
  if(meta && meta.desc){
    if(ty+20>r.y && ty<cropY){
      tL(gr, meta.desc, FONT.pl, COL.text2, tx, ty, tw, 20);
    }
    ty+=26;
  }

  // Monthly Listeners & Library Stats (User requested: "library artist number should be white")
  var totalAlbs=artistAlbums.length+artistSingles.length;
  if(ty+22>r.y && ty<cropY){
    var curStatX=tx;
    if(meta && meta.fansFormatted){
      var fVal=meta.fansFormatted;
      var fValW=Math.round(gr.CalcTextWidth(fVal, FONT.meta));
      tL(gr, fVal, FONT.meta, COL.white, curStatX, ty, fValW, 22);
      curStatX+=fValW;

      var fLbl=' monthly listeners '+CH_DOT+' ';
      var fLblW=Math.round(gr.CalcTextWidth(fLbl, FONT.meta));
      tL(gr, fLbl, FONT.meta, COL.text2, curStatX, ty, fLblW, 22);
      curStatX+=fLblW;
    }

    var rVal=String(totalAlbs);
    var rValW=Math.round(gr.CalcTextWidth(rVal, FONT.meta));
    tL(gr, rVal, FONT.meta, COL.white, curStatX, ty, rValW, 22);
    curStatX+=rValW;

    var rLbl=' release'+(totalAlbs===1?'':'s')+' '+CH_DOT+' ';
    var rLblW=Math.round(gr.CalcTextWidth(rLbl, FONT.meta));
    tL(gr, rLbl, FONT.meta, COL.text2, curStatX, ty, rLblW, 22);
    curStatX+=rLblW;

    var sVal=String(artistTotalSongs);
    var sValW=Math.round(gr.CalcTextWidth(sVal, FONT.meta));
    tL(gr, sVal, FONT.meta, COL.white, curStatX, ty, sValW, 22);
    curStatX+=sValW;

    var sLbl=' songs in your library';
    var sLblW=Math.round(gr.CalcTextWidth(sLbl, FONT.meta));
    tL(gr, sLbl, FONT.meta, COL.text2, curStatX, ty, sLblW, 22);
  }

  // 3. Action Controls Bar: Big Play Button (56px) + Shuffle (38px) + Following (34px)
  var playRowY=ay+artSz+24;
  var pb=56;
  var pbHot=hv(x0, Math.max(playRowY, r.y), x0+pb, Math.min(playRowY+pb, cropY));
  if(playRowY+pb>r.y && playRowY<cropY){
    gr.FillEllipse(x0, playRowY, pb, pb, pbHot ? RGB(45,230,115) : COL.green);
    drawIcon(gr, 'play', COL.black, x0, playRowY, pb, pb, 24);
    HB_ARTIST_PLAY={x0:x0, y0:Math.max(playRowY, r.y), x1:x0+pb, y1:Math.min(playRowY+pb, cropY), handles:allArtistHandles};
  }

  // Shuffle Button
  var shufX=x0+pb+18, shufSz=38, shufY=playRowY+Math.round((pb-shufSz)/2);
  var shufHot=hv(shufX, Math.max(shufY, r.y), shufX+shufSz, Math.min(shufY+shufSz, cropY));
  if(shufY+shufSz>r.y && shufY<cropY){
    gr.FillEllipse(shufX, shufY, shufSz, shufSz, shufHot ? RGBA(255,255,255,24) : RGBA(255,255,255,12));
    strokeRound(gr, shufX, shufY, shufSz, shufSz, shufSz/2, 1, shufHot ? COL.green : RGBA(255,255,255,28));
    drawIcon(gr, 'shuffle', shufHot ? COL.green : COL.text2, shufX, shufY, shufSz, shufSz, 18);
    HB_ARTIST_SHUFFLE={x0:shufX, y0:Math.max(shufY, r.y), x1:shufX+shufSz, y1:Math.min(shufY+shufSz, cropY), handles:allArtistHandles};
  }

  // Follow Capsule Button
  var folX=shufX+shufSz+18, folW=104, folH=34, folY=playRowY+Math.round((pb-folH)/2);
  var isFollowing=!!artistFollowingMap[viewArtist];
  var folHot=hv(folX, Math.max(folY, r.y), folX+folW, Math.min(folY+folH, cropY));
  if(folY+folH>r.y && folY<cropY){
    gr.FillRoundRect(folX, folY, folW, folH, folH/2, folH/2, folHot ? RGBA(255,255,255,24) : RGBA(255,255,255,10));
    strokeRound(gr, folX, folY, folW, folH, folH/2, 1, folHot ? COL.green : RGBA(255,255,255,30));
    tC(gr, isFollowing ? 'Following' : 'Follow', FONT.plSub, folHot ? COL.green : COL.text, folX, folY, folW, folH);
    HB_ARTIST_FOLLOW={x0:folX, y0:Math.max(folY, r.y), x1:folX+folW, y1:Math.min(folY+folH, cropY), artist:viewArtist};
  }

  var curY=playRowY+pb+32;

  // 3. Popular Tracks Section
  if(artistPopularTracks && artistPopularTracks.length>0){
    if(curY+24>r.y && curY<cropY){
      tL(gr, 'Popular', FONT.sect, COL.text, x0, curY, w, 24);
    }
    curY+=32;

    var popCount=artistPopularExpanded ? Math.min(10, artistPopularTracks.length) : Math.min(5, artistPopularTracks.length);
    var prh=52;
    var numW=32, thumbSz=40, durW=56;
    var titleX=x0+numW+thumbSz+16;
    var titleW=w-(numW+thumbSz+16)-durW-16;

    for(var pi=0; pi<popCount; pi++){
      var pry=curY+pi*prh;
      if(pry+prh<=r.y) continue;
      if(pry>=cropY) break;

      var ptrk=artistPopularTracks[pi];
      var isPlaying=!!(NP && ptrk.handle && NP.Path===ptrk.handle.Path);
      var isHov=hv(x0-6, Math.max(pry, r.y), x0+w+6, Math.min(pry+prh, cropY));

      if(isHov) gr.FillRoundRect(x0-6, pry, w+12, prh, 4, 4, COL.rowHover);

      // Rank Number / Equalizer / Hover Play
      if(isHov) drawIcon(gr, 'play', COL.text, x0, pry, numW, prh, 14);
      else if(isPlaying) drawIcon(gr, 'equalizer', COL.green, x0, pry, numW, prh, 14);
      else tL(gr, String(pi+1), FONT.rowNum, COL.text2, x0, pry, numW, prh);

      // 40x40 Thumbnail Album Art
      var thX=x0+numW+6, thY=pry+Math.round((prh-thumbSz)/2);
      drawRounded(gr, thX, thY, thumbSz, 4, ptrk.handle, ptrk.album);

      // Track Title & Collaborating Artist Subtitle
      if(ptrk.artist && ptrk.artist!==viewArtist){
        tL(gr, ptrk.title, FONT.rowTitle, isPlaying ? COL.green : COL.text, titleX, pry+6, titleW, 20);
        tL(gr, ptrk.artist, FONT.plSub, COL.text3, titleX, pry+27, titleW, 16);
      } else {
        tL(gr, ptrk.title, FONT.rowTitle, isPlaying ? COL.green : COL.text, titleX, pry, titleW, prh);
      }

      // Duration
      tR(gr, ptrk.dur, FONT.rowCell, isPlaying ? COL.green : COL.text2, x0+w-durW, pry, durW, prh);

      var pcy0=Math.max(pry, r.y), pcy1=Math.min(pry+prh, cropY);
      if(pcy1>pcy0){
        HB_TR.push({
          x0:x0-6, y0:pcy0, x1:x0+w+6, y1:pcy1,
          albumRow:true, idx:0, handles:[ptrk.handle], pgx0:x0, pgx1:x0+numW
        });
      }
    }
    curY+=popCount*prh+12;

    // "See more" / "Show less" toggle button if more than 5 tracks exist
    if(artistPopularTracks.length>5){
      var smW=96, smH=26;
      var smHot=hv(x0, Math.max(curY, r.y), x0+smW, Math.min(curY+smH, cropY));
      if(curY+smH>r.y && curY<cropY){
        tL(gr, artistPopularExpanded ? 'Show less' : 'See more', FONT.plSub, smHot ? COL.green : COL.text2, x0, curY, smW, smH);
        HB_ARTIST_SEE_MORE={x0:x0, y0:Math.max(curY, r.y), x1:x0+smW, y1:Math.min(curY+smH, cropY)};
      }
      curY+=smH+28;
    } else {
      curY+=20;
    }
  }

  // 4. Latest Release Spotlight Card
  if(artistLatestRelease){
    if(curY+24>r.y && curY<cropY){
      tL(gr, 'Latest Release', FONT.sect, COL.text, x0, curY, w, 24);
    }
    curY+=32;

    var lCardH=112;
    var lcY=curY;
    if(lcY+lCardH>r.y && lcY<cropY){
      var lcHov=hv(x0, Math.max(lcY, r.y), x0+w, Math.min(lcY+lCardH, cropY));
      gr.FillRoundRect(x0, lcY, w, lCardH, 10, 10, lcHov ? RGB(32,32,32) : RGB(24,24,24));
      strokeRound(gr, x0, lcY, w, lCardH, 10, 1, lcHov ? RGBA(255,255,255,28) : RGBA(255,255,255,14));

      // 96x96 cover art
      var lArtSz=88;
      var lax=x0+12, lay=lcY+12;
      drawRounded(gr, lax, lay, lArtSz, 6, artistLatestRelease.handle, artistLatestRelease.album);

      // Hover Play Button on Artwork
      if(lcHov){
        var lpb=36, lpx=lax+lArtSz-lpb-6, lpy=lay+lArtSz-lpb-6;
        gr.FillEllipse(lpx, lpy, lpb, lpb, COL.green);
        drawIcon(gr, 'play', COL.black, lpx, lpy, lpb, lpb, 18);
      }

      // Title & metadata
      var ltx=lax+lArtSz+20;
      var ltw=w-lArtSz-40;
      tL(gr, 'LATEST RELEASE', FONT.eyebrow, COL.text3, ltx, lcY+16, ltw, 16);
      tL(gr, artistLatestRelease.album, FONT.sect, lcHov ? COL.green : COL.text, ltx, lcY+36, ltw, 26);
      var lsubText=(artistLatestRelease.year ? (artistLatestRelease.year+' '+CH_DOT+' ') : '') +
                   (artistLatestRelease.tracks.length>3 ? 'Album' : 'Single/EP') + ' '+CH_DOT+' ' +
                   artistLatestRelease.tracks.length+' song'+(artistLatestRelease.tracks.length===1?'':'s');
      tL(gr, lsubText, FONT.plSub, COL.text2, ltx, lcY+66, ltw, 20);

      HB_ARTIST_LATEST={
        x0:x0, y0:Math.max(lcY, r.y), x1:x0+w, y1:Math.min(lcY+lCardH, cropY),
        album:artistLatestRelease
      };
    }
    curY+=lCardH+36;
  }

  // 5. Discography: Albums Shelf
  if(artistAlbums && artistAlbums.length>0){
    if(curY+24>r.y && curY<cropY){
      tL(gr, 'Albums', FONT.sect, COL.text, x0, curY, w, 24);
    }
    curY+=32;

    var aCardW=140, aGap=16, aCardH=aCardW+56;
    var maxAlbs=Math.min(6, artistAlbums.length);
    for(var ai=0; ai<maxAlbs; ai++){
      var acX=x0+ai*(aCardW+aGap);
      var acY=curY;
      if(acX+aCardW>x0+w) break;

      if(acY+aCardH>r.y && acY<cropY){
        var albObj=artistAlbums[ai];
        var aHov=hv(acX-6, Math.max(acY-6, r.y), acX+aCardW+6, Math.min(acY+aCardH+6, cropY));
        if(aHov) gr.FillRoundRect(acX-6, acY-6, aCardW+12, aCardH+12, 8, 8, COL.rowHover);

        drawRounded(gr, acX, acY, aCardW, 6, albObj.handle, albObj.album);

        var aPlayBox=null;
        if(aHov){
          var apb=38, apx=acX+aCardW-apb-6, apy=acY+aCardW-apb-6;
          gr.FillEllipse(apx, apy, apb, apb, COL.green);
          drawIcon(gr, 'play', COL.black, apx, apy, apb, apb, 18);
          aPlayBox={x0:apx, y0:apy, x1:apx+apb, y1:apy+apb};
        }

        tL(gr, albObj.album, FONT.card, aHov ? COL.green : COL.text, acX, acY+aCardW+10, aCardW, 20);
        tL(gr, albObj.year || 'Album', FONT.plSub, COL.text3, acX, acY+aCardW+32, aCardW, 16);

        HB_ARTIST_ALBUMS.push({
          x0:acX-6, y0:Math.max(acY-6, r.y), x1:acX+aCardW+6, y1:Math.min(acY+aCardH+6, cropY),
          album:albObj, playBtn:aPlayBox
        });
      }
    }
    curY+=aCardH+36;
  }

  // 6. Discography: Singles & EPs Shelf
  if(artistSingles && artistSingles.length>0){
    if(curY+24>r.y && curY<cropY){
      tL(gr, 'Singles and EPs', FONT.sect, COL.text, x0, curY, w, 24);
    }
    curY+=32;

    var sCardW=140, sGap=16, sCardH=sCardW+56;
    var maxSingles=Math.min(6, artistSingles.length);
    for(var si=0; si<maxSingles; si++){
      var scX=x0+si*(sCardW+sGap);
      var scY=curY;
      if(scX+sCardW>x0+w) break;

      if(scY+sCardH>r.y && scY<cropY){
        var sObj=artistSingles[si];
        var sHov=hv(scX-6, Math.max(scY-6, r.y), scX+sCardW+6, Math.min(scY+sCardH+6, cropY));
        if(sHov) gr.FillRoundRect(scX-6, scY-6, sCardW+12, sCardH+12, 8, 8, COL.rowHover);

        drawRounded(gr, scX, scY, sCardW, 6, sObj.handle, sObj.album);

        var sPlayBox=null;
        if(sHov){
          var spb=38, spx=scX+sCardW-spb-6, spy=scY+sCardW-spb-6;
          gr.FillEllipse(spx, spy, spb, spb, COL.green);
          drawIcon(gr, 'play', COL.black, spx, spy, spb, spb, 18);
          sPlayBox={x0:spx, y0:spy, x1:spx+spb, y1:spy+spb};
        }

        tL(gr, sObj.album, FONT.card, sHov ? COL.green : COL.text, scX, scY+sCardW+10, sCardW, 20);
        tL(gr, sObj.year || 'Single', FONT.plSub, COL.text3, scX, scY+sCardW+32, sCardW, 16);

        HB_ARTIST_SINGLES.push({
          x0:scX-6, y0:Math.max(scY-6, r.y), x1:scX+sCardW+6, y1:Math.min(scY+sCardH+6, cropY),
          album:sObj, playBtn:sPlayBox
        });
      }
    }
    curY+=sCardH+36;
  }

  // 7. Appears On (Collaborations & Compilations)
  if(artistAppearsOn && artistAppearsOn.length>0){
    if(curY+24>r.y && curY<cropY){
      tL(gr, 'Appears On', FONT.sect, COL.text, x0, curY, w, 24);
    }
    curY+=32;

    var apCardW=140, apGap=16, apCardH=apCardW+56;
    for(var api=0; api<artistAppearsOn.length; api++){
      var apcX=x0+api*(apCardW+apGap);
      var apcY=curY;
      if(apcX+apCardW>x0+w) break;

      if(apcY+apCardH>r.y && apcY<cropY){
        var apAlb=artistAppearsOn[api];
        var apHov=hv(apcX-6, Math.max(apcY-6, r.y), apcX+apCardW+6, Math.min(apcY+apCardH+6, cropY));
        if(apHov) gr.FillRoundRect(apcX-6, apcY-6, apCardW+12, apCardH+12, 8, 8, COL.rowHover);

        drawRounded(gr, apcX, apcY, apCardW, 6, apAlb.handle, apAlb.name);

        tL(gr, apAlb.name, FONT.card, apHov ? COL.green : COL.text, apcX, apcY+apCardW+10, apCardW, 20);
        tL(gr, apAlb.artist || 'Compilation', FONT.plSub, COL.text3, apcX, apcY+apCardW+32, apCardW, 16);

        HB_ARTIST_APPEARS.push({
          x0:apcX-6, y0:Math.max(apcY-6, r.y), x1:apcX+apCardW+6, y1:Math.min(apcY+apCardH+6, cropY),
          album:apAlb
        });
      }
    }
    curY+=apCardH+36;
  }

  // 8. About Section: Artist Portrait & Biography Card
  if(curY+24>r.y && curY<cropY){
    tL(gr, 'About', FONT.sect, COL.text, x0, curY, w, 24);
  }
  curY+=32;

  var bioH=180;
  var bioY=curY;
  if(bioY+bioH>r.y && bioY<cropY){
    gr.FillRoundRect(x0, bioY, w, bioH, 12, 12, RGB(24,24,24));
    strokeRound(gr, x0, bioY, w, bioH, 12, 1, RGBA(255,255,255,14));

    // Circular portrait
    var bArtSz=130;
    var bax=x0+24, bay=bioY+Math.round((bioH-bArtSz)/2);
    drawCircle(gr, bax, bay, bArtSz, firstHandle, viewArtist);

    // Bio text content
    var btx=bax+bArtSz+24;
    var btw=w-bArtSz-72;

    var monthlyTxt=(meta && meta.fansFormatted) ? (meta.fansFormatted+' monthly listeners') : (artistTotalSongs+' tracks in your library');
    tL(gr, monthlyTxt, FONT.sect, COL.white, btx, bioY+20, btw, 24);

    var bioContent=(meta && meta.bio) ? meta.bio : (
      (meta && meta.desc) ? (viewArtist+' is a '+meta.desc+'.') :
      (viewArtist+' is featured in your music library with '+totalAlbs+' releases and '+artistTotalSongs+' tracks.')
    );
    // Draw bio text wrapped across up to 4 lines
    var lines=wrapText(gr, bioContent, FONT.pl, btw, 4);
    for(var li=0; li<lines.length; li++){
      tL(gr, lines[li], FONT.pl, COL.text2, btx, bioY+54+li*22, btw, 22);
    }

    tL(gr, 'Verified profile via Deezer & Wikipedia', FONT.eyebrow, COL.text3, btx, bioY+bioH-30, btw, 16);
  }
  curY+=bioH+64;

  // 9. Sticky Header Bar (Pins to top when scrolled past hero)
  if(scroll>230){
    gr.FillSolidRect(r.x, r.y, r.w, 52, COL.base);
    gr.FillSolidRect(r.x, r.y+51, r.w, 1, COL.line);

    // 32px circular avatar
    var savSz=32;
    drawCircle(gr, x0, r.y+10, savSz, firstHandle, viewArtist);

    // Sticky Play Button (36px)
    var spbSz=36, spbX=x0+savSz+14, spbY=r.y+8;
    var spbHot=hv(spbX, r.y+4, spbX+spbSz, r.y+4+spbSz);
    gr.FillEllipse(spbX, spbY, spbSz, spbSz, spbHot ? RGB(45,230,115) : COL.green);
    drawIcon(gr, 'play', COL.black, spbX, spbY, spbSz, spbSz, 16);
    HB_ARTIST_PLAY={x0:spbX, y0:r.y+4, x1:spbX+spbSz, y1:r.y+4+spbSz, handles:allArtistHandles};

    // Artist Name (Pure White)
    tL(gr, viewArtist, FONT.sect, COL.white, spbX+spbSz+14, r.y+12, w-spbX-spbSz, 28);
  }

  // 10. Max Scroll Calculation & Custom Scrollbar
  var totalContentH=curY+scroll-r.y;
  var viewH=r.h;
  var maxPx=Math.max(0, totalContentH-viewH+20);
  ARTIST_MAXPX=maxPx;
  artistScroll=clampPx(artistScroll, maxPx);
  artistScrollT=clampPx(artistScrollT, maxPx);

  drawScrollbar(gr, x0+w+8, r.y, r.h, artistScroll, maxPx, r.h, totalContentH, hv(x0, r.y, x0+w+16, r.y+r.h)||drag==='scroll');
}
