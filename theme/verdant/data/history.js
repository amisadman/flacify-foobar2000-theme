/* flacify/data/history.js -- Listening History ("Recently Played") manager
   Tracks playback events and persists played songs to cache/history.json. */

var HISTORY_FILE = fb.ProfilePath + 'verdant\\cache\\history.json';
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
    var cacheDir = fb.ProfilePath + 'verdant\\cache';
    if(utils.CreateFolder) utils.CreateFolder(cacheDir);
    if(utils.WriteTextFile){
      var slice = historyList.slice(0, 500);
      utils.WriteTextFile(HISTORY_FILE, JSON.stringify(slice));
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

  // Avoid logging duplicate identical track if played within last 3 minutes
  if(historyList.length > 0){
    var first = historyList[0];
    if(first && first.path === p && (now - first.time) < 180000){
      first.time = now;
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
    time: now
  });

  if(historyList.length > 500) historyList.length = 500;
  saveHistory();

  if(view === 'home' || view === 'history') repaintMain();
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
