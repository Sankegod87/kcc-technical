const assert = require('assert'); const d = require('../kcc-drive.js');
(async () => {
  const calls = [];
  const fetchFn = async (u, o) => { calls.push([u, o && o.method, o && o.body]);
    const R = (j, ok = true) => ({ ok, status: ok ? 200 : 500, json: async () => j, text: async () => (typeof j === 'string' ? j : JSON.stringify(j)) });
    if (u.endsWith('/email')) return R('sa@x.iam.gserviceaccount.com');
    if (u.endsWith('/token')) return R({ access_token: 'base' });
    if (u.includes(':generateAccessToken')) return R({ accessToken: 'tok', expireTime: new Date(Date.now() + 3600000).toISOString() });
    if (u.includes('/permissions')) return R({ id: 'p' });
    return R({ id: 'FID', webViewLink: 'https://drive.google.com/drive/folders/FID' }); };
  d._reset();
  const r = await d.createFolder({ name: 'R1 Youth', rootId: 'ROOT', fetchFn });
  assert.deepStrictEqual([r.id, r.shared], ['FID', true]);
  assert.ok(JSON.parse(calls.find(c => /\/files\?/.test(c[0]))[2]).parents[0] === 'ROOT');
  assert.ok(JSON.parse(calls.find(c => /permissions/.test(c[0]))[2]).type === 'anyone');
  assert.strictEqual(await d.createFolder({ name: 'x', rootId: '', fetchFn }), null);
  console.log('ok drive folder');
})().catch(e => { console.error(e); process.exit(1); });
