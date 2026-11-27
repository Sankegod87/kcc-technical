// Google Drive upload folders for tech requests. Pure fetch, no extra packages.
// The server's own Google account (the default Cloud Functions service account) makes a subfolder inside the
// KCC Tech Requests folder for every new request, and turns on "anyone with the link can add files" for that
// subfolder only. One-time setup is in SETUP-DRIVE.md.
const MD = 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/';
const SCOPE = 'https://www.googleapis.com/auth/drive';
let cached = null;

async function getToken(fetchFn) {
  if (cached && cached.exp > Date.now() + 120000) return cached.token;
  const h = { 'Metadata-Flavor': 'Google' };
  const email = (await (await fetchFn(MD + 'email', { headers: h })).text()).trim();
  const base = await (await fetchFn(MD + 'token', { headers: h })).json();
  if (!email || !base || !base.access_token) throw new Error('No server identity');
  const res = await fetchFn('https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/' + encodeURIComponent(email) + ':generateAccessToken', {
    method: 'POST', headers: { Authorization: 'Bearer ' + base.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify({ scope: [SCOPE] }) });
  if (!res.ok) throw new Error('Token ' + res.status);
  const j = await res.json();
  cached = { token: j.accessToken, exp: j.expireTime ? Date.parse(j.expireTime) : Date.now() + 3000000 };
  return cached.token;
}

async function createFolder({ name, rootId, fetchFn }) {
  const f = fetchFn || fetch;
  if (!rootId) return null;
  const token = await getToken(f);
  const auth = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
  const r = await f('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id,webViewLink', {
    method: 'POST', headers: auth, body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [rootId] }) });
  if (!r.ok) throw new Error('Drive create ' + r.status);
  const file = await r.json();
  let shared = true;
  const p = await f('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(file.id) + '/permissions?supportsAllDrives=true', {
    method: 'POST', headers: auth, body: JSON.stringify({ type: 'anyone', role: 'writer', allowFileDiscovery: false }) });
  if (!p.ok) shared = false;
  return { id: file.id, url: file.webViewLink || ('https://drive.google.com/drive/folders/' + file.id), shared };
}

// Starts a Google resumable upload inside one request folder; the browser then sends the file straight to Google.
async function startUpload({ folderId, name, size, type, origin, fetchFn }) {
  const f = fetchFn || fetch;
  const token = await getToken(f);
  const h = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Length': String(size) };
  if (type) h['X-Upload-Content-Type'] = type;
  if (origin) h.Origin = origin;
  const r = await f('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id', { method: 'POST', headers: h, body: JSON.stringify({ name, parents: [folderId] }) });
  if (!r.ok) throw new Error('Drive upload ' + r.status);
  const loc = r.headers && r.headers.get ? r.headers.get('location') : '';
  if (!loc) throw new Error('No upload address');
  return { url: loc };
}

module.exports = { createFolder, startUpload, getToken, _reset() { cached = null; } };
