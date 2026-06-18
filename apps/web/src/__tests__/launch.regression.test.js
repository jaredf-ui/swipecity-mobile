/* eslint-disable */
/**
 * Launch regression check: serve the built app and load it in jsdom to confirm
 * it boots past the ErrorBoundary ("Something went wrong") and renders the UI.
 *
 * Run from repo root:  node apps/web/src/__tests__/launch.regression.test.js
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const BUILD_DIR = path.resolve(__dirname, '../../build');

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.map': 'application/json',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain',
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  let filePath = path.join(BUILD_DIR, urlPath);
  if (urlPath === '/' || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(BUILD_DIR, 'index.html'); // SPA fallback
  }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(0, async () => {
  const port = server.address().port;
  const url = `http://localhost:${port}/`;
  console.log('Launch regression check — serving build at', url);

  try {
    const dom = await JSDOM.fromURL(url, {
      runScripts: 'dangerously',
      resources: 'usable',
      pretendToBeVisual: true,
      beforeParse(window) {
        window.matchMedia = window.matchMedia || (() => ({
          matches: false, addEventListener() {}, removeEventListener() {},
          addListener() {}, removeListener() {},
        }));
        window.scrollTo = () => {};
        window.alert = () => {};
        window.confirm = () => true;
        window.prompt = () => null;
        // Reject all network so the app falls back to mock/local data fast.
        window.fetch = () => Promise.reject(new Error('offline'));
      },
    });

    await new Promise(r => setTimeout(r, 6000));

    const root = dom.window.document.getElementById('root');
    const text = (root && root.textContent) || '';
    const hasError = text.includes('Something went wrong');
    const hasUI = text.includes('Buy');

    dom.window.close();
    server.close();

    console.log('  root contains "Buy":', hasUI);
    console.log('  root contains "Something went wrong":', hasError);

    if (hasUI && !hasError) {
      console.log('\nPASS  app launched without ErrorBoundary and rendered UI');
      process.exit(0);
    } else {
      console.log('\nFAIL  app did not render expected UI (snippet):\n', text.slice(0, 300));
      process.exit(1);
    }
  } catch (e) {
    server.close();
    console.log('FAIL  launch threw:', e && e.message);
    process.exit(1);
  }
});
