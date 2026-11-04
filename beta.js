// miter-grove / beta.js — internal catalog adapter
// Source id: mg-beta

var SOURCE_ID = (typeof __SOURCE_ID !== 'undefined' && __SOURCE_ID) ? String(__SOURCE_ID) : 'mg-beta';
var JR = 'https://javranking.cc';
var JR_LANG = 'en';
var POSTER_TPL = 'https://fourhoi.com/{code}/cover-n.jpg';


// ── shared stream / torrent / subtitle helpers ─────────────────────────────
var PLAYER_HOSTS = ['https://javplaypro.cc', 'https://javplayer.cc'];
var JABLE_HOSTS = ['https://jable01.net', 'https://jable666.net', 'https://jable.sbs'];
var MISSAV_HOSTS = ['https://missav.ws', 'https://missav.ai', 'https://missav.live', 'https://missav.fans'];
var JAVMENU_HOSTS = ['https://javmenu.com', 'https://javmenu.org'];
var AVSUB_HOST = 'https://www.avsubtitles.com';
// 7 most spoken languages (+ common JAV sub variants)
var AVSUB_LANGS = ['en', 'zh', 'zh-cn', 'zh-tw', 'hi', 'es', 'fr', 'ar', 'pt', 'bn', 'ru', 'id', 'th', 'vi', 'ko', 'ja'];
var SUKEBEI = 'https://sukebei.nyaa.si';
var PROJECTJAV = 'https://projectjav.com';
var ZEROMAGNET = 'https://0magnet.com';
var SITE_123 = 'https://123av.com';
var UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
var BLOCK_PAT = /(loli|lolita|underage|child(?:ren)?|kids?|elementary\s*school|primary\s*school|junior\s*high|middle\s*school|未成年|小学生|中学生|幼女|萝莉|儿童|ロリ|ショタ|shota|lolicon)/i;

function _text(s) {
  if (typeof htmlText === 'function') return htmlText(s || '');
  return String(s || '').replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
    .replace(/&#(\d+);/g, function (_, n) { return String.fromCodePoint(+n); })
    .replace(/&#x([0-9a-f]+);/gi, function (_, n) { return String.fromCodePoint(parseInt(n, 16)); })
    .replace(/\s+/g, ' ').trim();
}
function _abs(href, base) {
  if (typeof absUrl === 'function') return absUrl(href, base);
  if (!href) return '';
  if (/^https?:\/\//i.test(href)) return href;
  if (href.indexOf('//') === 0) return 'https:' + href;
  var root = (base || '').replace(/\/$/, '');
  if (href.charAt(0) === '/') {
    var m = root.match(/^(https?:\/\/[^/]+)/i);
    return m ? m[1] + href : href;
  }
  return root + '/' + href;
}
function _get(url, referer, timeoutMs) {
  // Zangetsu harness: fetch() resolves to { body, status, ... } — use r.body (not r.text())
  var headers = {
    'User-Agent': UA,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,zh;q=0.8,es;q=0.7',
  };
  if (referer) headers['Referer'] = referer;
  return fetch(url, { headers: headers }).then(function (r) {
    if (!r) return '';
    if (r.body != null && r.body !== '') return String(r.body);
    if (typeof r.text === 'function') {
      return r.text().then(function (t) { return t || ''; }).catch(function () { return ''; });
    }
    return '';
  }).catch(function () { return ''; });
}
function _getJson(url, referer, method, body) {
  // Zangetsu harness returns body as string on the response object
  var headers = {
    'User-Agent': UA,
    'Accept': 'application/json, text/plain, */*',
    'X-Requested-With': 'XMLHttpRequest',
  };
  if (referer) headers['Referer'] = referer;
  if (body) headers['Content-Type'] = 'application/json';
  var opts = { headers: headers, method: method || 'GET' };
  if (body) opts.body = body;
  return fetch(url, opts).then(function (r) {
    if (!r) return null;
    var raw = '';
    if (r.body != null) raw = String(r.body);
    else if (typeof r.text === 'function') {
      return r.text().then(function (t) {
        try { return JSON.parse(t || ''); } catch (e) { return null; }
      }).catch(function () { return null; });
    }
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }).catch(function () { return null; });
}
function codeOf(slug) {
  var s = String(slug || '').toLowerCase();
  var fc2 = s.match(/(?:^|[^a-z0-9])fc2[-_ ]?(?:ppv[-_ ]?)?(\d{5,8})(?![0-9])/);
  if (fc2) return 'fc2-' + fc2[1];
  var m = s.match(/^([a-z0-9]{2,12}?-\d{2,6})/i) || s.match(/\b([a-z]{2,10}-\d{2,6})\b/i);
  return (m ? m[1] : s).toLowerCase();
}
function blocked(title) { return BLOCK_PAT.test(String(title || '')); }
function qualityOf(title) {
  var t = String(title || '');
  if (/\b(2160p|4k|uhd)\b/i.test(t)) return '2160p';
  if (/\b1080p\b/i.test(t)) return '1080p';
  if (/\b720p\b/i.test(t)) return '720p';
  if (/\b(fhd|hd)\b/i.test(t)) return 'HD';
  return 'SD';
}
function findStreamUrl(obj, depth) {
  if (!obj || (depth || 0) > 6) return '';
  if (typeof obj === 'string') return /^(https?:)?\/\/.+\.(m3u8|mp4)(\?|$)/i.test(obj) ? obj : '';
  if (Array.isArray(obj)) {
    for (var i = 0; i < obj.length; i++) { var r = findStreamUrl(obj[i], (depth || 0) + 1); if (r) return r; }
    return '';
  }
  if (typeof obj === 'object') {
    if (typeof obj.stream === 'string' && obj.stream) return obj.stream;
    if (typeof obj.file === 'string' && obj.file) return obj.file;
    if (typeof obj.src === 'string' && obj.src) return obj.src;
    var keys = Object.keys(obj);
    for (var k = 0; k < keys.length; k++) { var rr = findStreamUrl(obj[keys[k]], (depth || 0) + 1); if (rr) return rr; }
  }
  return '';
}
function scanPageForStream(pageUrl, referer) {
  return _get(pageUrl, referer).then(function (page) {
    if (!page) return '';
    var flat = page.replace(/\\\//g, '/').replace(/\\u0026/g, '&');
    var m = flat.match(/https?:\/\/[^"'\s<>\\]+\.(?:m3u8|mp4)[^"'\s<>\\]*/i);
    return m ? m[0] : '';
  });
}
function extractPlayerHash(html) {
  if (!html) return '';
  var m = html.match(/player\(\s*['"]([a-f0-9]{8,})['"]/i)
    || html.match(/\/e\/([a-f0-9]{8,})/i)
    || html.match(/data-(?:id|hash)=["']([a-f0-9]{8,})["']/i)
    || html.match(/[?&]id=([a-f0-9]{8,})/i);
  return m ? m[1] : '';
}
function streamFromHash(hash) {
  if (!hash) return Promise.resolve(null);
  var tryHost = function (idx) {
    if (idx >= PLAYER_HOSTS.length) return Promise.resolve(null);
    var o = PLAYER_HOSTS[idx];
    return _getJson(o + '/stream?id=' + hash, o + '/e/' + hash).then(function (data) {
      var u = findStreamUrl(data);
      if (u) {
        if (u.indexOf('//') === 0) u = 'https:' + u;
        if (u.charAt(0) === '/') u = o + u;
        return { url: u, referer: o + '/', label: '123AV player' };
      }
      return scanPageForStream(o + '/e/' + hash, SITE_123 + '/').then(function (u2) {
        if (u2) return { url: u2, referer: o + '/', label: '123AV embed' };
        return tryHost(idx + 1);
      });
    }).catch(function () { return tryHost(idx + 1); });
  };
  return tryHost(0);
}
function streamByCode123(slug) {
  var tryHost = function (idx) {
    if (idx >= PLAYER_HOSTS.length) return Promise.resolve(null);
    var o = PLAYER_HOSTS[idx];
    return scanPageForStream(o + '/' + slug, SITE_123 + '/').then(function (u) {
      if (u) return { url: u, referer: o + '/', label: '123AV by code' };
      return tryHost(idx + 1);
    });
  };
  return tryHost(0);
}
function stream123(slug) {
  // Live 123AV detail → player(JSON.parse('[...]')) → embed host /stream?id=HASH → m3u8
  return _get(SITE_123 + '/en/v/' + slug, SITE_123 + '/').then(function (html) {
    if (!html) return streamByCode123(slug);
    var embeds = [];
    // player(JSON.parse('[{...url...}]'))
    var m = html.match(/player\(JSON\.parse\('((?:\\.|[^'])*)'\)/);
    if (m) {
      try {
        var raw = m[1]
          .replace(/\\u0022/g, '"')
          .replace(/\\u0027/g, "'")
          .replace(/\\\//g, '/')
          .replace(/\\\\/g, '\\');
        // after replacing unicode quotes, string should be JSON
        var data = JSON.parse(raw);
        if (Array.isArray(data)) {
          for (var i = 0; i < data.length; i++) {
            if (data[i] && data[i].url) embeds.push(String(data[i].url).split('?')[0]);
          }
        }
      } catch (e) { /* fall through */ }
    }
    // fallback patterns
    if (!embeds.length) {
      var re = /https?:\\\/\\\/([a-z0-9.-]+)\\\/e\\\/([A-Za-z0-9]+)/g;
      var mm;
      while ((mm = re.exec(html)) !== null) {
        embeds.push('https://' + mm[1] + '/e/' + mm[2]);
      }
    }
    if (!embeds.length) {
      var re2 = /https:\/\/([a-z0-9.-]+)\/e\/([A-Za-z0-9]+)/g;
      while ((mm = re2.exec(html.replace(/\\\//g, '/'))) !== null) {
        embeds.push('https://' + mm[1] + '/e/' + mm[2]);
      }
    }
    if (!embeds.length) {
      var hash = extractPlayerHash(html);
      if (hash) return streamFromHash(hash);
      return streamByCode123(slug);
    }
    // unique embeds
    var seen = {}, list = [];
    embeds.forEach(function (u) {
      if (!seen[u]) { seen[u] = 1; list.push(u); }
    });

    var tryEmbed = function (idx) {
      if (idx >= list.length) return streamByCode123(slug);
      var emb = list[idx];
      var host = emb.match(/^(https?:\/\/[^\/]+)/i);
      host = host ? host[1] : '';
      var eid = emb.split('/e/')[1] || '';
      eid = eid.split('?')[0].split('/')[0];
      if (!host || !eid) return tryEmbed(idx + 1);
      return _getJson(host + '/stream?id=' + eid, emb).then(function (data) {
        var u = '';
        if (data) {
          if (data.media && data.media.stream) u = data.media.stream;
          else if (data.stream) u = data.stream;
          else u = findStreamUrl(data);
        }
        if (u) {
          if (u.indexOf('//') === 0) u = 'https:' + u;
          return { url: u, referer: host + '/', label: '123AV' };
        }
        // scan embed page as last resort for this host
        return scanPageForStream(emb, SITE_123 + '/').then(function (u2) {
          if (u2) return { url: u2, referer: host + '/', label: '123AV embed' };
          return tryEmbed(idx + 1);
        });
      }).catch(function () { return tryEmbed(idx + 1); });
    };
    return tryEmbed(0);
  }).catch(function () { return streamByCode123(slug); });
}
function streamJable(code) {
  var tryHost = function (idx) {
    if (idx >= JABLE_HOSTS.length) return Promise.resolve(null);
    var host = JABLE_HOSTS[idx];
    var pageUrl = host + '/videos/' + encodeURIComponent(code) + '/';
    return _get(pageUrl, host + '/').then(function (html) {
      if (!html || html.length < 4000 || /just a moment|cf-chl/i.test(html.slice(0, 1500))) return tryHost(idx + 1);
      var m = html.match(/\bhlsUrl\s*=\s*['"]([^'"]+)['"]/i)
        || html.match(/(['"])(https?:\/\/[^'"]+?\.m3u8(?:\?[^'"]*)?)\1/i);
      var url = m ? (m[2] || m[1] || '').trim() : '';
      if (!url || !/\.m3u8|\/hls\//i.test(url)) return tryHost(idx + 1);
      return { url: url, referer: pageUrl, label: 'Jable' };
    }).catch(function () { return tryHost(idx + 1); });
  };
  return tryHost(0);
}
function streamMissav(code) {
  var paths = ['/en/' + code, '/en/' + code + '-uncensored-leak', '/en/' + code + '-english-subtitle', '/en/' + code + '-chinese-subtitle'];
  var tryOne = function (hi, pi) {
    if (hi >= MISSAV_HOSTS.length) return Promise.resolve(null);
    if (pi >= paths.length) return tryOne(hi + 1, 0);
    var url = MISSAV_HOSTS[hi] + paths[pi];
    return _get(url, MISSAV_HOSTS[hi] + '/').then(function (html) {
      if (!html || html.length < 800) return tryOne(hi, pi + 1);
      var flat = html.replace(/\\\//g, '/');
      var m = flat.match(/\bsource\s*=\s*[\\'"]*(https?:\/\/[^'\\";\s]+\.m3u8[^'\\";\s]*)/i)
        || flat.match(/https?:\/\/[^"'\s<>\\]+\.m3u8[^"'\s<>\\]*/i);
      if (m) {
        var u = (m[1] || m[0]).replace(/\\/g, '');
        return { url: u, referer: MISSAV_HOSTS[hi] + '/', label: 'MissAV' };
      }
      return tryOne(hi, pi + 1);
    }).catch(function () { return tryOne(hi, pi + 1); });
  };
  return tryOne(0, 0);
}
function streamJavmenu(code) {
  var slug = String(code || '').toLowerCase().trim();
  if (!slug) return Promise.resolve([]);
  var tryHost = function (hi) {
    if (hi >= JAVMENU_HOSTS.length) return Promise.resolve([]);
    var host = JAVMENU_HOSTS[hi];
    var candidates = [host + '/en/' + slug, host + '/en/censored/' + slug, host + '/en/uncensored/' + slug, host + '/zh/' + slug, host + '/en/search?wd=' + encodeURIComponent(code)];
    var tryUrl = function (ui) {
      if (ui >= candidates.length) return tryHost(hi + 1);
      return _get(candidates[ui], host + '/').then(function (html) {
        if (!html || html.length < 3000) return tryUrl(ui + 1);
        if (/just a moment|cf-chl/i.test(html.slice(0, 1500))) return tryUrl(ui + 1);
        var title = ((html.match(/<title>([^<]+)/i) || [])[1] || '').toLowerCase();
        if (/you may like|猜你喜欢/i.test(title) && title.indexOf(slug) < 0) return tryUrl(ui + 1);
        // follow search hit
        if (/\/search\?/i.test(candidates[ui])) {
          var re = new RegExp('href=["\']([^"\']*' + slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^"\']*)["\']', 'i');
          var hm = html.match(re);
          if (!hm) return tryUrl(ui + 1);
          var next = hm[1];
          if (next.indexOf('http') !== 0) next = host + (next.charAt(0) === '/' ? next : '/' + next);
          if (/\/search/i.test(next)) return tryUrl(ui + 1);
          return _get(next, candidates[ui]).then(function (html2) {
            if (!html2) return tryUrl(ui + 1);
            return parseJavmenuPage(html2, next);
          });
        }
        return parseJavmenuPage(html, candidates[ui]);
      }).catch(function () { return tryUrl(ui + 1); });
    };
    return tryUrl(0);
  };
  return tryHost(0);
}
function parseJavmenuPage(html, detail) {
  var results = [];
  var seen = {};
  var add = function (u, kind) {
    u = String(u || '').trim().replace(/&amp;/g, '&');
    if (!u || seen[u]) return;
    if (/doubleclick|googlesyndication|analytics|banner/i.test(u)) return;
    if (kind === 'http' && !/\.m3u8|\.mp4|\.mpd/i.test(u)) return;
    seen[u] = 1;
    if (u.indexOf('//') === 0) u = 'https:' + u;
    results.push({ url: u, referer: detail, label: kind === 'magnet' ? 'JavMenu · torrent' : 'JavMenu', container: kind === 'magnet' ? 'torrent' : undefined });
  };
  var m, re = /data-m3u8=["']([^"']+)["']/gi;
  while ((m = re.exec(html)) !== null) add(m[1], 'http');
  re = /https?:\/\/[^"'\\\s<>]+?\.(?:m3u8|mp4)[^"'\\\s<>]*/gi;
  while ((m = re.exec(html)) !== null) add(m[0], 'http');
  re = /magnet:\?[^"'\\\s<>]+/gi;
  while ((m = re.exec(html)) !== null && results.length < 16) add(m[0], 'magnet');
  return results;
}
function magnetsFromHtml(html, code, label) {
  var out = [], seen = {};
  if (!html) return out;
  var want = String(code || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  var re = /magnet:\?[^\s"'<>)\]\\]+/gi;
  var m;
  while ((m = re.exec(html)) !== null && out.length < 10) {
    var magnet = m[0].replace(/&amp;/g, '&');
    var ih = (magnet.match(/btih:([a-fA-F0-9]{40})/i) || magnet.match(/btih:([a-zA-Z0-9]{32})/i) || [])[1];
    if (!ih || seen[ih.toLowerCase()]) continue;
    var dn = '';
    try { dn = decodeURIComponent(((magnet.match(/[?&]dn=([^&]+)/) || [])[1] || '').replace(/\+/g, ' ')); } catch (e) { dn = ''; }
    if (want && dn) {
      var hay = (dn + magnet).toLowerCase().replace(/[^a-z0-9]/g, '');
      if (hay.indexOf(want) < 0) continue;
    }
    if (blocked(dn)) continue;
    seen[ih.toLowerCase()] = 1;
    out.push({
      url: magnet, quality: qualityOf(dn), container: 'torrent', kind: 'sub',
      headers: {}, subtitles: [], label: (label || 'Torrent') + ' · ' + qualityOf(dn),
    });
  }
  return out;
}
function torrentSukebei(code) {
  return _get(SUKEBEI + '/?f=0&c=0_0&q=' + encodeURIComponent(code), SUKEBEI + '/').then(function (html) {
    return magnetsFromHtml(html, code, 'Sukebei');
  }).catch(function () { return []; });
}
function torrentProjectJav(code) {
  return _get(PROJECTJAV + '/?searchTerm=' + encodeURIComponent(code), PROJECTJAV + '/').then(function (html) {
    return magnetsFromHtml(html, code, 'ProjectJAV');
  }).catch(function () { return []; });
}
function torrentZeromagnet(code) {
  return _get(ZEROMAGNET + '/search?q=' + encodeURIComponent(code), ZEROMAGNET + '/').then(function (html) {
    if (!html) return [];
    var links = [], seen = {}, m, re = /href=["'](\/![A-Za-z0-9]+)["']/g;
    while ((m = re.exec(html)) !== null && links.length < 6) {
      if (seen[m[1]]) continue;
      seen[m[1]] = 1;
      links.push(ZEROMAGNET + m[1]);
    }
    var out = [];
    var chain = Promise.resolve();
    links.forEach(function (pageUrl) {
      chain = chain.then(function () {
        if (out.length >= 6) return;
        return _get(pageUrl, ZEROMAGNET + '/').then(function (page) {
          var part = magnetsFromHtml(page, code, '0Magnet');
          for (var i = 0; i < part.length; i++) out.push(part[i]);
        });
      });
    });
    return chain.then(function () { return out; });
  }).catch(function () { return []; });
}
function findSubtitles(code) {
  var key = String(code || '').toLowerCase();
  if (!key) return Promise.resolve([]);
  return _get(AVSUB_HOST + '/?s=' + encodeURIComponent(code), AVSUB_HOST + '/').then(function (html) {
    if (!html) return [];
    var movies = [], m, re = /href=["'](\/movie(?:\/|\d+)[^"']+)["']/gi;
    while ((m = re.exec(html)) !== null) {
      var path = m[1];
      if (path.toLowerCase().indexOf(key.replace(/-/g, '')) >= 0 || path.toLowerCase().indexOf(key) >= 0)
        movies.push(AVSUB_HOST + path.split('#')[0]);
    }
    movies = movies.filter(function (v, i, a) { return a.indexOf(v) === i; }).slice(0, 4);
    var out = [];
    var chain = Promise.resolve();
    movies.forEach(function (movieUrl) {
      chain = chain.then(function () {
        if (out.length >= 12) return;
        return _get(movieUrl, AVSUB_HOST + '/').then(function (page) {
          if (!page) return;
          var re2 = /href=["'](\/subtitles\/([a-z-]+)\/(\d+)[^"']*)["']/gi;
          var mm;
          var subJobs = [];
          while ((mm = re2.exec(page)) !== null && subJobs.length < 10) {
            var lang = String(mm[2] || '').toLowerCase();
            var langBase = lang.split('-')[0];
            if (AVSUB_LANGS.indexOf(lang) < 0 && AVSUB_LANGS.indexOf(langBase) < 0) continue;
            subJobs.push({ lang: lang, path: mm[1] });
          }
          var c2 = Promise.resolve();
          subJobs.forEach(function (job) {
            c2 = c2.then(function () {
              if (out.length >= 12) return;
              return _get(AVSUB_HOST + job.path.split('#')[0], movieUrl).then(function (subHtml) {
                if (!subHtml) return;
                var dl = ((subHtml.match(/href=["']([^"']+\.srt[^"']*)["']/i) || [])[1])
                  || ((subHtml.match(/href=["'](\/download\/[^"']+)["']/i) || [])[1]) || '';
                if (dl && !/^https?:\/\//i.test(dl)) dl = AVSUB_HOST + (dl.charAt(0) === '/' ? dl : '/' + dl);
                if (!dl) return;
                out.push({ url: dl, lang: job.lang, label: job.lang.toUpperCase() });
              });
            });
          });
          return c2;
        });
      });
    });
    return chain.then(function () { return out; });
  }).catch(function () { return []; });
}
function toVideoSource(s, subs) {
  if (!s || !s.url) return null;
  var isMag = /^magnet:/i.test(s.url);
  var isHls = /\.m3u8(\?|$)/i.test(s.url);
  return {
    url: s.url,
    quality: s.quality || (isMag ? 'torrent' : 'auto'),
    container: s.container || (isMag ? 'torrent' : (isHls ? 'hls' : 'mp4')),
    kind: 'sub',
    audioLang: 'ja',
    headers: isMag ? {} : { Referer: s.referer || '', 'User-Agent': UA },
    subtitles: subs || [],
    label: s.label || 'stream',
  };
}
/** Collect all HTTPS + torrent + attach subtitles for a product code / slug */
function collectAllSources(code, slug) {
  var sources = [];
  var subs = [];
  var tasks = [];
  var c = code || codeOf(slug) || '';
  var s = slug || c;

  tasks.push(stream123(s).then(function (x) { if (x) sources.push(toVideoSource(x)); }).catch(function () {}));
  if (c) {
    tasks.push(streamJable(c).then(function (x) { if (x) sources.push(toVideoSource(x)); }).catch(function () {}));
    tasks.push(streamMissav(c).then(function (x) { if (x) sources.push(toVideoSource(x)); }).catch(function () {}));
    tasks.push(streamJavmenu(c).then(function (arr) {
      (arr || []).forEach(function (x) { var v = toVideoSource(x); if (v) sources.push(v); });
    }).catch(function () {}));
    tasks.push(torrentSukebei(c).then(function (arr) { arr.forEach(function (x) { sources.push(x); }); }).catch(function () {}));
    tasks.push(torrentProjectJav(c).then(function (arr) { arr.forEach(function (x) { sources.push(x); }); }).catch(function () {}));
    tasks.push(torrentZeromagnet(c).then(function (arr) { arr.forEach(function (x) { sources.push(x); }); }).catch(function () {}));
    tasks.push(findSubtitles(c).then(function (arr) { subs = arr || []; }).catch(function () {}));
  }
  return Promise.all(tasks).then(function () {
    // attach subs to HTTP streams
    var mapped = subs.map(function (t) { return { url: t.url, lang: t.lang, label: t.label || t.lang }; });
    sources.forEach(function (src) {
      if (src && src.container !== 'torrent' && mapped.length) src.subtitles = mapped;
    });
    sources.sort(function (a, b) {
      var sa = a.container === 'torrent' ? 1 : 0;
      var sb = b.container === 'torrent' ? 1 : 0;
      return sa - sb;
    });
    return sources.filter(Boolean);
  });
}


var _rankCache = {}; // slug -> items[]

function getInfo() {
  return {
    name: 'Shelf Beta',
    lang: 'en',
    baseUrl: JR,
    logo: JR + '/favicon.ico',
    type: 'movie',
    version: '1.2.0',
    nsfw: true,
  };
}

function posterFor(code) {
  return POSTER_TPL.replace('{code}', String(code || '').toLowerCase());
}

function parseRankingMd(md) {
  // fallback if HTML scrape fails
  var out = [], seen = {};
  if (!md) return out;
  var re = /\|\s*\d+\s*\|\s*([A-Za-z][A-Za-z0-9]*-\d{2,6})\s*\|\s*([^|\n]{0,250}?)\s*\|\s*\[[^\]]*\]\(([^)]*\/videos\/\d+[^)]*)\)/g;
  var m;
  while ((m = re.exec(md)) !== null) {
    var code = m[1].toLowerCase();
    if (seen[code] || blocked(m[2])) continue;
    seen[code] = 1;
    var title = _text(m[2]) || code.toUpperCase();
    if (title.toUpperCase().indexOf(code.toUpperCase()) !== 0) title = code.toUpperCase() + ' ' + title;
    var vid = (m[3].match(/\/videos\/(\d+)/) || [])[1];
    out.push({
      id: code, title: title.slice(0, 200), englishTitle: title.slice(0, 200),
      cover: posterFor(code), url: 'jr:/' + JR_LANG + '/videos/' + (vid || '') + '/#' + code,
      type: 'movie', sourceId: SOURCE_ID,
    });
  }
  return out;
}

/** Always scrape live ranking HTML (JSON-LD itemListElement). MD only as fallback. */
function scrapeRankingHtml(html, slug) {
  var out = [], seen = {};
  if (!html) return out;
  // 1) JSON-LD ItemList (most reliable on javranking.cc)
  var reLd = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  var lm;
  while ((lm = reLd.exec(html)) !== null) {
    try {
      var data = JSON.parse(lm[1]);
      var elems = data && data.itemListElement;
      if (!Array.isArray(elems)) continue;
      for (var i = 0; i < elems.length; i++) {
        var el = elems[i] || {};
        var name = String(el.name || '');
        var url = String(el.url || '');
        var codeM = name.match(/\b([A-Za-z]{2,10}-\d{2,6})\b/);
        if (!codeM) continue;
        var code = codeM[1].toLowerCase();
        if (seen[code] || blocked(name)) continue;
        seen[code] = 1;
        var vid = (url.match(/\/videos\/(\d+)/) || [])[1] || '';
        var title = _text(name).slice(0, 200);
        out.push({
          id: code, title: title, englishTitle: title,
          cover: posterFor(code),
          url: 'jr:/' + JR_LANG + '/videos/' + vid + '/#' + code,
          type: 'movie', sourceId: SOURCE_ID,
        });
      }
    } catch (e) { /* ignore bad json-ld */ }
  }
  if (out.length) return out;
  // 2) raw anchors / codes in HTML
  var reA = /href="(https?:\/\/javranking\.cc)?(\/en\/videos\/(\d+)\/)"[^>]*>[\s\S]{0,200}?([A-Za-z]{2,10}-\d{2,6})/gi;
  var am;
  while ((am = reA.exec(html)) !== null && out.length < 300) {
    var code2 = am[4].toLowerCase();
    if (seen[code2]) continue;
    seen[code2] = 1;
    out.push({
      id: code2, title: code2.toUpperCase(), englishTitle: code2.toUpperCase(),
      cover: posterFor(code2),
      url: 'jr:/' + JR_LANG + '/videos/' + am[3] + '/#' + code2,
      type: 'movie', sourceId: SOURCE_ID,
    });
  }
  return out;
}

function scrapeHomeHtml(html) {
  var out = [], seen = {};
  if (!html) return out;
  // codes near /en/videos/N/
  var re = /href="(\/en\/videos\/(\d+)\/)"/g;
  var m;
  var positions = [];
  while ((m = re.exec(html)) !== null) {
    positions.push({ vid: m[2], index: m.index, path: m[1] });
  }
  for (var i = 0; i < positions.length && out.length < 40; i++) {
    var p = positions[i];
    if (seen['v' + p.vid]) continue;
    // look around the link for a product code
    var window = html.slice(Math.max(0, p.index - 120), p.index + 400);
    var codeM = window.match(/\b([A-Z]{2,10}-\d{2,6})\b/i);
    var code = codeM ? codeM[1].toLowerCase() : ('vid-' + p.vid);
    if (seen[code]) continue;
    seen[code] = 1;
    seen['v' + p.vid] = 1;
    if (blocked(code)) continue;
    // title guess
    var titleM = window.match(/name["']?\s*:\s*["']([^"']{5,180})["']/i)
      || window.match(/title=["']([^"']{5,180})["']/i);
    var title = titleM ? _text(titleM[1]) : code.toUpperCase();
    out.push({
      id: code, title: title.slice(0, 200), englishTitle: title.slice(0, 200),
      cover: code.indexOf('vid-') === 0 ? null : posterFor(code),
      url: 'jr:' + p.path + '#' + code,
      type: 'movie', sourceId: SOURCE_ID,
    });
  }
  return out;
}

function loadRanking(slug) {
  // Always scrape live HTML first; cache in-memory for the session only.
  if (_rankCache[slug] && _rankCache[slug].length) return Promise.resolve(_rankCache[slug]);
  var htmlUrl = JR + '/' + JR_LANG + '/rankings/' + slug + '/';
  return _get(htmlUrl, JR + '/').then(function (html) {
    var items = scrapeRankingHtml(html, slug);
    if (items.length) {
      _rankCache[slug] = items;
      return items;
    }
    // fallback: markdown mirror of the same ranking
    return _get(JR + '/' + JR_LANG + '/rankings/' + slug + '.md', JR + '/').then(function (md) {
      items = parseRankingMd(md);
      if (items.length) _rankCache[slug] = items;
      return items;
    });
  }).catch(function () {
    return _get(JR + '/' + JR_LANG + '/rankings/' + slug + '.md', JR + '/').then(function (md) {
      var items = parseRankingMd(md);
      if (items.length) _rankCache[slug] = items;
      return items;
    }).catch(function () { return []; });
  });
}

var RANK_LIST = [
  { slug: 'javdb-top250', title: 'JAVDB Top 250' },
  { slug: 'javlibrary-top250', title: 'JAVLibrary Top 250' },
  { slug: 'javdb-uncensored-top250', title: 'JAVDB Uncensored Top 250' },
  { slug: 'javdb-fc2-top250', title: 'JAVDB FC2 Top 250' },
  { slug: 'dmm-weekly', title: 'DMM Weekly' },
];

function getHome(opts) {
  var sections = [];
  // Always scrape live homepage HTML
  var chain = _get(JR + '/' + JR_LANG + '/', JR + '/').then(function (html) {
    var items = scrapeHomeHtml(html);
    if (items.length) sections.push({ title: 'JAV Ranking — Featured', items: items });
  }).catch(function () {});

  RANK_LIST.forEach(function (r) {
    chain = chain.then(function () {
      return loadRanking(r.slug).then(function (items) {
        if (items.length) sections.push({ title: r.title, items: items.slice(0, 50) });
      });
    });
  });

  // live monthly rankings (scrape HTML)
  var now = new Date();
  for (var i = 0; i < 2; i++) {
    (function (ii) {
      var d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - ii, 1));
      var y = d.getUTCFullYear();
      var mo = String(d.getUTCMonth() + 1);
      if (mo.length < 2) mo = '0' + mo;
      var slug = 'dmm-monthly-' + y + '-' + mo;
      chain = chain.then(function () {
        return loadRanking(slug).then(function (items) {
          if (items.length) sections.push({ title: 'DMM Monthly ' + y + '.' + mo, items: items.slice(0, 50) });
        });
      });
    })(i);
  }
  return chain.then(function () { return sections; });
}

function search(query, page, opts) {
  var q = String(query || '').trim();
  if (!q) return Promise.resolve([]);
  var code = codeOf(q);
  // Ensure at least one ranking scraped from the live site
  var ensure = Object.keys(_rankCache).length
    ? Promise.resolve()
    : loadRanking('javdb-top250').then(function () { return loadRanking('javlibrary-top250'); });

  return ensure.then(function () {
    var out = [], seen = {}, ql = q.toLowerCase(), qc = code.replace(/-/g, '');
    Object.keys(_rankCache).forEach(function (slug) {
      (_rankCache[slug] || []).forEach(function (it) {
        var hay = (it.id + ' ' + it.title).toLowerCase();
        if (hay.indexOf(ql) >= 0 || hay.replace(/-/g, '').indexOf(qc) >= 0) {
          if (!seen[it.id]) { seen[it.id] = 1; out.push(it); }
        }
      });
    });
    // also scrape a couple more rankings live if still empty / thin
    var extra = out.length >= 5 ? Promise.resolve() : loadRanking('javdb-uncensored-top250').then(function (items) {
      items.forEach(function (it) {
        var hay = (it.id + ' ' + it.title).toLowerCase();
        if ((hay.indexOf(ql) >= 0 || hay.replace(/-/g, '').indexOf(qc) >= 0) && !seen[it.id]) {
          seen[it.id] = 1; out.push(it);
        }
      });
    });
    return extra.then(function () {
      // broaden with 123AV HTML search
      return _get(SITE_123 + '/en/search?keyword=' + encodeURIComponent(q) + '&page=1', SITE_123 + '/').then(function (html) {
        if (!html) return out;
        var chunks = String(html).split('<div class="card"');
        for (var i = 1; i < chunks.length && out.length < 50; i++) {
          var ch = chunks[i].slice(0, 4000);
          var mUrl = ch.match(/href="([^"]*\/v\/([^/?"]+))/);
          if (!mUrl) continue;
          var slug = mUrl[2];
          if (seen[slug]) continue;
          var mTitle = ch.match(/<h3 class="card__title">\s*<a[^>]*>([\s\S]*?)<\/a>/);
          var title = mTitle ? _text(mTitle[1]) : slug.toUpperCase();
          if (blocked(title)) continue;
          seen[slug] = 1;
          var mPic = ch.match(/<img class="card__img"\s+src="([^"]*)"/);
          out.push({
            id: slug, title: title, englishTitle: title,
            cover: _abs(mPic ? mPic[1] : '', SITE_123), url: slug,
            type: 'movie', sourceId: SOURCE_ID,
          });
        }
        return out;
      }).catch(function () { return out; });
    });
  });
}

function getDetail(url, opts) {
  var raw = String(url || '');
  var code = '';
  var path = raw.replace(/^jr:/, '');
  if (raw.indexOf('#') >= 0) {
    code = raw.split('#')[1].toLowerCase();
    path = path.split('#')[0];
  }
  if (!path.match(/\/videos\/\d+/)) {
    // treat as code/slug
    code = code || codeOf(path) || path.toLowerCase();
    // try find in cache
    var found = null;
    Object.keys(_rankCache).forEach(function (s) {
      (_rankCache[s] || []).forEach(function (it) {
        if (it.id === code) found = it;
      });
    });
    if (found) {
      return Promise.resolve({
        id: found.id, title: found.title, englishTitle: found.title,
        cover: found.cover, url: found.url, status: 'completed',
        type: 'movie', sourceId: SOURCE_ID,
        description: 'Code: ' + found.id.toUpperCase(),
        episodes: [{ id: found.id + ':1', number: 1, title: found.title, url: found.url }],
      });
    }
    return Promise.resolve({
      id: code, title: code.toUpperCase(), type: 'movie', sourceId: SOURCE_ID,
      cover: posterFor(code),
      episodes: [{ id: code + ':1', number: 1, title: code.toUpperCase(), url: code }],
    });
  }
  if (path.indexOf('http') !== 0) path = JR + path;
  return _get(path, JR + '/').then(function (html) {
    var title = _text((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || code || path);
    var cover = (html.match(/property="og:image"\s+content="([^"]+)"/) || [])[1] || null;
    if (!code) {
      var cm = title.match(/\b([A-Z]{2,10}-\d{2,6})\b/i);
      if (cm) code = cm[1].toLowerCase();
    }
    if (!cover && code) cover = posterFor(code);
    return {
      id: code || path, title: title, englishTitle: title, cover: cover,
      url: 'jr:' + path.replace(JR, '') + (code ? '#' + code : ''),
      description: code ? ('Code: ' + code.toUpperCase()) : '',
      status: 'completed', type: 'movie', sourceId: SOURCE_ID,
      episodes: [{ id: (code || '1') + ':1', number: 1, title: title, url: 'jr:' + path.replace(JR, '') + (code ? '#' + code : '') }],
    };
  }).catch(function () {
    return {
      id: code || 'unknown', title: (code || 'unknown').toUpperCase(), type: 'movie', sourceId: SOURCE_ID,
      episodes: [{ id: '1', number: 1, title: (code || '').toUpperCase(), url: raw }],
    };
  });
}

function getEpisodes(url, opts) {
  return getDetail(url, opts).then(function (d) { return (d && d.episodes) || []; });
}

function getVideoSources(episodeUrl, opts) {
  var raw = String(episodeUrl || '');
  var code = '';
  if (raw.indexOf('#') >= 0) code = raw.split('#')[1].toLowerCase();
  code = code || codeOf(raw);
  var path = raw.replace(/^jr:/, '').split('#')[0];
  // JR page magnets first, then full HTTP+torrent suite
  var tasks = [];
  var sources = [];
  if (path.match(/\/videos\/\d+/)) {
    var page = path.indexOf('http') === 0 ? path : (JR + path);
    tasks.push(_get(page, JR + '/').then(function (html) {
      magnetsFromHtml(html, code, 'JAV Ranking').forEach(function (x) { sources.push(x); });
    }).catch(function () {}));
  }
  return Promise.all(tasks).then(function () {
    return collectAllSources(code, code).then(function (more) {
      var seen = {};
      sources.forEach(function (s) { if (s && s.url) seen[s.url] = 1; });
      more.forEach(function (s) {
        if (s && s.url && !seen[s.url]) { seen[s.url] = 1; sources.push(s); }
      });
      return sources;
    });
  });
}
