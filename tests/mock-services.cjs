// Test-only stand-in for the Stripe and Resend HTTP APIs and for Airbnb/Vrbo iCal feeds (port 12111).
// Run: node tests/mock-services.cjs
const http = require('http');
const log = [];
let failNext = null;
const feeds = {};
http.createServer((req, res) => {
  let body = '';
  req.on('data', d => body += d);
  req.on('end', () => {
    const send = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
    if (req.url === '/log') return send(200, log);
    if (req.url.startsWith('/set-feed/')) { feeds[req.url.split('/')[2]] = JSON.parse(body); return send(200, {}); }
    if (req.url.startsWith('/feed/')) { const f = feeds[req.url.split('/')[2].replace('.ics','')]; if (!f) return send(404, {}); res.writeHead(f.status || 200, { 'Content-Type': f.type || 'text/calendar' }); return res.end(f.body); }
    if (req.url === '/reset') { log.length = 0; failNext = null; return send(200, {}); }
    if (req.url.startsWith('/fail-next/')) { failNext = req.url.split('/')[2]; return send(200, {}); }
    const params = Object.fromEntries(new URLSearchParams(body));
    let entry = { method: req.method, url: req.url, params };
    if (req.url === '/emails') { entry.json = JSON.parse(body); delete entry.params; log.push(entry); return send(200, { id: 'email_' + log.length }); }
    log.push(entry);
    if (failNext && req.url.includes(failNext)) { failNext = null; return send(500, { error: { message: 'mock failure', type: 'api_error' } }); }
    if (req.url === '/v1/checkout/sessions') {
      const id = 'cs_test_' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      return send(200, { id, object: 'checkout.session', url: `http://localhost:12111/pay/${id}`, status: 'open' });
    }
    if (/\/v1\/checkout\/sessions\/.+\/expire/.test(req.url)) return send(200, { id: req.url.split('/')[4], object: 'checkout.session', status: 'expired' });
    if (req.url === '/v1/refunds') return send(200, { id: 're_test_' + log.length, object: 'refund', status: 'succeeded' });
    if (req.url.startsWith('/pay/')) { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end('<h1>Mock Stripe Checkout</h1>'); }
    send(404, { error: { message: 'not mocked: ' + req.url } });
  });
}).listen(12111, () => console.log('mock on 12111'));
