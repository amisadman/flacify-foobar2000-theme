/* flacify/data/history.js -- Listening History ("Recently Played") manager
   Tracks playback events and persists played songs to cache/history.json. */

var HISTORY_FILE = fb.ProfilePath + 'flacify\\cache\\history.json';
var historyList = [];
var historyTrackLogged = false;
var historyActivePath = '';
var historyLoaded = false;

function loadHistory(){
  historyList = [];
  try {
    if(utils.FileTest && utils.FileTest(HISTORY_FILE, 'e')){
      var txt = utils.ReadTextFile(HISTORY_FILE, 65001);
      if(txt){
        var arr = JSON.parse(txt);
        if(arr && arr.length) historyList = arr;
      }
    }
  } catch(e){}
  historyLoaded = true;
}

function saveHistory(){
  try {
    var cacheDir = fb.ProfilePath + 'flacify\\cache';
    if(utils.CreateFolder) utils.CreateFolder(cacheDir);
    if(utils.WriteTextFile){
      var slice = [];
      for(var i=0; i<Math.min(1000, historyList.length); i++){
        var item = historyList[i];
        slice.push({
          path: item.path,
          title: item.title,
          artist: item.artist,
          album: item.album,
          dur: item.dur,
          time: item.time,
          codec: item.codec || '',
          bitdepth: item.bitdepth || 0,
          samplerate: item.samplerate || 0,
          dr: item.dr || 0
        });
      }
      utils.WriteTextFile(HISTORY_FILE, JSON.stringify(slice));
      // Also persist to analytics cache
      var analyticsPath = fb.ProfilePath + 'flacify\\cache\\analytics.json';
      utils.WriteTextFile(analyticsPath, JSON.stringify(slice));
    }
  } catch(e){}
}

function historyOnNewTrack(metadb){
  historyTrackLogged = false;
  historyActivePath = metadb ? metadb.Path : '';
}

function historyOnTime(sec, metadb){
  if(historyTrackLogged || !metadb || !historyActivePath) return;
  if(metadb.Path !== historyActivePath) return;

  var len = fb.PlaybackLength;
  var thresh = (len > 0) ? Math.min(30, Math.round(len * 0.5)) : 30;

  if(sec >= thresh){
    historyTrackLogged = true;
    logHistoryTrack(metadb);
  }
}

function logHistoryTrack(metadb){
  if(!metadb) return;
  if(!historyLoaded) loadHistory();

  var p = metadb.Path;
  if(!p) return;

  var title = TF.title.EvalWithMetadb(metadb) || 'Unknown Title';
  var artist = TF.artist.EvalWithMetadb(metadb) || 'Unknown Artist';
  var album = TF.album.EvalWithMetadb(metadb) || '';
  var dur = TF.len.EvalWithMetadb(metadb) || '';
  var now = Date.now();

  var codec = TF.codec ? (TF.codec.EvalWithMetadb(metadb) || '') : '';
  var bitdepth = TF.bitdepth ? (parseInt(TF.bitdepth.EvalWithMetadb(metadb), 10) || 0) : 0;
  var samplerate = TF.samplerate ? (parseInt(TF.samplerate.EvalWithMetadb(metadb), 10) || 0) : 0;
  var dr = 0;
  if(typeof getDynamicRange === 'function'){
    var drInfo = getDynamicRange(metadb);
    if(drInfo && drInfo.dr) dr = drInfo.dr;
  }

  // Avoid logging duplicate identical track if played within last 3 minutes
  if(historyList.length > 0){
    var first = historyList[0];
    if(first && first.path === p && (now - first.time) < 180000){
      first.time = now;
      first.handle = metadb;
      if(codec) first.codec = codec;
      if(bitdepth) first.bitdepth = bitdepth;
      if(samplerate) first.samplerate = samplerate;
      if(dr) first.dr = dr;
      saveHistory();
      return;
    }
  }

  historyList.unshift({
    path: p,
    title: title,
    artist: artist,
    album: album,
    dur: dur,
    time: now,
    codec: codec,
    bitdepth: bitdepth,
    samplerate: samplerate,
    dr: dr,
    handle: metadb
  });

  if(historyList.length > 1000) historyList.length = 1000;
  saveHistory();

  if(view === 'home' || view === 'history' || view === 'analytics') repaintMain();
}

function getHistoryList(){
  if(!historyLoaded) loadHistory();
  return historyList;
}

function clearHistory(){
  historyList = [];
  saveHistory();
  if(view === 'home' || view === 'history') repaintMain();
}

function getRecentlyPlayedDistinct(limit){
  if(!historyLoaded) loadHistory();
  limit = limit || 12;
  var seen = {};
  var out = [];
  for(var i = 0; i < historyList.length && out.length < limit; i++){
    var it = historyList[i];
    var key = (it.album && it.artist) ? (it.album + ' - ' + it.artist) : it.path;
    if(!seen[key]){
      seen[key] = true;
      if(!it.handle && typeof getHandleByPath === 'function') it.handle = getHandleByPath(it.path);
      out.push(it);
    }
  }
  return out;
}

function fmtRelativeTime(ts){
  if(!ts) return '';
  var diff = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if(diff < 60) return 'Just now';
  var mins = Math.floor(diff / 60);
  if(mins < 60) return mins + 'm ago';
  var hours = Math.floor(mins / 60);
  if(hours < 24) return hours + 'h ago';
  var days = Math.floor(hours / 24);
  if(days === 1) return 'Yesterday';
  if(days < 7) return days + 'd ago';
  var d = new Date(ts);
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months[d.getMonth()] + ' ' + d.getDate();
}

/* ------------------------- FLACify Listening Analytics ------------------------- */
var analyticsSummaryCache = null;
var analyticsCacheTime = 0;

function getAnalyticsSummary(forceRefresh){
  if(!forceRefresh && analyticsSummaryCache && (Date.now() - analyticsCacheTime < 10000)){
    return analyticsSummaryCache;
  }
  if(!historyLoaded) loadHistory();

  var list = historyList;
  var totalTracks = list.length;
  var totalSeconds = 0;
  var artistMap = {};
  var albumMap = {};
  var hiresCount = 0;
  var cdCount = 0;
  var lossyCount = 0;
  var drSum = 0;
  var drCount = 0;

  var dayMap = {};
  var now = new Date();
  var todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  var oneDayMs = 86400000;

  for(var i = 0; i < list.length; i++){
    var it = list[i];
    var secs = 180;
    if(it.dur){
      var parts = it.dur.split(':');
      if(parts.length === 2){
        secs = (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
      } else if(parts.length === 3){
        secs = (parseInt(parts[0], 10) || 0) * 3600 + (parseInt(parts[1], 10) || 0) * 60 + (parseInt(parts[2], 10) || 0);
      }
    }
    totalSeconds += secs;

    // Split multi-artist tracks into individual artists
    var rawArt = it.artist || 'Unknown Artist';
    var arts = (typeof splitArtists === 'function') ? splitArtists(rawArt) : [rawArt];
    if(!arts || !arts.length) arts = [rawArt];
    for(var ai = 0; ai < arts.length; ai++){
      var art = (arts[ai] || '').trim();
      if(!art) continue;
      if(!artistMap[art]) artistMap[art] = { name: art, plays: 0, seconds: 0, topTrack: it.title, handle: it.handle };
      artistMap[art].plays++;
      artistMap[art].seconds += secs;
      if(!artistMap[art].handle && it.handle) artistMap[art].handle = it.handle;
    }

    var alb = it.album || 'Unknown Album';
    var aKey = alb + ' -- ' + rawArt;
    if(!albumMap[aKey]) albumMap[aKey] = { title: alb, artist: rawArt, plays: 0, handle: it.handle };
    albumMap[aKey].plays++;
    if(!albumMap[aKey].handle && it.handle) albumMap[aKey].handle = it.handle;

    var c = (it.codec || '').toUpperCase();
    var bd = it.bitdepth || 0;
    var sr = it.samplerate || 0;
    if(bd >= 24 || sr >= 88200 || c.indexOf('DSD') >= 0){
      hiresCount++;
    } else if(c === 'FLAC' || c === 'ALAC' || c === 'WAV' || c === 'AIFF' || c === 'APE' || c === 'WAVPACK' || bd === 16){
      cdCount++;
    } else {
      lossyCount++;
    }

    if(it.dr && it.dr > 0){
      drSum += it.dr;
      drCount++;
    }

    if(it.time){
      var d = new Date(it.time);
      var ds = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
      if(!dayMap[ds]) dayMap[ds] = { count: 0, seconds: 0 };
      dayMap[ds].count++;
      dayMap[ds].seconds += secs;
    }
  }

  // Fallback if history is completely empty: sample library tracks so charts render gracefully
  if(totalTracks === 0 && typeof libItems === 'function'){
    var lib = libItems();
    if(lib && lib.Count){
      var sampleCap = Math.min(lib.Count, 150);
      for(var li = 0; li < sampleCap; li++){
        var lh = lib[li];
        var lart = TF.artist.EvalWithMetadb(lh) || 'Artist';
        var lalb = TF.album.EvalWithMetadb(lh) || 'Album';
        var lcod = TF.codec ? (TF.codec.EvalWithMetadb(lh) || '').toUpperCase() : '';
        var lbd = TF.bitdepth ? (parseInt(TF.bitdepth.EvalWithMetadb(lh), 10) || 0) : 0;
        var lsr = TF.samplerate ? (parseInt(TF.samplerate.EvalWithMetadb(lh), 10) || 0) : 0;

        var larts = (typeof splitArtists === 'function') ? splitArtists(lart) : [lart];
        if(!larts || !larts.length) larts = [lart];
        for(var lai = 0; lai < larts.length; lai++){
          var laName = (larts[lai] || '').trim();
          if(!laName) continue;
          if(!artistMap[laName]) artistMap[laName] = { name: laName, plays: 1, seconds: 200, handle: lh };
          else artistMap[laName].plays++;
        }

        var laKey = lalb + ' -- ' + lart;
        if(!albumMap[laKey]) albumMap[laKey] = { title: lalb, artist: lart, plays: 1, handle: lh };
        else albumMap[laKey].plays++;

        if(lbd >= 24 || lsr >= 88200 || lcod.indexOf('DSD') >= 0) hiresCount++;
        else if(lcod === 'FLAC' || lcod === 'ALAC' || lcod === 'WAV' || lbd === 16) cdCount++;
        else lossyCount++;
      }
      totalTracks = sampleCap;
      totalSeconds = sampleCap * 210;
    }
  }

  var sortedArtists = Object.keys(artistMap).map(function(k){ return artistMap[k]; }).sort(function(a,b){
    if(b.plays !== a.plays) return b.plays - a.plays;
    return b.seconds - a.seconds;
  });
  for(var rk = 0; rk < sortedArtists.length; rk++){
    sortedArtists[rk].rank = rk + 1;
  }

  var sortedAlbums = Object.keys(albumMap).map(function(k){ return albumMap[k]; }).sort(function(a,b){ return b.plays - a.plays; });

  // 52-Week GitHub Style Calendar: exactly 52 weeks ending on today without future days
  var heatmap = [];
  var todayDayOfWeek = now.getDay(); // 0: Sun, 1: Mon, ..., 6: Sat
  var thisSundayMidnight = todayMidnight - todayDayOfWeek * oneDayMs;
  var startSundayMidnight = thisSundayMidnight - 51 * 7 * oneDayMs;

  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  for(var col = 0; col < 52; col++){
    var weekSundayTime = startSundayMidnight + col * 7 * oneDayMs;
    // For col 51 (current week), only draw up to today! Don't show remaining days of this week
    var maxRowThisWeek = (col === 51) ? todayDayOfWeek : 6;

    for(var row = 0; row <= maxRowThisWeek; row++){
      var cellTime = weekSundayTime + row * oneDayMs;
      var curD = new Date(cellTime);
      var curDs = curD.getFullYear() + '-' + ('0' + (curD.getMonth() + 1)).slice(-2) + '-' + ('0' + curD.getDate()).slice(-2);
      var info = dayMap[curDs] || { count: 0, seconds: 0 };

      var level = 0;
      if(info.count >= 10) level = 4;
      else if(info.count >= 6) level = 3;
      else if(info.count >= 3) level = 2;
      else if(info.count >= 1) level = 1;

      var friendlyDate = dayNames[row] + ', ' + months[curD.getMonth()] + ' ' + curD.getDate() + ', ' + curD.getFullYear();
      var shortDate = months[curD.getMonth()] + ' ' + curD.getDate() + ', ' + curD.getFullYear();

      heatmap.push({
        dateStr: curDs,
        friendlyDate: friendlyDate,
        shortDate: shortDate,
        monthName: months[curD.getMonth()],
        dayOfMonth: curD.getDate(),
        col: col,
        row: row,
        count: info.count,
        seconds: info.seconds,
        level: level,
        isToday: (cellTime === todayMidnight),
        isFuture: false
      });
    }
  }

  var totalPlays = hiresCount + cdCount + lossyCount;
  var hiresPct = totalPlays ? Math.round((hiresCount / totalPlays) * 100) : 0;
  var cdPct = totalPlays ? Math.round((cdCount / totalPlays) * 100) : 0;
  var lossyPct = totalPlays ? Math.max(0, 100 - hiresPct - cdPct) : 0;

  var summary = {
    totalTracks: totalTracks,
    totalMinutes: Math.round(totalSeconds / 60),
    totalHours: (totalSeconds / 3600).toFixed(1),
    uniqueArtists: Object.keys(artistMap).length,
    topArtists: sortedArtists,
    topAlbums: sortedAlbums.slice(0, 10),
    heatmap: heatmap,
    fidelity: {
      hiresCount: hiresCount,
      hiresPct: hiresPct,
      cdCount: cdCount,
      cdPct: cdPct,
      lossyCount: lossyCount,
      lossyPct: lossyPct,
      totalPlays: totalPlays
    },
    avgDr: drCount ? (Math.round((drSum / drCount) * 10) / 10) : 11
  };

  analyticsSummaryCache = summary;
  analyticsCacheTime = Date.now();
  return summary;
}
