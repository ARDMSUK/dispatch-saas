const https = require('https');
const get = (url) => new Promise((resolve) => {
  https.get(url, (res) => {
    let d = ''; res.on('data', c => d+=c); res.on('end', () => resolve(d));
  }).on('error', () => resolve(''));
});
(async () => {
  const html = await get('https://app.cabai.co.uk/login');
  const scripts = [...html.matchAll(/<script src="(\/_next\/static\/chunks\/[a-zA-Z0-9-]+\.js)"/g)].map(m => m[1]);
  for (const src of scripts) {
    const js = await get('https://app.cabai.co.uk' + src);
    if (js.includes('ynhnlsrylhrpyoqglpvc')) {
      console.log('Found new project ref in', src);
    }
    if (js.includes('zrvtlhwxdhsskwuqstbj')) {
      console.log('Found old project ref in', src);
    }
    const match = js.match(/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g);
    if (match) {
        console.log('Found JWT in', src, match);
    }
  }
})();
