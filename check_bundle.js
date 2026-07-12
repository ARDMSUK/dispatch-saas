const https = require('https');
const get = (url) => new Promise((resolve) => {
  https.get(url, (res) => {
    let d = ''; res.on('data', c => d+=c); res.on('end', () => resolve(d));
  });
});
(async () => {
  const html = await get('https://app.cabai.co.uk/login');
  const scripts = [...html.matchAll(/<script src="(\/_next\/static\/chunks\/[a-zA-Z0-9-]+\.js)"/g)].map(m => m[1]);
  for (const src of scripts) {
    const js = await get('https://app.cabai.co.uk' + src);
    if (js.includes('ynhnlsrylhrpyoqglpvc')) {
      console.log('Found ynhnls... in', src);
      const match = js.match(/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g);
      if (match) console.log('Keys:', match);
    }
  }
})();
