const https = require('https');
const get = (url) => new Promise((resolve) => {
  https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
    let d = ''; res.on('data', c => d+=c); res.on('end', () => resolve(d));
  }).on('error', () => resolve(''));
});
(async () => {
  const html = await get('https://app.cabai.co.uk/dashboard');
  const scripts = [...html.matchAll(/_next\/static\/chunks\/[a-zA-Z0-9_-]+\.js/g)].map(m => m[0]);
  const uniqueScripts = [...new Set(scripts)];
  for (const src of uniqueScripts) {
    const js = await get('https://app.cabai.co.uk/' + src);
    if (js.includes('ynhnlsrylhrpyoqglpvc')) console.log('Found new project ref in', src);
    if (js.includes('zrvtlhwxdhsskwuqstbj')) console.log('Found old project ref in', src);
    const match = js.match(/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g);
    if (match) console.log('Found JWT in', src, match);
  }
})();
