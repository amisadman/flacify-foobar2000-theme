/* flacify/data/playlist_edit.js -- playlist + track editing: context menus, rename, delete, add, remove
   Part of FLACify, the lossless Spotify-style experience for foobar2000. Loaded by main.js;
   every module shares one global scope, so load order is set there. */

function openPlaylistMenu(pl,x,y){
  var items=[];
  var nm=plman.GetPlaylistName(pl);
  if(!plman.IsPlaylistLocked(pl)){
    items.push({label:'Change cover photo...', act:'custom_cover'});
    if(typeof hasCustomPlCover==='function' && hasCustomPlCover(nm)){
      items.push({label:'Remove custom cover', act:'remove_custom_cover'});
    }
    items.push({label:'Add files...',act:'addfiles'},{label:'Add folder...',act:'addfolder'});
  }
  items.push({label:'Rename',act:'rename'},{label:'Delete',act:'delete',danger:true});
  ctxMenu={kind:'pl', pl:pl, name:nm, x:x, y:y, items:items};
  repaintAll();
}
function openTrackMenu(pl,item,x,y){
  var it=getItems(pl), h=(it&&item<it.Count)?it[item]:null;
  var items=[
    {label:'Add to playlist...', act:'add_to_pl'},
    {label:(h&&isLiked(h))?'Remove from Liked Songs':'Save to Liked Songs', act:'toggle_like'},
    {label:'Song details / Credits',act:'details'}
  ];
  if(canEditPl(pl)) items.push({label:'Remove from this playlist',act:'trkremove',danger:true});
  ctxMenu={kind:'track', pl:pl, item:item, handle:h, x:x, y:y, items:items};
  repaintAll(); return true;
}
function openGenericTrackMenu(h,x,y){
  if(!h) return false;
  var items=[
    {label:'Add to playlist...', act:'add_to_pl'},
    {label:isLiked(h)?'Remove from Liked Songs':'Save to Liked Songs', act:'toggle_like'},
    {label:'Song details / Credits',act:'details'}
  ];
  ctxMenu={kind:'track', handle:h, x:x, y:y, items:items};
  repaintAll(); return true;
}

function choosePlaylistCover(plName){
  if(!plName) return;
  var script=fb.ProfilePath + 'flacify\\tools\\pick_cover.ps1';
  var cacheDir=fb.ProfilePath + 'flacify\\cache\\playlist_covers';
  try{
    var sh=new ActiveXObject('WScript.Shell');
    var cmd='powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + script + '" -PlaylistName "' + plName.replace(/"/g, '`"') + '" -CacheDir "' + cacheDir + '" -Action pick';
    sh.Run(cmd, 0, true);
    if(typeof clearCustomPlCover==='function') clearCustomPlCover(plName);
    plCardCache={};
    invalidateItems();
    repaintAll();
  }catch(e){}
}

function removePlaylistCover(plName){
  if(!plName) return;
  var script=fb.ProfilePath + 'flacify\\tools\\pick_cover.ps1';
  var cacheDir=fb.ProfilePath + 'flacify\\cache\\playlist_covers';
  try{
    var sh=new ActiveXObject('WScript.Shell');
    var cmd='powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + script + '" -PlaylistName "' + plName.replace(/"/g, '`"') + '" -CacheDir "' + cacheDir + '" -Action remove';
    sh.Run(cmd, 0, true);
    if(typeof clearCustomPlCover==='function') clearCustomPlCover(plName);
    plCardCache={};
    invalidateItems();
    repaintAll();
  }catch(e){}
}

function openAddToPlaylistMenu(h, x, y){
  if(!h) return;
  var items=[
    {label:'New playlist', act:'add_to_new_pl', handle:h, icon:'add', isNew:true}
  ];
  // Liked Songs
  var liked=isLiked(h);
  items.push({
    label:'Liked Songs',
    act:'toggle_like_item',
    handle:h,
    icon:liked?'check':'add',
    checked:liked,
    inPl:liked
  });
  // User playlists
  var pls=visiblePlaylists();
  for(var i=0; i<pls.length; i++){
    var pi=pls[i];
    var nm=plName(pi);
    var inPl=isTrackInPlaylist(h, pi);
    items.push({
      label:nm,
      act:'toggle_pl_item',
      plIdx:pi,
      handle:h,
      inPl:inPl,
      icon:inPl?'check':'add',
      checked:inPl
    });
  }
  ctxMenu={kind:'add_to_pl', handle:h, x:x, y:y, items:items};
  repaintAll();
}

function isTrackInPlaylist(h, targetPl){
  if(!h || targetPl<0 || targetPl>=plman.PlaylistCount) return false;
  var items=getItems(targetPl);
  if(!items || !items.Count) return false;
  for(var i=0; i<items.Count; i++){
    if(sameHandle(items[i], h)) return true;
  }
  return false;
}

function toggleTrackInPlaylist(h, targetPl){
  if(!h || targetPl<0 || targetPl>=plman.PlaylistCount) return;
  if(plman.IsPlaylistLocked(targetPl)) return;
  if(isTrackInPlaylist(h, targetPl)){
    var items=getItems(targetPl);
    if(items && items.Count){
      try{
        plman.UndoBackup(targetPl);
        plman.ClearPlaylistSelection(targetPl);
        for(var i=0; i<items.Count; i++){
          if(sameHandle(items[i], h)) plman.SetPlaylistSelectionSingle(targetPl, i, true);
        }
        plman.RemovePlaylistSelection(targetPl, false);
        plman.ClearPlaylistSelection(targetPl);
      }catch(e){}
    }
  } else {
    var list=fb.CreateHandleList();
    list.Add(h);
    try{
      plman.UndoBackup(targetPl);
      plman.InsertPlaylistItems(targetPl, plman.PlaylistItemCount(targetPl), list);
    }catch(e){}
  }
  invalidateItems();
  repaintAll();
}
function canEditPl(pl){
  if(pl<0) return false;
  try{ if(plman.IsPlaylistLocked(pl) || plman.IsAutoPlaylist(pl)) return false; }catch(e){}
  return true;
}
// Is this row the track you're hearing? Only playback straight off this playlist points the
// location at the row (index match tells duplicates apart); the hidden SHUF/ROUTE copies report
// a foreign PlaylistIndex, so fall back to matching the file.
function isRowPlaying(pl,item,h){
  if(!fb.IsPlaying && !fb.IsPaused) return false;
  var loc=playingLoc();
  if(loc && loc.IsValid && loc.PlaylistIndex===pl) return loc.PlaylistItemIndex===item;
  return sameHandle(h,NP);
}
// Removing the playing item does NOT stop foobar, so confirm the fb.Next() hand-off actually
// took once the edit settled: push again if not, stop if there was nowhere to go.
function verifyAdvanced(h){
  window.SetTimeout(function(){
    var np=null; try{ np=fb.GetNowPlaying(); }catch(e){}
    if(!(fb.IsPlaying||fb.IsPaused) || !sameHandle(np,h)) return;
    fb.Next();
    window.SetTimeout(function(){
      var n2=null; try{ n2=fb.GetNowPlaying(); }catch(e2){}
      if((fb.IsPlaying||fb.IsPaused) && sameHandle(n2,h)) fb.Stop();
    },150);
  },60);
}
// Drop the row out of the manual playback queue. Entries queued by handle alone (PlaylistIndex < 0)
// are matched by file. Must run BEFORE the playlist removal, while item indices still line up.
function dequeueRow(pl,item,h){
  var q=null; try{ q=plman.GetPlaybackQueueContents(); }catch(e){ q=null; }
  if(!q || !q.length) return;
  var kill=[];
  for(var i=0;i<q.length;i++){
    var e=q[i];
    if(e.PlaylistIndex===pl && e.PlaylistItemIndex===item) kill.push(i);
    else if(e.PlaylistIndex<0 && sameHandle(e.Handle,h)) kill.push(i);
  }
  if(kill.length){ try{ plman.RemoveItemsFromPlaybackQueue(kill); }catch(e2){} }
}
// shuffle reads "next up" from the hidden copy, so pull every instance out of that too
function removeFromShuffleCopy(pl,h){
  if(!pbShuffle || !h || pl<0) return;
  if(plman.GetPlaylistName(pl)!==shufSrcName) return;      // a different playlist is the shuffle source
  var si=playlistOfName(SHUF); if(si<0) return;
  var list=null; try{ list=plman.GetPlaylistItems(si); }catch(e){ return; }
  if(!list || !list.Count) return;
  var kill=[], i;
  for(i=0;i<list.Count;i++) if(sameHandle(list[i],h)) kill.push(i);
  if(!kill.length) return;
  try{
    plman.ClearPlaylistSelection(si);
    for(i=0;i<kill.length;i++) plman.SetPlaylistSelectionSingle(si,kill[i],true);
    plman.RemovePlaylistSelection(si,false);
    plman.ClearPlaylistSelection(si);
  }catch(e){}
}
// Remove one row: RemovePlaylistSelection is selection-based, so select just that item first.
// Removing the playing track hands playback on first; paused playback stops instead of advancing.
function removeTrackFromPl(pl,item){
  if(!canEditPl(pl) || item<0 || item>=plman.PlaylistItemCount(pl)) return;
  var items=getItems(pl), h=(items && item<items.Count)?items[item]:null;
  var playing=isRowPlaying(pl,item,h), wasPaused=fb.IsPaused;
  dequeueRow(pl,item,h);
  if(playing){ if(wasPaused) fb.Stop(); else fb.Next(); }
  removeFromShuffleCopy(pl,h);
  try{
    plman.UndoBackup(pl);
    plman.ClearPlaylistSelection(pl);
    plman.SetPlaylistSelectionSingle(pl,item,true);
    plman.RemovePlaylistSelection(pl,false);
    plman.ClearPlaylistSelection(pl);
  }catch(e){}
  if(playing && !wasPaused) verifyAdvanced(h);
  invalidateItems(); updateNP(); repaintAll();
}
function startRename(pl){ renameEdit={pl:pl, text:plman.GetPlaylistName(pl)}; ctxMenu=null; caretOn=true; startCaret(); applyKeyMode(); repaintAll(); }
function commitRename(){ if(!renameEdit) return; var t=(renameEdit.text||'').replace(/^\s+|\s+$/g,''); if(t) plman.RenamePlaylist(renameEdit.pl,t); renameEdit=null; applyKeyMode(); repaintAll(); }
function cancelRename(){ renameEdit=null; applyKeyMode(); repaintAll(); }
function doDeletePlaylist(pl){
  var wasShown=(view==='playlist' && pl===plman.ActivePlaylist);
  try{ plman.RemovePlaylist(pl); }catch(e){}
  confirmDel=null; invalidateItems();
  if(wasShown || plman.PlaylistCount===0) view='home';   // don't strand the view on a deleted list
  repaintAll();
}

// create a uniquely-named empty playlist, return its index
function newPlaylistName(){ var b='New Playlist', nm=b, k=1, i; for(;;){ var hit=false; for(i=0;i<plman.PlaylistCount;i++){ if(plman.GetPlaylistName(i)===nm){ hit=true; break; } } if(!hit) return nm; k++; nm=b+' '+k; } }
function createNewPlaylist(){ return plman.CreatePlaylist(plman.PlaylistCount, newPlaylistName()); }
// fb.AddFiles/AddDirectory take no arguments and always target the ACTIVE playlist, so point it
// at the destination first. The insert is async; on_playlist_items_added repaints.
function addFilesToPl(i){ if(i<0 || plman.IsPlaylistLocked(i)) return; plman.ActivePlaylist=i; armDupWatch(i); fb.AddFiles(); }
function addFolderToPl(i){ if(i<0 || plman.IsPlaylistLocked(i)) return; plman.ActivePlaylist=i; armDupWatch(i); fb.AddDirectory(); }
