/* verdant/views/artist_sync.js -- Dedicated Artist Cloud Sync & Media Manager view
   Allows users to monitor, start, stop, and configure offline-cached artist portraits,
   Deezer metadata, and Wikipedia summaries with live visual progress.
   Part of Verdant. Loaded by main.js. */

var artistSyncScroll=0, artistSyncScrollT=0, ARTIST_SYNC_MAXPX=0;
var syncProgress={ running:false, total:0, processed:0, downloaded:0, skipped:0, failed:0, percent:0, currentArtist:'', status:'Idle' };
var syncPollTimer=null;
var HB_SYNC_FETCH_MISSING=null, HB_SYNC_FETCH_ALL=null, HB_SYNC_STOP=null, HB_SYNC_OPEN_DIR=null, HB_SYNC_ROWS=[];

function startSyncProgressPoll(){
  if(syncPollTimer) return;
  syncPollTimer=window.SetInterval(function(){
    var cacheDir=fb.ProfilePath+'verdant\\cache\\artists\\';
    var progFile=cacheDir+'sync_progress.json';
    try{
      if(utils.FileTest && utils.FileTest(progFile, 'e')){
        var txt=utils.ReadTextFile(progFile, 65001);
        if(txt){
          var p=JSON.parse(txt);
          if(p){
            syncProgress=p;
            if(!p.running){
              stopSyncProgressPoll();
              loadArtistIndex(true);
              extArtistHeroCache={};
              extArtistImgCache={};
              extArtistCardCache={};
              artistMetaCache={};
            }
            if(view==='artist_sync') repaintMain();
          }
        }
      }
    }catch(e){}
  }, 250);
}

function stopSyncProgressPoll(){
  if(syncPollTimer){
    window.ClearInterval(syncPollTimer);
    syncPollTimer=null;
  }
}

function triggerArtistSync(mode, singleArtist){
  var cacheDir=fb.ProfilePath+'verdant\\cache\\artists\\';
  var scriptPath=fb.ProfilePath+'verdant\\tools\\sync_artists.ps1';
  var listFile=cacheDir+'all_artists.json';

  try{
    if(utils.CreateFolder) utils.CreateFolder(cacheDir);

    // Save current library artist list to JSON for the script
    var artistList=getArtistList();
    var names=[];
    for(var i=0; i<artistList.length; i++){
      if(artistList[i].name) names.push(artistList[i].name);
    }
    if(utils.WriteTextFile) utils.WriteTextFile(listFile, JSON.stringify(names));

    var sh=new ActiveXObject('WScript.Shell');
    var cmd='powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + scriptPath + '" -Mode "' + (mode||'missing') + '" -CacheDir "' + cacheDir.replace(/\\$/, '') + '" -ArtistListFile "' + listFile + '"';
    if(singleArtist){
      cmd='powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + scriptPath + '" -SingleArtist "' + singleArtist.replace(/"/g, '`"') + '" -CacheDir "' + cacheDir.replace(/\\$/, '') + '"';
    }
    sh.Run(cmd, 0, false);

    syncProgress.running=true;
    syncProgress.status='Initializing sync...';
    startSyncProgressPoll();
    repaintMain();
  }catch(e){}
}

function stopArtistSync(){
  var cacheDir=fb.ProfilePath+'verdant\\cache\\artists\\';
  var scriptPath=fb.ProfilePath+'verdant\\tools\\sync_artists.ps1';
  try{
    var sh=new ActiveXObject('WScript.Shell');
    var cmd='powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + scriptPath + '" -Stop -CacheDir "' + cacheDir.replace(/\\$/, '') + '"';
    sh.Run(cmd, 0, false);
    syncProgress.running=false;
    syncProgress.status='Stopping...';
    repaintMain();
  }catch(e){}
}

function openArtistCacheFolder(){
  var cacheDir=fb.ProfilePath+'verdant\\cache\\artists\\';
  try{
    var sh=new ActiveXObject('WScript.Shell');
    sh.Run('explorer.exe "' + cacheDir + '"', 1, false);
  }catch(e){}
}

function drawArtistSync(gr, r){
  HB_SYNC_FETCH_MISSING=null;
  HB_SYNC_FETCH_ALL=null;
  HB_SYNC_STOP=null;
  HB_SYNC_OPEN_DIR=null;
  HB_SYNC_ROWS=[];

  var pad=M.cpad, x0=r.x+pad, w=r.w-pad*2;
  var scroll=Math.round(artistSyncScroll);
  var cropY=r.y+r.h;

  var list=getArtistList();
  var totalArt=list.length;
  var index=loadArtistIndex();
  var cachedCount=0;
  for(var i=0; i<list.length; i++){
    var aName=list[i].name;
    var safe=aName.replace(/[\\/:*?"<>|]/g, '_');
    var hasJpg=false, hasMeta=false;
    var cDir=fb.ProfilePath+'verdant\\cache\\artists\\';
    try{ hasJpg=utils.FileTest && utils.FileTest(cDir+safe+'.jpg', 'e'); }catch(e){}
    try{ hasMeta=utils.FileTest && utils.FileTest(cDir+safe+'_meta.json', 'e'); }catch(e){}
    if(hasJpg || hasMeta) cachedCount++;
  }
  var missingCount=Math.max(0, totalArt-cachedCount);

  var curY=r.y+20-scroll;

  // Header Title & Description
  if(curY+60>r.y && curY<cropY){
    tL(gr, 'Artist Cloud Sync', FONT.sect2, COL.text, x0, curY, w, 32);
    tL(gr, 'Offline-first media manager for Deezer high-resolution imagery and Wikipedia summaries.', FONT.meta, COL.text2, x0, curY+34, w, 20);
  }
  curY+=68;

  // Metric Stats Cards (3 cards: Total, Cached, Missing)
  var cardGap=16, cardW=Math.floor((w-cardGap*2)/3), cardH=76;
  if(curY+cardH>r.y && curY<cropY){
    // Card 1: Total
    gr.FillRoundRect(x0, curY, cardW, cardH, 8, 8, RGB(26,26,26));
    strokeRound(gr, x0, curY, cardW, cardH, 8, 1, RGBA(255,255,255,16));
    tL(gr, 'LIBRARY ARTISTS', FONT.eyebrow, COL.text3, x0+14, curY+12, cardW-28, 16);
    tL(gr, String(totalArt), FONT.sect2, COL.white, x0+14, curY+30, cardW-28, 32);

    // Card 2: Cached
    var c2x=x0+cardW+cardGap;
    gr.FillRoundRect(c2x, curY, cardW, cardH, 8, 8, RGB(26,26,26));
    strokeRound(gr, c2x, curY, cardW, cardH, 8, 1, RGBA(255,255,255,16));
    tL(gr, 'OFFLINE CACHED', FONT.eyebrow, COL.text3, c2x+14, curY+12, cardW-28, 16);
    var pctTxt=totalArt>0 ? (' ('+Math.round((cachedCount/totalArt)*100)+'%)') : '';
    tL(gr, cachedCount+pctTxt, FONT.sect2, COL.green, c2x+14, curY+30, cardW-28, 32);

    // Card 3: Missing
    var c3x=c2x+cardW+cardGap;
    gr.FillRoundRect(c3x, curY, cardW, cardH, 8, 8, RGB(26,26,26));
    strokeRound(gr, c3x, curY, cardW, cardH, 8, 1, RGBA(255,255,255,16));
    tL(gr, 'PENDING / MISSING', FONT.eyebrow, COL.text3, c3x+14, curY+12, cardW-28, 16);
    tL(gr, String(missingCount), FONT.sect2, missingCount>0 ? RGB(255,180,60) : COL.text2, c3x+14, curY+30, cardW-28, 32);
  }
  curY+=cardH+20;

  // Primary Control Action Bar
  var btnH=38;
  if(curY+btnH>r.y && curY<cropY){
    var isRunning=!!syncProgress.running;

    // Button 1: Fetch Missing
    var b1W=170;
    var b1Hot=hv(x0, Math.max(curY, r.y), x0+b1W, Math.min(curY+btnH, cropY));
    gr.FillRoundRect(x0, curY, b1W, btnH, btnH/2, btnH/2, isRunning ? RGB(40,40,40) : (b1Hot ? RGB(45,230,115) : COL.green));
    tC(gr, 'Fetch Missing ('+missingCount+')', FONT.card, isRunning ? COL.text3 : COL.black, x0, curY, b1W, btnH);
    if(!isRunning) HB_SYNC_FETCH_MISSING={x0:x0, y0:Math.max(curY,r.y), x1:x0+b1W, y1:Math.min(curY+btnH,cropY)};

    // Button 2: Re-fetch All
    var b2X=x0+b1W+14, b2W=130;
    var b2Hot=hv(b2X, Math.max(curY, r.y), b2X+b2W, Math.min(curY+btnH, cropY));
    gr.FillRoundRect(b2X, curY, b2W, btnH, btnH/2, btnH/2, isRunning ? RGB(32,32,32) : (b2Hot ? RGBA(255,255,255,24) : RGBA(255,255,255,12)));
    strokeRound(gr, b2X, curY, b2W, btnH, btnH/2, 1, isRunning ? RGB(48,48,48) : (b2Hot ? COL.green : RGBA(255,255,255,28)));
    tC(gr, 'Refresh All', FONT.card, isRunning ? COL.text3 : (b2Hot ? COL.green : COL.text), b2X, curY, b2W, btnH);
    if(!isRunning) HB_SYNC_FETCH_ALL={x0:b2X, y0:Math.max(curY,r.y), x1:b2X+b2W, y1:Math.min(curY+btnH,cropY)};

    // Button 3: Stop Sync
    var b3X=b2X+b2W+14, b3W=104;
    var b3Hot=hv(b3X, Math.max(curY, r.y), b3X+b3W, Math.min(curY+btnH, cropY));
    gr.FillRoundRect(b3X, curY, b3W, btnH, btnH/2, btnH/2, isRunning ? (b3Hot ? RGB(230,60,60) : RGB(180,40,40)) : RGB(32,32,32));
    strokeRound(gr, b3X, curY, b3W, btnH, btnH/2, 1, isRunning ? RGB(255,80,80) : RGB(48,48,48));
    tC(gr, 'Stop Sync', FONT.card, isRunning ? COL.white : COL.text3, b3X, curY, b3W, btnH);
    if(isRunning) HB_SYNC_STOP={x0:b3X, y0:Math.max(curY,r.y), x1:b3X+b3W, y1:Math.min(curY+btnH,cropY)};

    // Button 4: Open Cache Folder
    var b4W=140, b4X=x0+w-b4W;
    var b4Hot=hv(b4X, Math.max(curY, r.y), b4X+b4W, Math.min(curY+btnH, cropY));
    gr.FillRoundRect(b4X, curY, b4W, btnH, btnH/2, btnH/2, b4Hot ? RGBA(255,255,255,24) : RGBA(255,255,255,10));
    strokeRound(gr, b4X, curY, b4W, btnH, btnH/2, 1, b4Hot ? COL.green : RGBA(255,255,255,24));
    tC(gr, 'Open Cache Folder', FONT.plSub, b4Hot ? COL.green : COL.text2, b4X, curY, b4W, btnH);
    HB_SYNC_OPEN_DIR={x0:b4X, y0:Math.max(curY,r.y), x1:b4X+b4W, y1:Math.min(curY+btnH,cropY)};
  }
  curY+=btnH+20;

  // Live Animated Progress Bar Card
  var pbCardH=68;
  if(curY+pbCardH>r.y && curY<cropY){
    gr.FillRoundRect(x0, curY, w, pbCardH, 8, 8, RGB(22,22,22));
    strokeRound(gr, x0, curY, w, pbCardH, 8, 1, RGBA(255,255,255,12));

    var pct=syncProgress.percent || 0;
    var pLabel=syncProgress.status || (syncProgress.running ? 'Syncing...' : 'Ready');
    if(syncProgress.currentArtist) pLabel+=' ('+syncProgress.currentArtist+')';

    tL(gr, pLabel, FONT.meta, COL.text, x0+16, curY+12, w-140, 18);
    tR(gr, pct+'% ('+(syncProgress.processed||cachedCount)+'/'+totalArt+')', FONT.meta, COL.green, x0+w-180, curY+12, 164, 18);

    // Progress Bar Track & Fill
    var pbx=x0+16, pby=curY+38, pbw=w-32, pbh=12;
    gr.FillRoundRect(pbx, pby, pbw, pbh, pbh/2, pbh/2, RGB(36,36,36));
    var fillW=Math.max(pbh, Math.round((pct/100)*pbw));
    if(pct>0){
      gr.FillRoundRect(pbx, pby, fillW, pbh, pbh/2, pbh/2, COL.green);
    }
  }
  curY+=pbCardH+28;

  // Table Header
  if(curY+24>r.y && curY<cropY){
    tL(gr, 'ARTIST', FONT.eyebrow, COL.text3, x0+48, curY, 230, 20);
    tL(gr, 'TRACKS', FONT.eyebrow, COL.text3, x0+290, curY, 70, 20);
    tL(gr, 'IMAGE SOURCE', FONT.eyebrow, COL.text3, x0+370, curY, 130, 20);
    tL(gr, 'LISTENERS', FONT.eyebrow, COL.text3, x0+510, curY, 130, 20);
    tL(gr, 'STATUS', FONT.eyebrow, COL.text3, x0+650, curY, 90, 20);
    tR(gr, 'ACTION', FONT.eyebrow, COL.text3, x0+w-100, curY, 80, 20);
    gr.FillSolidRect(x0, curY+22, w, 1, COL.line);
  }
  curY+=28;

  // Artists Rows
  var rowH=48;
  for(var ai=0; ai<list.length; ai++){
    var ary=curY+ai*rowH;
    if(ary+rowH<=r.y) continue;
    if(ary>=cropY) break;

    var artItem=list[ai];
    var aName=artItem.name;
    var safe=aName.replace(/[\\/:*?"<>|]/g, '_');
    var isHov=hv(x0-4, Math.max(ary, r.y), x0+w+4, Math.min(ary+rowH, cropY));

    if(isHov) gr.FillRoundRect(x0-4, ary, w+8, rowH, 6, 6, COL.rowHover);

    // 32px circular avatar thumbnail
    var avSz=32, avX=x0+6, avY=ary+Math.round((rowH-avSz)/2);
    drawCircle(gr, avX, avY, avSz, artItem.handle, aName);

    // Artist Name
    tL(gr, aName, FONT.card, isHov ? COL.green : COL.text, x0+48, ary+6, 230, 20);
    tL(gr, 'Artist', FONT.plSub, COL.text3, x0+48, ary+26, 230, 16);

    // Song Count (White number)
    var sCnt=String(artItem.count||1);
    var sCntW=Math.round(gr.CalcTextWidth(sCnt, FONT.meta));
    tL(gr, sCnt, FONT.meta, COL.white, x0+290, ary, sCntW, rowH);
    tL(gr, ' tracks', FONT.meta, COL.text2, x0+290+sCntW, ary, 70-sCntW, rowH);

    // Cache existence test
    var cDir=fb.ProfilePath+'verdant\\cache\\artists\\';
    var hasJpg=false, hasMeta=false;
    try{ hasJpg=utils.FileTest && utils.FileTest(cDir+safe+'.jpg', 'e'); }catch(e){}
    try{ hasMeta=utils.FileTest && utils.FileTest(cDir+safe+'_meta.json', 'e'); }catch(e){}

    // Image Source Indicator
    var mData=getArtistMeta(aName);
    var srcTxt='-';
    var srcCol=COL.text3;
    if(hasJpg){
      srcTxt=(mData && mData.imageSource) ? mData.imageSource : 'Deezer HD';
      srcCol=COL.green;
    } else if(artItem.handle){
      srcTxt='Local Track';
      srcCol=COL.text2;
    }
    tL(gr, srcTxt, FONT.meta, srcCol, x0+370, ary, 130, rowH);

    // Monthly Listeners
    var fanTxt=(mData && mData.fansFormatted) ? (mData.fansFormatted+' listeners') : '-';
    tL(gr, fanTxt, FONT.meta, (mData && mData.fansFormatted) ? COL.text : COL.text3, x0+510, ary, 130, rowH);

    // Status Pill (Clean LED dot, zero unknown unicode characters)
    var pillX=x0+650, pillW=86, pillH=22, pillY=ary+Math.round((rowH-pillH)/2);
    if(hasJpg && hasMeta){
      gr.FillRoundRect(pillX, pillY, pillW, pillH, 4, 4, RGBA(30,215,96,24));
      strokeRound(gr, pillX, pillY, pillW, pillH, 4, 1, RGBA(30,215,96,70));
      gr.FillEllipse(pillX+10, pillY+8, 6, 6, COL.green);
      tL(gr, 'Cached', FONT.eyebrow, COL.green, pillX+22, pillY, pillW-22, pillH);
    } else if(syncProgress.running && syncProgress.currentArtist===aName){
      gr.FillRoundRect(pillX, pillY, pillW, pillH, 4, 4, RGBA(255,200,60,24));
      strokeRound(gr, pillX, pillY, pillW, pillH, 4, 1, RGBA(255,200,60,70));
      gr.FillEllipse(pillX+10, pillY+8, 6, 6, RGB(255,200,60));
      tL(gr, 'Syncing', FONT.eyebrow, RGB(255,200,60), pillX+22, pillY, pillW-22, pillH);
    } else {
      gr.FillRoundRect(pillX, pillY, pillW, pillH, 4, 4, RGBA(255,255,255,8));
      strokeRound(gr, pillX, pillY, pillW, pillH, 4, 1, RGBA(255,255,255,16));
      gr.FillEllipse(pillX+10, pillY+8, 6, 6, COL.text3);
      tL(gr, 'Missing', FONT.eyebrow, COL.text3, pillX+22, pillY, pillW-22, pillH);
    }

    // Action button: [ Fetch ] or [ View ]
    var actW=68, actH=26, actX=x0+w-actW-10, actY=ary+Math.round((rowH-actH)/2);
    var actHot=hv(actX, Math.max(actY, r.y), actX+actW, Math.min(actY+actH, cropY));
    gr.FillRoundRect(actX, actY, actW, actH, 4, 4, actHot ? RGBA(255,255,255,20) : RGBA(255,255,255,8));
    strokeRound(gr, actX, actY, actW, actH, 4, 1, actHot ? COL.green : RGBA(255,255,255,22));
    tC(gr, (hasJpg&&hasMeta)?'View':'Fetch', FONT.plSub, actHot ? COL.green : COL.text2, actX, actY, actW, actH);

    var cy0=Math.max(ary, r.y), cy1=Math.min(ary+rowH, cropY);
    if(cy1>cy0){
      HB_SYNC_ROWS.push({
        x0:x0-4, y0:cy0, x1:x0+w+4, y1:cy1,
        artist:aName,
        fetchBtn:{x0:actX, y0:actY, x1:actX+actW, y1:actY+actH},
        isCached:(hasJpg&&hasMeta)
      });
    }
  }
  curY+=list.length*rowH+40;

  // Max Scroll & Scrollbar
  var totalContentH=curY+scroll-r.y;
  var viewH=r.h;
  var maxPx=Math.max(0, totalContentH-viewH+20);
  ARTIST_SYNC_MAXPX=maxPx;
  artistSyncScroll=clampPx(artistSyncScroll, maxPx);
  artistSyncScrollT=clampPx(artistSyncScrollT, maxPx);

  drawScrollbar(gr, x0+w+8, r.y, r.h, artistSyncScroll, maxPx, r.h, totalContentH, hv(x0, r.y, x0+w+16, r.y+r.h)||drag==='scroll');
}
