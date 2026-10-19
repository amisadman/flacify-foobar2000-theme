/* flacify/core/tf.js -- title-format objects, compiled once
   Part of FLACify, the lossless Spotify-style experience for foobar2000. Loaded by main.js;
   every module shares one global scope, so load order is set there. */

/* ------------------------- title formats ------------------------- */
var TF = {
  title:fb.TitleFormat('%title%'), artist:fb.TitleFormat('[%artist%]'),
  album:fb.TitleFormat('[%album%]'), len:fb.TitleFormat('%length%'),
  npTitle:fb.TitleFormat('[%title%]'), npArtist:fb.TitleFormat('[%artist%]'),
  albkey:fb.TitleFormat('%album artist% - %album%'), artistName:fb.TitleFormat('%album artist%'),
  year:fb.TitleFormat('$year(%date%)'), lensec:fb.TitleFormat('%length_seconds%'),
  trackno:fb.TitleFormat('%tracknumber%'),
  rg:fb.TitleFormat('$if(%replaygain_track_gain%,1,0)'),   // '1' once a loudness scan has tagged the file
  rgTrackGain:fb.TitleFormat('[$if2(%replaygain_track_gain%,%__replaygain_track_gain%)]'),
  rgTrackPeak:fb.TitleFormat('[$if2(%replaygain_track_peak%,%__replaygain_track_peak%)]'),
  rgAlbumGain:fb.TitleFormat('[$if2(%replaygain_album_gain%,%__replaygain_album_gain%)]'),
  rgAlbumPeak:fb.TitleFormat('[$if2(%replaygain_album_peak%,%__replaygain_album_peak%)]'),
  drTag:fb.TitleFormat('[$if3($meta(dynamic range),$meta(dynamic_range),%dynamic_range%,%__dynamic_range%)]'),
  rawArtist:fb.TitleFormat('[$if3($meta_sep(artist, ; ),$meta_sep(performer, ; ),$meta_sep(album artist, ; ),%artist%,%performer%,%album artist%)]'),
  barcode:fb.TitleFormat('[$if3($meta(barcode),$meta(upc),$meta(ean),$meta(catalog),$meta(catalognumber),%barcode%,%upc%,%ean%)]'),
  copyright:fb.TitleFormat('[$if3($meta(copyright),$meta(c),%copyright%,%c%)]'),
  isrc:fb.TitleFormat('[$if2($meta(isrc),%isrc%)]'),
  lyrics:fb.TitleFormat('[$if3($meta(lyrics),$meta(unsyncedlyrics),$meta(unsynced lyrics),%lyrics%,%unsyncedlyrics%,%unsynced lyrics%)]'),
  codec:fb.TitleFormat('[$if2(%codec%,$info(codec))]'),
  bitrate:fb.TitleFormat('[$if2(%bitrate%,$info(bitrate))]'),
  bitdepth:fb.TitleFormat('[$if2(%__bitspersample%,$info(bitspersample))]'),
  samplerate:fb.TitleFormat('[$if2(%__samplerate%,$info(samplerate))]'),
  channels:fb.TitleFormat('[$if2(%__channels%,$info(channels))]'),
  filesize:fb.TitleFormat('%filesize_natural%'),
  genre:fb.TitleFormat('[$if2($meta(genre),%genre%)]'),
  producer:fb.TitleFormat('[$if2($meta(producer),%producer%)]'),
  comment:fb.TitleFormat('[$if2($meta(comment),%comment%)]'),
  date:fb.TitleFormat('[$if2($meta(date),%date%)]'),
  lastMod:fb.TitleFormat('[$if2(%added%,%last_modified%)]'),
  composer:fb.TitleFormat('[$if2($meta(composer),%composer%)]'),
  lyricist:fb.TitleFormat('[$if3($meta(lyricist),$meta(writer),$meta(author),%lyricist%)]'),
  label:fb.TitleFormat('[$if3($meta(label),$meta(publisher),$meta(organization),%publisher%)]'),
  releasetype:fb.TitleFormat('[$if2($meta(releasetype),%releasetype%)]'),
  disc:fb.TitleFormat('[$if2(%discnumber%,$meta(discnumber))]'),
  totaltracks:fb.TitleFormat('[$if2(%totaltracks%,$meta(totaltracks))]'),
  path:fb.TitleFormat('%path%'),
  encoder:fb.TitleFormat('[$if4($info(tool),$info(encoder),$meta(writing application),%__writing_application%)]'),
  audioMd5:fb.TitleFormat('[$if2($info(md5),$info(flac_md5))]'),
  albumArtist:fb.TitleFormat('[$if4($meta_sep(album artist, ; ),$meta_sep(albumartist, ; ),$meta_sep(album_performer, ; ),$meta_sep(band, ; ),%album artist%)]'),
  catalog:fb.TitleFormat('[$if2($meta(catalognumber),$meta(catalog))]'),
  folder:fb.TitleFormat('$directory_path(%path%)')
};
