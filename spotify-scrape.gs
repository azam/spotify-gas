const CLIENT_ID = '';
const CLIENT_SECRET = '';
const CLIENT_LANGUAGE = 'ja';

const SPREADSHEET_ID = '';
const SHEET_NAME = 'データ';

function setClientProperties() {
  const props = PropertiesService.getScriptProperties();
  props.setProperty('ClientId', CLIENT_ID);
  props.setProperty('ClientSecret', CLIENT_SECRET);
  props.setProperty('ClientLanguage', CLIENT_LANGUAGE);
  props.setProperty('SpreadsheetId', SPREADSHEET_ID);
  props.setProperty('SheetName', SHEET_NAME);
}

function clearScrapeProperties() {
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty('ScrapeAfter');
}

function getLastEmptyRow(s, cellNum) {
  const lastRow = s.getLastRow();
  for (let rowNum = 1; rowNum < lastRow; rowNum += 1000) {
    const range = s.getRange(rowNum, cellNum, 1000, 1);
    const values = range.getValues();
    // console.log(values[0]);
    for (let i = 0; i < values.length; i++) {
      // console.log(values[i]);
      if (!values[i][0]) {
        return rowNum + i;
      }
    }
  }
  return lastRow;
}

function fillImported() {
  const props = PropertiesService.getScriptProperties();
  const ss = SpreadsheetApp.openById(cachedProps('SpreadsheetId'));
  const s = ss.getSheetByName('imported');
  const lastRow = s.getLastRow();
  const lastEmptyRow = getLastEmptyRow(s, 1);
  const batch = 50;

  for (let i = lastEmptyRow; i < lastRow; i += batch) {
    const rowCount = i + batch > lastRow ? lastRow - i : batch;
    const range = s.getRange(i, 1, rowCount, 21);
    const rows = range.getValues();
    const trackIds = new Set();
    for (let j = 0; j < rows.length; j++) {
      if (rows[j][20]) {
        trackIds.add(rows[j][20]);
      }
    }
    const tracksRes = getApi('https://api.spotify.com/v1/tracks', { ids: Array.from(trackIds).join(',') });
    if (tracksRes.error) {
      Logger.log('fillImported error ' + JSON.stringify(tracksRes));
      throw new Error(tracksRes.error);
    }

    for (let j = 0; j < rows.length; j++) {
      let trackId = rows[j][20];
      let playedAtJst =  String(rows[j][15]).padStart(4, '0') + '-' + String(rows[j][16]).padStart(2, '0') + '-' + String(rows[j][17]).padStart(2, '0') + 'T' + String(rows[j][18]).padStart(2, '0') + ':' + String(rows[j][19]).padStart(2, '0') + ':00.000+09:00';
      let playedAt = new Date(playedAtJst).toISOString();

      if (tracksRes.tracks) {
        const track = tracksRes.tracks.find(t => t.id == trackId);
        if (track) {
          const artist = track.artists ? track.artists[0] : undefined;
          const album = track.album ? track.album : undefined;
          // new Date(item.played_at),
          // item.played_at,
          // item.track.name,
          // item.track.id,
          // item.track.external_urls ? item.track.external_urls.spotify : undefined,
          // item.track.duration_ms,
          // album ? album.name : undefined,
          // album ? album.id : undefined,
          // (album && album.external_urls) ? album.external_urls.spotify : undefined,
          // album ? album.release_date : undefined,
          // (album && album.images) ? album.images[0].url : undefined,
          // artist ? artist.name : undefined,
          // artist ? artist.id : undefined,
          // (artist && artist.external_urls) ? artist.external_urls.spotify : undefined,
          // '',
          rows[j][0] = new Date(playedAt);
          rows[j][1] = playedAt;
          rows[j][2] = track.name;
          rows[j][3] = trackId;
          rows[j][4] = track.external_urls ? track.external_urls.spotify : undefined;
          rows[j][5] = track.duration_ms;
          rows[j][6] = album ? album.name : undefined;
          rows[j][7] = album ? album.id : undefined;
          rows[j][8] = (album && album.external_urls) ? album.external_urls.spotify : undefined;
          rows[j][9] = album ? album.release_date : undefined;
          rows[j][10] = (album && album.images) ? album.images[0].url : undefined;
          rows[j][11] = artist ? artist.name : undefined;
          rows[j][12] = artist ? artist.id : undefined;
          rows[j][13] = (artist && artist.external_urls) ? artist.external_urls.spotify : undefined;
          rows[j][14] = '';
          rows[j].length = 15
        }
      }
      // console.log(rows[j].length, rows[j]);
    }
    // console.log(rows);

    // Sort by descending played at date
    rows.sort((l, r) => l[0] - r[0]);
    // const range = s.getRange(i, 1, rows.length, 21);
    const valuesRange = s.getRange(i, 1, rows.length, 15);
    valuesRange.setValues(rows);
    const dateRange = s.getRange(i, 1, rows.length, 1);
    dateRange.setNumberFormat('yyyy/MM/dd hh:mm:ss');

    console.log('Added ' + rows.length + ' rows from ' + i);

    Utilities.sleep(5000);
    // return;
  }

}

function fillImportedArtistImageUrl() {
  const props = PropertiesService.getScriptProperties();
  const ss = SpreadsheetApp.openById(cachedProps('SpreadsheetId'));
  const s = ss.getSheetByName('imported');
  const lastRow = s.getLastRow();
  const urls = new Map();
  const range = s.getRange(2, 13, lastRow - 1, 1);
  const rows = range.getValues();
  console.log(rows.length);
  for (let i = 0; i < rows.length; i++) {
    // console.log(rows[i]);
    if (rows[i][0] && !urls.has(rows[i][0])) {
      urls.set(rows[i][0], '');
    }
  }
  console.log(urls.size);
  const artistIds = Array.from(urls.keys());
  const batch = 50;
  for (let i = 0; i < artistIds.length; i += batch) {
    const batchArtistIds = artistIds.slice(i, i + batch);
    console.log(batchArtistIds);
    const res = getApi('https://api.spotify.com/v1/artists', { ids: batchArtistIds.join(',') });
    if (res.error) {
      Logger.log('fillImportedArtistImageUrl error ' + JSON.stringify(res));
      throw new Error(res.error);
    }
    if (res && res.artists && res.artists.length > 0) {
      for (let i = 0; i < res.artists.length; i++) {
        const artist = res.artists[i];
        if (artist.id && urls.has(artist.id) && artist.images && artist.images.length > 0 && artist.images[0].url) {
          urls.set(artist.id, artist.images[0].url);
        }
      }
    }
    Utilities.sleep(5000);
    // return;
  }
  console.log(urls);
  const urlRange = s.getRange(2, 15, lastRow - 1, 1);
  const urlRows = urlRange.getValues();
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] && !urlRows[i][0] && urls.has(rows[i][0])) {
      urlRows[i][0] = urls.get(rows[i][0]);
    }
  }
  urlRange.setValues(urlRows);
}

function fillArtistImageUrl() {
  const props = PropertiesService.getScriptProperties();
  const ss = SpreadsheetApp.openById(cachedProps('SpreadsheetId'));
  const s = ss.getSheetByName(cachedProps('SheetName'));
  const lastRow = s.getLastRow();
  const urls = new Map();
  const range = s.getRange(2, 13, lastRow - 1, 3);
  const rows = range.getValues();
  console.log(rows.length);
  for (let i = 0; i < rows.length; i++) {
    // console.log(rows[i]);
    if (rows[i][0] && !rows[i][2] && !urls.has(rows[i][0])) {
      urls.set(rows[i][0], '');
    }
  }
  console.log(urls.size);
  const res = getApi('https://api.spotify.com/v1/artists', { ids: Array.from(urls.keys()).join(',') });
  if (res.error) {
    Logger.log('fillArtistImageUrl error ' + JSON.stringify(res));
    throw new Error(res.error);
  }
  if (res && res.artists && res.artists.length > 0) {
    for (let i = 0; i < res.artists.length; i++) {
      const artist = res.artists[i];
      if (artist.id && urls.has(artist.id) && artist.images && artist.images.length > 0 && artist.images[0].url) {
        urls.set(artist.id, artist.images[0].url);
      }
    }
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] && urls.get(rows[i][0])) {
        rows[i][2] = urls.get(rows[i][0]);
      }
    }
  }
  // console.log(rows);
  range.setValues(rows);
}

function scrape() {
  const props = PropertiesService.getScriptProperties();
  const ss = SpreadsheetApp.openById(cachedProps('SpreadsheetId'));
  const s = ss.getSheetByName(cachedProps('SheetName'));
  const headers = [
    'played_at_date',
    'played_at',
    'track_name',
    'track_id',
    'track_url',
    'track_duration_ms',
    'album_name',
    'album_id',
    'album_url',
    'album_release_date',
    'album_image_url',
    'artist_name',
    'artist_id',
    'artist_url',
    'artist_image_url',
  ];

  // Set headers if not set
  const a1 = s.getRange('A1').getValue();
  if (!a1) {
    // Initialize first row
    const headerRange = s.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
  }

  const lastRow = s.getLastRow();
  const maxRows = s.getMaxRows();

  // Expand sheet
  if (maxRows - lastRow <= 1000) {
    s.insertRowsAfter(maxRows, 10000);
  }

  // 50 is the limit of all recently played tracks. API will return empty items if called even with a before set.
  const currentAfter = props.getProperty('ScrapeAfter');
  Logger.log('scrape current ScrapeAfter is ' + currentAfter);
  const res = getApi('https://api.spotify.com/v1/me/player/recently-played', { limit: 50, after: currentAfter });
  if (res.error) {
    Logger.log('scrape error ' + JSON.stringify(res));
    throw new Error(res.error);
  }
  Logger.log('scrape returns cursors ' + JSON.stringify(res.cursors));
  // if (res.cursors && res.cursors.after && currentAfter !== res.cursors.after) {
  //   Logger.log('scrape has new tracks');
  //   props.setProperty('ScrapeAfter', res.cursors.after);
  // } else {
  //   Logger.log('scrape has no new tracks');
  //   return;
  // }
  if (!res.cursors || !res.cursors.after || currentAfter == res.cursors.after || !res.items || res.items.length < 1) {
    Logger.log('scrape has no new tracks');
    return;
  }

  // Generate rows
  Logger.log('scrape has new tracks');
  const rows = [];
  const artistImageUrls = new Map();
  for (let i = 0; i < res.items.length; i++) {
    const item = res.items[i];
    const artist = item.track.artists ? item.track.artists[0] : undefined;
    const album = item.track.album ? item.track.album : undefined;
    if (artist) artistImageUrls.set(artist.id, undefined);
    const row = [
      new Date(item.played_at),
      item.played_at,
      item.track.name,
      item.track.id,
      item.track.external_urls ? item.track.external_urls.spotify : undefined,
      item.track.duration_ms,
      album ? album.name : undefined,
      album ? album.id : undefined,
      (album && album.external_urls) ? album.external_urls.spotify : undefined,
      album ? album.release_date : undefined,
      (album && album.images) ? album.images[0].url : undefined,
      artist ? artist.name : undefined,
      artist ? artist.id : undefined,
      (artist && artist.external_urls) ? artist.external_urls.spotify : undefined,
      '',
    ];
    rows.push(row);
  }

  // Append rows to last
  if (rows.length > 0) {
    // Fetch artist image urls
    if (artistImageUrls.size > 0) {
      const artistsRes = getApi('https://api.spotify.com/v1/artists', { ids: Array.from(artistImageUrls.keys()).join(',') });
      if (artistsRes.error) {
        Logger.log('scrape error ' + JSON.stringify(artistsRes));
        throw new Error(artistsRes.error);
      }
      if (artistsRes && artistsRes.artists && artistsRes.artists.length > 0) {
        for (let i = 0; i < artistsRes.artists.length; i++) {
          const artist = artistsRes.artists[i];
          if (artist.id && artistImageUrls.has(artist.id) && artist.images && artist.images.length > 0 && artist.images[0].url) {
            artistImageUrls.set(artist.id, artist.images[0].url);
          }
        }
        for (let i = 0; i < rows.length; i++) {
          if (rows[i][12] && artistImageUrls.get(rows[i][12])) {
            rows[i][14] = artistImageUrls.get(rows[i][12]);
          }
        }
      }
    }

    // Sort by descending played at date
    rows.sort((l, r) => l[0] - r[0]);
    // Logger.log('scrape trying to insert rows: ' + JSON.stringify(rows));
    const valuesRange = s.getRange(lastRow + 1, 1, rows.length, headers.length);
    valuesRange.setValues(rows);
    const dateRange = s.getRange(lastRow + 1, 1, rows.length, 1);
    dateRange.setNumberFormat('yyyy/MM/dd hh:mm:ss');
    Logger.log('scrape inserted ' + rows.length + ' tracks');
  }

  // Update properties
  Logger.log('scrape ScrapeAfter set to ' + res.cursors.after);
  props.setProperty('ScrapeAfter', res.cursors.after);
}
