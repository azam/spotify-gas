// Run auth() if authentication breaks

const SCOPE_READ = [
  'user-read-email',
  'user-read-private',
  'user-read-recently-played',
  'user-top-read'
];
const SCOPE = SCOPE_READ.join(' ');

const CACHED_PROPS = {};
const CACHED_PROPS_INVALID = [];

function cachedProps(key) {
  if (key && CACHED_PROPS_INVALID.indexOf(key) < 0) {
    const cached = CACHED_PROPS[key];
    if (cached !== undefined) {
      return cached;
    }
    const value = PropertiesService.getScriptProperties().getProperty(key);
    if (value !== undefined) {
      CACHED_PROPS[key] = value;
      return value;
    } else {
      CACHED_PROPS_INVALID.push(key);
    }
  }
  return undefined;
}

function getService() {
  return OAuth2.createService('Spotify')
    .setAuthorizationBaseUrl('https://accounts.spotify.com/authorize')
    .setTokenUrl('https://accounts.spotify.com/api/token')
    .setClientId(cachedProps('ClientId'))
    .setClientSecret(cachedProps('ClientSecret'))
    .setCallbackFunction('authCallback')
    .setPropertyStore(PropertiesService.getUserProperties())
    .setCache(CacheService.getUserCache())
    .setLock(LockService.getUserLock())
    .setScope(SCOPE_READ)
    .setParam('show_dialog', 'false')
    ;
}

function authCallback(request) {
  const isAuthorized = getService().handleCallback(request);
  if (isAuthorized) {
    console.log('Authorization successful');
    return HtmlService.createHtmlOutput('Success!');
  } else {
    console.error('Authorization failed', request);
    return HtmlService.createHtmlOutput('Failed!');
  }
}

function authLogout() {
  getService().reset();
  console.log('Logged out');
}

function auth() {
  const service = getService();
  if (service.hasAccess()) {
    console.log('Already has access');
  } else {
    const authUrl = service.getAuthorizationUrl();
    console.log('authUrl', authUrl);
    // const template = HtmlService.createTemplate('<a href="<?= authUrl ?>" target="_blank">Authorize</a>');
    // template.authUrl = authUrl;
    // const page = template.evaluate();
    // console.log('Trying to authorize', page);
    // return HtmlService.createHtmlOutput(page.toString());
  }
}

function auth() {
  const service = getService();
  if (service.hasAccess()) {
    console.log('Already has access');
  } else {
    const authUrl = service.getAuthorizationUrl();
    console.log('authUrl', authUrl);
    // const template = HtmlService.createTemplate('<a href="<?= authUrl ?>" target="_blank">Authorize</a>');
    // template.authUrl = authUrl;
    // const page = template.evaluate();
    // console.log('Trying to authorize', page);
    // return HtmlService.createHtmlOutput(page.toString());
  }
}

function authRefresh() {
  try {
    getService().refresh();
    console.log('authRefresh', Date.now());
  } catch (e) {
    console.error(e);
  }
}

function fetchOptions() {
  let headers = {
    'Authorization': 'Bearer ' + getService().getAccessToken(),
  };
  const lang = cachedProps('ClientLanguage');
  if (lang) {
    headers['Accept-Language'] = lang + ';q=1';
  }
  return {
    headers: headers,
    muteHttpExceptions: true,
  };
}

function addQuery(url, params) {
  if (params) {
    const encodedParams = Object.entries(params).flatMap(
      ([k, v]) =>
        Array.isArray(v) ?
          v.map(e => e === undefined || e === null ? '' : encodeURIComponent(k) + '=' + encodeURIComponent(e)) :
          (v === undefined || v === null ? '' : encodeURIComponent(k) + '=' + encodeURIComponent(v))
    ).filter(s => s ? true : false).join('&');
    return encodedParams ? url + '?' + encodedParams : url;
  }
  return url;
}

function getApi(url, params) {
  try {
    const reqUrl = addQuery(url, params);
    console.info('getApi', reqUrl);
    const res = UrlFetchApp.fetch(reqUrl, fetchOptions());
    const body = res.getContentText();
    // console.info(body);
    return JSON.parse(body);
  } catch (err) {
    console.error(err);
    return {
      error: err.getMessage()
    };
  }
}

// Player API

function getPlayerRecentlyPlayed(limit = 2, after, before) {
  const obj = getApi('https://api.spotify.com/v1/me/player/recently-played', {limit: limit, after: after, before: before});
  // console.info('getPlayerRecentlyPlayed', obj);
  // console.info('getPlayerRecentlyPlayed', obj.items[0]);
  // console.info('track', obj.items[0].track);
  // console.info('album', obj.items[0].track.album);
  console.info('artists[0]', obj.items[0].track.artists[0]);
  // console.info('items[0]', Object.keys(obj.items[0]));
  // console.info('items[0].track', Object.keys(obj.items[0].track));
  return obj;
}

// 0.1gosan artist 7J9Vd5nGHVxHx8dF9YkaF0
// 0.1gosan track 有害メンヘラドール 0w1g4FM3GrFOHUZw8yhcDC
// 0.1gosan album 平成誤算大全 1HAvGLrgCHm8H3cwXZmx7o

function getArtist(id = '2WuSkFU5n4g06N4L7tYB4U') {
  const obj = getApi('https://api.spotify.com/v1/artists/' + id);
  console.log('getArtist', obj);
  return obj;
}

function getArtists(ids = ['1Yox196W7bzVNZI7RBaPnf', '7J9Vd5nGHVxHx8dF9YkaF0']) {
  const obj = getApi('https://api.spotify.com/v1/artists', { ids: Array.from(ids).join(',')});
  console.log('getArtist', obj);
  return obj;
}

function getAlbum(id) {
  const obj = getApi('https://api.spotify.com/v1/albums/' + id);
  // console.log('getArtist', obj);
  return obj;
}

function getTrack(id) {
  const obj = getApi('https://api.spotify.com/v1/tracks/' + id);
  // console.log('getTrack', obj);
  return obj;
}
