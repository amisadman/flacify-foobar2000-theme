/* verdant/data/library.js -- library + playlist data: handles, title-format passes, indices, sort order
   Part of Verdant, a Spotify-style theme for foobar2000. Loaded by main.js;
   every module shares one global scope, so load order is set there. */

/* Playlist name/count are read once per playlist instead of once per card per frame -- these
   are interop calls into foobar, and the draw loops ran dozens of them every paint. Cleared by
   invalidateItems(), which every callback that can change a playlist's name or contents goes
   through -- switching between playlists is not one of them and deliberately keeps the caches. */
var plNameCache={}, plCountCache={};
function plName(pi){ if(!plNameCache.hasOwnProperty(pi)) plNameCache[pi]=plman.GetPlaylistName(pi); return plNameCache[pi]; }
function plCount(pi){ if(!plCountCache.hasOwnProperty(pi)) plCountCache[pi]=plman.PlaylistItemCount(pi); return plCountCache[pi]; }
// memoised per paint: drawNav and drawHome both call this, so it ran twice on every frame
var visPlCache=null;
function visiblePlaylists(){
  if(visPlCache) return visPlCache;
  var a=[]; for(var i=0;i<plman.PlaylistCount;i++) if(!isHiddenPl(plName(i))) a.push(i);
  visPlCache=a; return a;
}

/* The library handle list was fetched separately by getArtistList, getSongsIdx, getSearchIdx,
   loadArtist, libCovers and libCount, and the same title-formatting fields were evaluated across
   the whole library by two or three of them independently. Both are now fetched once and shared;
   invalidateLibrary() clears them alongside everything else derived from the library. */
var libItems_=null, libTFCache={};
function libItems(){
  if(libItems_===null){ try{ libItems_=fb.GetLibraryItems(); }catch(e){ libItems_=null; } }
  return libItems_;
}
function libTF(field){
  if(libTFCache.hasOwnProperty(field)) return libTFCache[field];
  var lib=libItems(), out=[];
  if(lib && lib.Count){ try{ out=TF[field].EvalWithMetadbs(lib); }catch(e){ out=[]; } }
  libTFCache[field]=out; return out;
}

/* ------------------------- library-backed artist list ------------------------- */
function splitArtists(str){
  if(!str) return [];
  var raw=String(str).split(/\s*,\s*|\s*;\s*|\s*\/\s*|\s+feat\.?\s+|\s+ft\.?\s+|\s+featuring\s+/i);
  var out=[], seen={};
  for(var i=0;i<raw.length;i++){
    var a=raw[i].trim();
    if(a.length && !seen[a.toLowerCase()]){ seen[a.toLowerCase()]=1; out.push(a); }
  }
  return out;
}

var artistList=null, artistTracksMap=null, artistCandCache={};
function getArtistList(){
  if(artistList) return artistList;
  var lib=libItems();
  var out=[]; artistTracksMap={};
  if(lib && lib.Count){
    var names=libTF('rawArtist');
    if(!names || !names.length) names=libTF('artistName');
    var seen={};
    for(var i=0;i<names.length;i++){
      var raw=names[i]; if(!raw) continue;
      var parts=splitArtists(raw);
      if(!parts.length) parts=[raw.trim()];
      for(var p=0;p<parts.length;p++){
        var nm=parts[p]; if(!nm) continue;
        if(!artistTracksMap[nm]) artistTracksMap[nm]=[];
        artistTracksMap[nm].push(lib[i]);
        if(!seen[nm]){ seen[nm]=1; out.push({name:nm, handle:lib[i]}); }
      }
    }
    out.sort(function(a,b){ var an=a.name.toLowerCase(), bn=b.name.toLowerCase(); return an<bn?-1:(an>bn?1:0); });
  }
  artistList=out; return out;
}
/* artist avatar = the first of the artist's albums that actually HAS art, not simply their first
   track -- one untagged opener used to leave the whole artist on a placeholder. The candidates are
   one track per album (scan capped like plCovers, since a prolific artist's list can be long);
   coverPick settles on the first with art as they resolve, and the fallback stands in meanwhile. */
var ARTIST_CAND_SCAN=24;                 // albKey() is an interop call: bound the scan, cache the result
function artistCands(name,fallback){
  if(artistCandCache.hasOwnProperty(name)) return artistCandCache[name];
  var list=artistTracksMap?artistTracksMap[name]:null, out=[], seen={}, i, h, k;
  if(!list) return fallback?[fallback]:[];   // map not built yet -> guess, but don't cache the guess
  var cap=Math.min(list.length,ARTIST_CAND_SCAN);
  for(i=0;i<cap && out.length<COVER_CANDS;i++){
    h=list[i]; if(!h) continue; k=albKey(h); if(seen[k]) continue;
    seen[k]=1; out.push(h);
  }
  if(!out.length && fallback) out.push(fallback);
  artistCandCache[name]=out; return out;
}
// the bulk warm pass's cheap guess -- no candidate scan, no album dedupe
function artistFirst(name,fallback){ var l=artistTracksMap?artistTracksMap[name]:null; return (l&&l.length)?l[0]:fallback; }
function artistCover(name,fallback){
  var c=artistCands(name,fallback), p=coverPick('ar|'+name,c,1);
  if(p.list.length) return p.list[0];
  return c.length?c[0]:(fallback||null);          // still choosing -> the old first-track guess
}
// false while the scan can still move the choice: baking a card now would freeze its placeholder
function artistCoverReady(name,fallback){ return coverPick('ar|'+name,artistCands(name,fallback),1).done; }
function loadArtist(name){
  viewArtist=name; artScroll=0; artistAlbums=[];
  getArtistList();
  var list=artistTracksMap?artistTracksMap[name]:null;
  if(!list || !list.length){
    if(artistTracksMap && name){
      var nLow=name.toLowerCase();
      for(var k in artistTracksMap){
        if(k.toLowerCase()===nLow){ list=artistTracksMap[k]; break; }
      }
    }
  }
  if(!list || !list.length) return;
  var hl=fb.CreateHandleList();
  for(var h=0;h<list.length;h++) if(list[h]) hl.Add(list[h]);
  var albs=TF.album.EvalWithMetadbs(hl),
      titles=TF.title.EvalWithMetadbs(hl),
      lens=TF.len.EvalWithMetadbs(hl),
      yrs=TF.year.EvalWithMetadbs(hl);
  var map={}, order=[];
  for(var i=0;i<list.length;i++){
    var al=albs[i]||'Unknown Album';
    if(!map[al]){ map[al]={album:al, handle:list[i], year:yrs[i], tracks:[]}; order.push(al); }
    map[al].tracks.push({title:titles[i], dur:lens[i], handle:list[i]});
  }
  for(var j=0;j<order.length;j++) artistAlbums.push(map[order[j]]);
}

/* ---- "All Songs" library view: one index of every library track (built once, invalidated by
   the library callbacks), expanded into a flat ROW list of headers + tracks in display order,
   each carrying its own height + precomputed y. Grouping only re-sorts the index, never re-reads
   the library. Rows: {k:'g1'|'g2'|'t'}; headers also carry kind:'artist'|'album'. */
var songsIdx=null, songsRows=null, songsTracks=null, songsContentH=0, songsTotalSec=0;
var songsGroup='none', songsScroll=0, songsScrollT=0, SONGS_MAXPX=0;
var sgMenuOpen=false, SG_HB=[], HB_SG=null, HB_ALLSONGS=null, HB_RGNORM=null;
var SONGS_GROUPS=[['No grouping','none'],['By artist','artist'],['By album','album'],['By artist & album','both']];
/* ---- group-list metrics: one indent step per nesting level (SG_IND) and one shared vertical
   rhythm per header -- GAP above (the divider sits at its top), artwork, PADB below. Header
   heights are DERIVED from those parts so every tier lands on the same grid. SG_H1B is the
   artist banner (same block in a slab). SG_CROP is the over-paint band hiding the top partial
   row (no clip API); it must exceed the tallest thing a row paints above its own top edge. */
var SG_IND=32, SG_GAP1=24, SG_GAP2=14, SG_PADB1=12, SG_PADB2=10;
var SG_ART1=56, SG_ART2=44, SG_TGAP=18, SG_SLABP=10;
var SG_H1=SG_GAP1+SG_ART1+SG_PADB1;                  // 92  top-level header
var SG_H1B=SG_GAP1+SG_SLABP*2+SG_ART1+SG_PADB1;      // 112 artist banner (slab around artwork)
var SG_H2=SG_GAP2+SG_ART2+SG_PADB2;                  // 68  nested header
var SG_TRH=44, SHEAD=312, SG_CROP=96;
function getSongsIdx(){
  if(songsIdx) return songsIdx;
  var lib=libItems();
  var out=[]; songsTotalSec=0;
  if(lib && lib.Count){
    var ti=libTF('title'), ar=libTF('artist'), aa=libTF('artistName'),
        al=libTF('album'), ln=libTF('len'), ls=libTF('lensec'),
        ak=libTF('albkey'), tn=libTF('trackno'), yr=libTF('year');
    for(var i=0;i<ti.length;i++){
      songsTotalSec+=parseInt(ls[i],10)||0;
      var eT=ti[i]||'', eR=ar[i]||'', eA=aa[i]||'Unknown Artist', eL=al[i]||'Unknown Album';
      // sort keys are lowercased once here instead of on every comparison inside cmpStr; a sort
      // does n*log(n) comparisons, so doing it per-comparison scales as badly as the sort itself
      out.push({h:lib[i], title:eT, artist:eR, aartist:eA,
                album:eL, len:ln[i], artkey:ak[i], year:yr[i]||'', tn:parseInt(tn[i],10)||0,
                kT:eT.toLowerCase(), kR:eR.toLowerCase(), kA:eA.toLowerCase(), kL:eL.toLowerCase()});
    }
  }
  songsIdx=out; return out;
}
/* Build steps for the All Songs view. The nine title-formatting passes are the bulk of the work
   and each is atomic, so they run one per tick rather than back to back; libTF memoises them, so
   getSongsIdx then finds everything cached and only has to assemble. */
var SONGS_FIELDS=['title','artist','artistName','album','len','lensec','albkey','trackno','year'];
function songsSteps(){
  var steps=[], i;
  for(i=0;i<SONGS_FIELDS.length;i++) steps.push((function(f){ return function(){ libTF(f); }; })(SONGS_FIELDS[i]));
  steps.push(function(){ getSongsIdx(); });      // assembly only -- every field is cached by now
  steps.push(function(){ buildSongsRows(); });   // sort (atomic) + row layout
  steps.push(function(){ if(!rgStat) rgCompute(); });   // ReplayGain status for the Normalize pill
  return steps;
}
function songsReady(){ return !!songsRows; }
function cmpStr(a,b){ a=String(a).toLowerCase(); b=String(b).toLowerCase(); return a<b?-1:(a>b?1:0); }
function cmpK(a,b){ return a<b?-1:(a>b?1:0); }   // operands already lowercased once at index time
function cmpTrk(a,b){ return (a.tn-b.tn)||cmpStr(a.title,b.title); }   // within an album: disc order, then title
function buildSongsRows(){
  var idx=getSongsIdx().slice(0), g=songsGroup, rows=[], tracks=[], i;
  // compares the lowercase keys precomputed in getSongsIdx -- identical ordering to cmpStr, but
  // without re-lowercasing both operands on every one of the n*log(n) comparisons
  if(g==='artist')     idx.sort(function(a,b){ return cmpK(a.kA,b.kA)||cmpK(a.kL,b.kL)||cmpTrk(a,b); });
  else if(g==='album') idx.sort(function(a,b){ return cmpK(a.kL,b.kL)||cmpK(a.kA,b.kA)||cmpTrk(a,b); });
  else if(g==='both')  idx.sort(function(a,b){ return cmpK(a.kA,b.kA)||cmpK(a.kL,b.kL)||cmpTrk(a,b); });
  else                 idx.sort(function(a,b){ return cmpK(a.kT,b.kT)||cmpK(a.kR,b.kR); });
  var curA=null, curAl=null, ref1=null, ref2=null, n=0, trH=(g==='none')?M.rowH:SG_TRH;
  var h1=(g==='both')?SG_H1B:SG_H1;
  for(i=0;i<idx.length;i++){
    var t=idx[i];
    if(g==='artist'){
      if(t.aartist!==curA){ curA=t.aartist; n=0; ref1={k:'g1',kind:'artist',label:t.aartist,sub:'',h:h1,handle:t.h,seed:t.aartist,count:0,albums:0,cands:[],ckey:''}; rows.push(ref1); }
    } else if(g==='album'){
      if(t.artkey!==curAl){ curAl=t.artkey; n=0; ref1={k:'g1',kind:'album',label:t.album,sub:t.aartist+(t.year?(' '+CH_DOT+' '+t.year):''),h:h1,handle:t.h,seed:t.artkey,count:0,albums:0}; rows.push(ref1); }
    } else if(g==='both'){
      if(t.aartist!==curA){ curA=t.aartist; curAl=null; ref2=null; ref1={k:'g1',kind:'artist',label:t.aartist,sub:'',h:h1,handle:t.h,seed:t.aartist,count:0,albums:0,cands:[],ckey:''}; rows.push(ref1); }
      if(t.artkey!==curAl){ curAl=t.artkey; n=0; ref2={k:'g2',kind:'album',label:t.album,sub:t.year||'',h:SG_H2,handle:t.h,seed:t.artkey,count:0}; rows.push(ref2); if(ref1) ref1.albums++; }
    }
    n++; tracks.push(t);
    // one candidate per album for the artist header's avatar -- the first with art wins (rowCover)
    if(ref1 && ref1.cands && ref1.ckey!==t.artkey && ref1.cands.length<COVER_CANDS){ ref1.ckey=t.artkey; ref1.cands.push(t.h); }
    rows.push({k:'t',t:t,n:(g==='none'?tracks.length:n),ti:tracks.length-1,h:trH});
    if(ref1) ref1.count++;
    if(ref2) ref2.count++;
  }
  var yy=0;
  for(i=0;i<rows.length;i++){ rows[i].y=yy; yy+=rows[i].h; }
  // link each row to its top-level header + record where the group ends, so the connector
  // rail still draws once the header itself has scrolled off the top
  var last=-1;
  for(i=0;i<rows.length;i++){
    if(rows[i].k==='g1'){ if(last>=0) rows[last].y1=rows[i].y; last=i; }
    else if(last>=0) rows[i].g1i=last;
  }
  if(last>=0) rows[last].y1=yy;
  songsRows=rows; songsTracks=tracks; songsContentH=yy+24;
}
// first row whose bottom is below the scroll position (binary search: thousands of rows)
function songsFirstAt(py){
  var lo=0, hi=songsRows.length-1, res=songsRows.length;
  while(lo<=hi){ var m=(lo+hi)>>1; if(songsRows[m].y+songsRows[m].h>py){ res=m; hi=m-1; } else lo=m+1; }
  return res;
}
function setSongsGroup(g){
  if(g!==songsGroup){ songsGroup=g; songsRows=null; songsScroll=songsScrollT=0; }
  sgMenuOpen=false; repaintAll();
}
function playSongsRow(ti){
  if(!songsTracks) return;
  var hs=[]; for(var i=0;i<songsTracks.length;i++) hs.push(songsTracks[i].h);
  playHandleList(hs,ti);
}

var plCacheMap={}, plMetaMap={};
function getItems(pi){ if(!plCacheMap[pi]){ plCacheMap[pi]=plman.GetPlaylistItems(pi); } return plCacheMap[pi]; }
function getMeta(pi){
  if(!plMetaMap[pi]){
    var list=getItems(pi), secs=TF.lensec.EvalWithMetadbs(list), tot=0;
    for(var i=0;i<secs.length;i++) tot+=parseInt(secs[i],10)||0;
    plMetaMap[pi]={ title:TF.title.EvalWithMetadbs(list), artist:TF.artist.EvalWithMetadbs(list),
                    album:TF.album.EvalWithMetadbs(list), len:TF.len.EvalWithMetadbs(list), artkey:TF.albkey.EvalWithMetadbs(list),
                    totalSec:tot, keys:null };
  }
  return plMetaMap[pi];
}
/* Build steps for a playlist. getItems materialises the whole item list and each TF pass runs
   over it, so on a large playlist doing these back to back is exactly the stall being avoided --
   one per tick instead. plMetaMap is only published once every field is in, so a synchronous
   getMeta() elsewhere still sees either nothing or a complete record, never a half-built one. */
function metaSteps(pi){
  var list=null, m={title:null,artist:null,album:null,len:null,artkey:null,totalSec:0,keys:null};
  return [
    function(){ list=getItems(pi); },
    function(){ m.title=TF.title.EvalWithMetadbs(list); },
    function(){ m.artist=TF.artist.EvalWithMetadbs(list); },
    function(){ m.album=TF.album.EvalWithMetadbs(list); },
    function(){ m.len=TF.len.EvalWithMetadbs(list); },
    function(){ m.artkey=TF.albkey.EvalWithMetadbs(list); },
    function(){ var s=TF.lensec.EvalWithMetadbs(list), t=0, i; for(i=0;i<s.length;i++) t+=parseInt(s[i],10)||0; m.totalSec=t; },
    function(){ if(!plMetaMap[pi]) plMetaMap[pi]=m; }   // a sync getMeta() may have won the race
  ];
}
function metaReady(pi){ return !!plMetaMap[pi]; }

// jobs={} cancels any build in flight: jobStep finds no entry for its key and simply stops, so a
// job that started against the old data can never publish it
function invalidateItems(){ plCacheMap={}; plMetaMap={}; plCoverCache={}; coverPickCache={}; mosaicCache={}; warmed={}; plOrderMap={}; plNameCache={}; plCountCache={}; plCardCache={}; qMetaCache={}; visPlCache=null; warmJob=null; jobs={}; gates={}; rowGate={}; shelfHandles=null; }

/* ---- Playlist view sort: only reorders how rows are DISPLAYED. Native item indices (playback,
   row menu, drag targets) are untouched, so order[displayRow] maps to the real item index. */
var plSort='artist', plSortDir='asc', plSortMenuOpen=false, PL_SORT_HB=[], HB_PLSORT=null, HB_PLSORTDIR=null;
var PL_SORTS=[['Title','title'],['Artist','artist'],['Album','album']];
var plOrderMap={};
// Lowercase sort keys built once per playlist and reused across re-sorts, for the same reason as
// the All Songs index: cmpStr would otherwise lowercase both operands on every comparison.
function plKeys(pi){
  var meta=getMeta(pi);
  if(!meta.keys){
    var n=meta.title.length, t=[], a=[], l=[], i;
    for(i=0;i<n;i++){ t.push(String(meta.title[i]).toLowerCase()); a.push(String(meta.artist[i]).toLowerCase()); l.push(String(meta.album[i]).toLowerCase()); }
    meta.keys={t:t,a:a,l:l};
  }
  return meta.keys;
}
function buildPlOrder(pi){
  var meta=getMeta(pi), k=plKeys(pi), n=meta.title.length, order=[], i;
  for(i=0;i<n;i++) order.push(i);
  if(plSort==='title') order.sort(function(a,b){ return cmpK(k.t[a],k.t[b])||cmpK(k.a[a],k.a[b]); });
  else if(plSort==='album') order.sort(function(a,b){ return cmpK(k.l[a],k.l[b])||cmpK(k.a[a],k.a[b])||cmpK(k.t[a],k.t[b]); });
  else order.sort(function(a,b){ return cmpK(k.a[a],k.a[b])||cmpK(k.l[a],k.l[b])||cmpK(k.t[a],k.t[b]); });
  if(plSortDir==='desc') order.reverse();
  return order;
}
function getPlOrder(pi){
  var meta=getMeta(pi), n=meta.title.length, c=plOrderMap[pi];
  if(!c || c.sort!==plSort || c.dir!==plSortDir || c.n!==n){ c={sort:plSort,dir:plSortDir,n:n,order:buildPlOrder(pi)}; plOrderMap[pi]=c; }
  return c.order;
}
function setPlSort(s){ plSort=s; plSortMenuOpen=false; repaintAll(); }
function togglePlSortDir(){ plSortDir=(plSortDir==='asc')?'desc':'asc'; repaintAll(); }

/* ------------------------- library-backed albums list ------------------------- */
var albumList=null, albumMap={};
function getAlbumList(){
  if(albumList) return albumList;
  var lib=libItems();
  var out=[], map={};
  if(lib && lib.Count){
    var albs=libTF('album'),
        albumArtists=libTF('albumArtist'),
        rawArtists=libTF('rawArtist'),
        folders=libTF('folder'),
        yrs=libTF('year');

    for(var i=0;i<lib.Count;i++){
      var rawAlb=albs[i]||'';
      var al=rawAlb.trim()||'Unknown Album';
      var albArt=(albumArtists[i]||'').trim();
      var rawArt=(rawArtists[i]||'').trim()||'Unknown Artist';
      var fld=(folders[i]||'').trim();

      // Robust album grouping key:
      // Priority 1: If ALBUM ARTIST is explicitly tagged, group by (Album + AlbumArtist).
      // Priority 2: If no Album Artist, group by (Album + Folder) so tracks in the same directory stay unified!
      // Priority 3: Fallback to (Album + Artist).
      var k;
      if(albArt && albArt.toLowerCase()!=='unknown artist'){
        k=(al+'|'+albArt).toLowerCase();
      } else if(fld && al.toLowerCase()!=='unknown album'){
        k=(al+'|'+fld).toLowerCase();
      } else {
        k=(al+'|'+rawArt).toLowerCase();
      }

      if(!map[k]){
        map[k]={
          name:al,
          artist:albArt||rawArt||'Unknown Artist',
          albumArtist:albArt,
          folder:fld,
          year:yrs[i]||'',
          handle:lib[i],
          handles:[],
          key:k,
          artistsSeen:{}
        };
        out.push(map[k]);
      }

      var entry=map[k];
      entry.handles.push(lib[i]);
      if(yrs[i] && (!entry.year || yrs[i]<entry.year)) entry.year=yrs[i];

      // Tally artist names across all songs in this album
      var parts=splitArtists(rawArt);
      for(var pi=0;pi<parts.length;pi++){
        var pName=parts[pi];
        if(pName){
          entry.artistsSeen[pName]=(entry.artistsSeen[pName]||0)+1;
        }
      }
    }

    // Refine displayed artist for albums where ALBUM ARTIST was not explicitly set
    for(var oi=0;oi<out.length;oi++){
      var aItem=out[oi];
      if(!aItem.albumArtist && aItem.handles.length>1){
        var bestArtist='', maxCount=0, totalArtists=0;
        for(var aName in aItem.artistsSeen){
          totalArtists++;
          if(aItem.artistsSeen[aName]>maxCount){
            maxCount=aItem.artistsSeen[aName];
            bestArtist=aName;
          }
        }
        // If one artist is predominant across >= 50% of the tracks, use it as album artist
        if(bestArtist && maxCount>=Math.ceil(aItem.handles.length*0.5)){
          aItem.artist=bestArtist;
        } else if(totalArtists>2){
          aItem.artist='Various Artists';
        }
      }
      // Index by (name + '|' + artist) in albumMap as well so lookups by name+artist always find it
      var normK=(aItem.name+'|'+aItem.artist).toLowerCase();
      if(!map[normK]) map[normK]=aItem;
    }

    out.sort(function(a,b){
      var an=a.name.toLowerCase(), bn=b.name.toLowerCase();
      return an<bn?-1:(an>bn?1:0);
    });
  }
  albumList=out; albumMap=map;
  return out;
}

var currentAlbum=null;
function loadAlbum(name, artist){
  var lib=libItems();
  currentAlbum=null;
  if(!lib || !lib.Count) return null;
  getAlbumList();
  var k=(name+'|'+(artist||'')).toLowerCase();
  var entry=albumMap[k];
  if(!entry){
    var nLow=name.toLowerCase();
    var aLow=(artist||'').toLowerCase();
    for(var j=0;j<albumList.length;j++){
      var item=albumList[j];
      if(item.name.toLowerCase()===nLow){
        if(!aLow || item.artist.toLowerCase()===aLow || (item.key && item.key.indexOf(aLow)!==-1)){
          entry=item; break;
        }
        if(!entry) entry=item;
      }
    }
  }
  if(!entry) return null;

  var handles=entry.handles;
  var hl=fb.CreateHandleList();
  for(var hi=0;hi<handles.length;hi++) if(handles[hi]) hl.Add(handles[hi]);
  var titles=TF.title.EvalWithMetadbs(hl),
      lens=TF.len.EvalWithMetadbs(hl),
      lensecs=TF.lensec.EvalWithMetadbs(hl),
      tracks=TF.trackno.EvalWithMetadbs(hl),
      discs=TF.disc.EvalWithMetadbs(hl),
      trkArtists=TF.artist.EvalWithMetadbs(hl);

  var first=entry.handle;
  var barcode='', copyright='', codec='', bitrate='', bitdepth='', samplerate='', isrc='', comment='';
  try{
    barcode=TF.barcode.EvalWithMetadb(first);
    copyright=TF.copyright.EvalWithMetadb(first);
    isrc=TF.isrc.EvalWithMetadb(first);
    comment=TF.comment.EvalWithMetadb(first);
    codec=TF.codec.EvalWithMetadb(first);
    bitrate=TF.bitrate.EvalWithMetadb(first);
    bitdepth=TF.bitdepth.EvalWithMetadb(first);
    samplerate=TF.samplerate.EvalWithMetadb(first);
  }catch(e){}

  if(!barcode && comment){
    try{
      var bm=comment.match(/\b\d{12,13}\b/);
      if(bm) barcode=bm[0];
    }catch(e2){}
  }

  var totalSec=0, trackRows=[];
  for(var i=0;i<handles.length;i++){
    var s=parseInt(lensecs[i],10)||0; totalSec+=s;
    var num=parseInt(tracks[i],10)||(i+1);
    var dnum=parseInt(discs[i],10)||1;
    trackRows.push({
      idx:i,
      trackno:num,
      discno:dnum,
      title:titles[i]||'Unknown Track',
      artist:trkArtists[i]||entry.artist||'Unknown Artist',
      dur:lens[i]||'0:00',
      handle:handles[i]
    });
  }
  trackRows.sort(function(a,b){
    if(a.discno!==b.discno) return a.discno-b.discno;
    return a.trackno-b.trackno;
  });

  // Gather collaborating artists, library statistics, other albums, and tracks
  getArtistList();
  var artistNames=splitArtists(entry.artist||'');
  if(!artistNames.length && entry.artist) artistNames=[entry.artist.trim()];

  // If album artist is Various Artists / VA, collect top distinct track artists
  if(artistNames.length===1 && (artistNames[0].toLowerCase()==='various artists' || artistNames[0].toLowerCase()==='va')){
    var vaSeen={}, vaList=[];
    for(var tri=0;tri<trackRows.length;tri++){
      var trkA=trackRows[tri].artist;
      if(trkA && trkA.toLowerCase()!=='various artists' && trkA.toLowerCase()!=='va'){
        var trkParts=splitArtists(trkA);
        for(var tpi=0;tpi<trkParts.length;tpi++){
          var tName=trkParts[tpi];
          if(tName && !vaSeen[tName.toLowerCase()]){
            vaSeen[tName.toLowerCase()]=1; vaList.push(tName);
          }
        }
      }
    }
    if(vaList.length>0) artistNames=vaList.slice(0, 5);
  }

  var artists=[];
  var currentNameLower=(entry.name||'').toLowerCase();

  for(var ani=0;ani<artistNames.length;ani++){
    var aName=artistNames[ani];
    var aLow=aName.toLowerCase();
    var aOtherAlbums=[];
    var aAlbumCount=0;
    var aHandle=null;

    for(var ai=0;ai<albumList.length;ai++){
      var albItem=albumList[ai];
      var albParts=splitArtists(albItem.artist||'');
      var matches=false;
      for(var pi=0;pi<albParts.length;pi++){
        if(albParts[pi].toLowerCase()===aLow){ matches=true; break; }
      }
      if(!matches && (albItem.artist||'').toLowerCase().indexOf(aLow)!==-1){
        matches=true;
      }
      if(matches){
        aAlbumCount++;
        if(!aHandle && albItem.handle) aHandle=albItem.handle;
        if(albItem.name.toLowerCase()!==currentNameLower){
          aOtherAlbums.push(albItem);
        }
      }
    }

    var aTracks=null;
    if(artistTracksMap){
      if(artistTracksMap[aName]) aTracks=artistTracksMap[aName];
      else {
        for(var atk in artistTracksMap){
          if(atk.toLowerCase()===aLow){ aTracks=artistTracksMap[atk]; break; }
        }
      }
    }
    var aSongCount=(aTracks&&aTracks.length)?aTracks.length:trackRows.length;
    var bestCover=artistCover(aName, aHandle||first);

    // Also collect other tracks by this artist not on this album
    var aOtherTracks=[];
    if(aTracks && aTracks.length){
      for(var oti=0;oti<aTracks.length;oti++){
        var oth=aTracks[oti]; if(!oth) continue;
        var inThisAlb=false;
        for(var thi=0;thi<handles.length;thi++){
          if(handles[thi] && handles[thi].Path===oth.Path){ inThisAlb=true; break; }
        }
        if(!inThisAlb){
          try{
            aOtherTracks.push({
              handle:oth,
              title:TF.title.EvalWithMetadb(oth)||'Track',
              album:TF.album.EvalWithMetadb(oth)||'',
              dur:TF.len.EvalWithMetadb(oth)||''
            });
          }catch(e){}
          if(aOtherTracks.length>=6) break;
        }
      }
    }

    artists.push({
      name:aName,
      handle:bestCover||aHandle||first,
      albumCount:Math.max(1, aAlbumCount),
      songCount:Math.max(1, aSongCount),
      otherAlbums:aOtherAlbums,
      otherTracks:aOtherTracks
    });
  }

  if(!artists.length){
    artists.push({
      name:entry.artist||'Unknown Artist',
      handle:first,
      albumCount:1,
      songCount:trackRows.length,
      otherAlbums:[],
      otherTracks:[]
    });
  }

  currentAlbum={
    name:entry.name,
    artist:entry.artist,
    artists:artists,
    year:entry.year,
    handle:first,
    handles:handles,
    trackRows:trackRows,
    count:trackRows.length,
    totalSec:totalSec,
    barcode:barcode,
    isrc:isrc,
    copyright:copyright,
    codec:codec,
    bitrate:bitrate,
    bitdepth:bitdepth,
    samplerate:samplerate,
    artistHandle:artists[0].handle,
    artistAlbumCount:artists[0].albumCount,
    artistSongCount:artists[0].songCount,
    otherAlbums:artists[0].otherAlbums
  };
  return currentAlbum;
}

/* ------------------------- recently downloaded / added tracks ------------------------- */
var recentTracksList=null;
function getRecentTracks(limit){
  if(recentTracksList) return recentTracksList.slice(0, limit||5);
  var lib=libItems();
  var out=[];
  if(lib && lib.Count){
    var mods=libTF('lastMod'),
        titles=libTF('title'),
        artists=libTF('artistName'),
        albs=libTF('album'),
        lens=libTF('len');
    for(var i=0;i<lib.Count;i++){
      out.push({
        handle:lib[i],
        title:titles[i]||'Unknown Track',
        artist:artists[i]||'Unknown Artist',
        album:albs[i]||'Unknown Album',
        dur:lens[i]||'',
        mod:mods[i]||''
      });
    }
    out.sort(function(a,b){
      var ma=a.mod, mb=b.mod;
      return ma>mb?-1:(ma<mb?1:0);
    });
  }
  recentTracksList=out;
  return out.slice(0, limit||5);
}
