var FOLDER_NAME = 'AI Tracker Photos';
var MAX_B64 = 12 * 1024 * 1024;

function doGet() {
  return out_({ ok: true, service: 'ai-tracker-photo-sync' });
}

function doPost(e) {
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var key = PropertiesService.getScriptProperties().getProperty('ACCESS_KEY');
    if (!key) return out_({ ok: false, error: 'ACCESS_KEY script property is not set' });
    if (req.key !== key) return out_({ ok: false, error: 'Invalid access key' });
    switch (req.action) {
      case 'ping': return out_({ ok: true, count: listMeta_().length });
      case 'list': return out_({ ok: true, photos: listMeta_() });
      case 'upload': return out_(upload_(req));
      case 'get': return out_(get_(req));
      case 'delete': return out_(remove_(req));
      default: return out_({ ok: false, error: 'Unknown action' });
    }
  } catch (err) {
    return out_({ ok: false, error: String(err && err.message || err) });
  }
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function folder_() {
  var it = DriveApp.getFoldersByName(FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
}

function validId_(id) {
  return typeof id === 'string' && /^[a-z0-9]{6,40}$/i.test(id);
}

function find_(f, name) {
  var it = f.getFilesByName(name);
  return it.hasNext() ? it.next() : null;
}

function listMeta_() {
  var f = folder_(), it = f.getFiles(), res = [];
  while (it.hasNext()) {
    var file = it.next(), n = file.getName();
    if (!/_full\.jpg$/.test(n)) continue;
    try {
      var m = JSON.parse(file.getDescription() || '{}');
      if (m && m.id) res.push(m);
    } catch (e) {}
  }
  return res;
}

function upload_(req) {
  var m = req.meta || {};
  if (!validId_(m.id)) return { ok: false, error: 'Invalid photo id' };
  if (typeof m.owner !== 'string' || !/^[iu]:\d+$/.test(m.owner)) return { ok: false, error: 'Invalid owner' };
  if (!req.full || req.full.length > MAX_B64) return { ok: false, error: 'Photo is missing or too large' };
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var f = folder_();
    if (find_(f, m.id + '_full.jpg')) return { ok: true, existed: true };
    var meta = {
      id: m.id, owner: m.owner, name: String(m.name || 'photo.jpg').slice(0, 120),
      mime: 'image/jpeg', w: +m.w || 0, h: +m.h || 0, bytes: +m.bytes || 0, created: String(m.created || new Date().toISOString())
    };
    var full = f.createFile(Utilities.newBlob(Utilities.base64Decode(req.full), 'image/jpeg', m.id + '_full.jpg'));
    full.setDescription(JSON.stringify(meta));
    if (req.thumb && req.thumb.length <= MAX_B64) {
      f.createFile(Utilities.newBlob(Utilities.base64Decode(req.thumb), 'image/jpeg', m.id + '_thumb.jpg'));
    }
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function get_(req) {
  if (!validId_(req.id)) return { ok: false, error: 'Invalid photo id' };
  var f = folder_();
  var file = (req.variant === 'thumb' && find_(f, req.id + '_thumb.jpg')) || find_(f, req.id + '_full.jpg');
  if (!file) return { ok: false, error: 'Photo not found' };
  return { ok: true, mime: 'image/jpeg', data: Utilities.base64Encode(file.getBlob().getBytes()) };
}

function remove_(req) {
  if (!validId_(req.id)) return { ok: false, error: 'Invalid photo id' };
  var f = folder_();
  ['_full.jpg', '_thumb.jpg'].forEach(function (s) {
    var it = f.getFilesByName(req.id + s);
    while (it.hasNext()) it.next().setTrashed(true);
  });
  return { ok: true };
}
