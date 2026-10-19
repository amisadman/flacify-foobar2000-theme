/* flacify/data/liked.js -- Liked Songs (Favorites) system
   Manages the "Liked Songs" playlist and in-memory fast path lookup for instantaneous heart icons. */

var LIKED_PLAYLIST_NAME = 'Liked Songs';
var likedSet = {};      // map: track path -> true
var likedCount = 0;

function getLikedPlaylistIndex(createIfMissing){
  for(var i = 0; i < plman.PlaylistCount; i++){
    if(plman.GetPlaylistName(i) === LIKED_PLAYLIST_NAME) return i;
  }
  if(createIfMissing){
    try {
      return plman.CreatePlaylist(plman.PlaylistCount, LIKED_PLAYLIST_NAME);
    } catch(e){ return -1; }
  }
  return -1;
}

function loadLiked(){
  likedSet = {};
  likedCount = 0;
  var pl = getLikedPlaylistIndex(false);
  if(pl < 0) return;
  var items = null;
  try { items = plman.GetPlaylistItems(pl); } catch(e){ items = null; }
  if(!items || !items.Count) return;
  likedCount = items.Count;
  for(var i = 0; i < items.Count; i++){
    var p = items[i].Path;
    if(p) likedSet[p] = true;
  }
}

function isLiked(metadb){
  if(!metadb) return false;
  var p = metadb.Path;
  return p ? !!likedSet[p] : false;
}

function toggleLike(metadb){
  if(!metadb) return;
  var p = metadb.Path;
  if(!p) return;
  var pl = getLikedPlaylistIndex(true);
  if(pl < 0) return;

  if(likedSet[p]){
    // Track is already liked -> remove from "Liked Songs" playlist
    var items = null;
    try { items = plman.GetPlaylistItems(pl); } catch(e){ items = null; }
    if(items && items.Count){
      var removeIdx = -1;
      for(var i = 0; i < items.Count; i++){
        if(items[i].Path === p){
          removeIdx = i;
          break;
        }
      }
      if(removeIdx >= 0){
        try {
          plman.UndoBackup(pl);
          plman.ClearPlaylistSelection(pl);
          plman.SetPlaylistSelectionSingle(pl, removeIdx, true);
          plman.RemovePlaylistSelection(pl, false);
          plman.ClearPlaylistSelection(pl);
        } catch(e){}
      }
    }
    delete likedSet[p];
    likedCount = Math.max(0, likedCount - 1);
  } else {
    // Track is not liked -> insert into "Liked Songs" playlist
    var list = fb.CreateHandleList();
    list.Add(metadb);
    try {
      plman.UndoBackup(pl);
      plman.InsertPlaylistItems(pl, plman.PlaylistItemCount(pl), list);
    } catch(e){}
    likedSet[p] = true;
    likedCount++;
  }

  // Refresh active views and playback bar
  repaintBar();
  repaintMain();
  repaintNav();
}

function drawLikedCover(gr, x, y, size, rad){
  rad = rad || 4;
  // Spotify-style purple/indigo backing
  gr.FillRoundRect(x, y, size, size, rad, rad, RGB(75, 45, 145));
  // Emerald gradient overlay on bottom half
  var botH = Math.round(size * 0.55);
  gr.FillRoundRect(x, y + size - botH, size, botH, rad, rad, RGBA(30, 215, 96, 45));
  // Centered white filled heart icon
  var isz = Math.max(16, Math.round(size * 0.46));
  drawIcon(gr, 'heartFilled', COL.white, x, y, size, size, isz);
}
