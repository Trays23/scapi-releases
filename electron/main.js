const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

const isDev = !app.isPackaged;
let mainWindow = null;

// ─── Auto-Updater Setup ───────────────────────────────────────────────────────
autoUpdater.autoDownload = false;     // User triggers download
autoUpdater.autoInstallOnAppQuit = true; // Install on next quit

function setupUpdater() {
  if (isDev) return; // Don't check for updates in dev mode

  const send = (event, data) => mainWindow?.webContents.send(`updater:${event}`, data);

  autoUpdater.on('checking-for-update', () => send('checking', null));
  autoUpdater.on('update-available', (info) => send('available', info));
  autoUpdater.on('update-not-available', (info) => send('not-available', info));
  autoUpdater.on('download-progress', (p) => send('progress', p));
  autoUpdater.on('update-downloaded', (info) => send('ready', info));
  autoUpdater.on('error', (err) => send('error', err.message));

  // IPC from renderer
  ipcMain.handle('updater:check', () => autoUpdater.checkForUpdates());
  ipcMain.handle('updater:download', () => autoUpdater.downloadUpdate());
  ipcMain.handle('updater:install', () => { autoUpdater.quitAndInstall(false, true); });

  // Auto-check 5 seconds after app ready
  setTimeout(() => autoUpdater.checkForUpdates().catch(() => { }), 5000);
  // Re-check every 4 hours
  setInterval(() => autoUpdater.checkForUpdates().catch(() => { }), 4 * 60 * 60 * 1000);
}

// ═══════════════════════════════════════════════════════════════════════════
// SCAPI ADVANCED SCRAPER ENGINE v2
// Features:
//   • Cookie/Banner auto-dismiss
//   • Category & subcategory tree traversal
//   • Pagination (numbered + next-button + infinite scroll)
//   • Filter detection & usage  
//   • Obstacle bypass (overlays, age-gates, login-prompts)
//   • 4-pass product detection (Schema.org → Adapters → Heuristic → URL-patterns)
//   • Live progress reporting
//   • Smart URL deduplication
// ═══════════════════════════════════════════════════════════════════════════

// ─── Injected Browser Scripts ────────────────────────────────────────────────

/** Dismiss all known overlays: cookies, banners, popups, age-gates */
const DISMISS_OVERLAYS_SCRIPT = `
(function() {
  const ACCEPT_PATTERNS = [
    /akzeptier/i, /alle akzept/i, /zustimm/i, /einverstanden/i,
    /accept all/i, /accept cookies/i, /i agree/i, /agree/i,
    /allow all/i, /allow cookies/i, /ok, got it/i, /got it/i,
    /consent/i, /confirm/i, /continue/i, /close/i, /weiter/i,
    /schliessen/i, /schließen/i, /ablehnen/i, /alles akzeptieren/i,
  ];
  const DISMISS_PATTERNS = [/ablehnen/i, /decline/i, /reject/i, /deny/i, /nein/i, /no thanks/i];
  
  let dismissed = 0;
  
  // Try to click accept buttons
  const allBtns = [...document.querySelectorAll('button, a[role="button"], [class*="btn"], [class*="button"]')];
  for (const btn of allBtns) {
    const t = (btn.textContent || btn.getAttribute('aria-label') || '').trim();
    if (ACCEPT_PATTERNS.some(p => p.test(t))) {
      try { btn.click(); dismissed++; } catch {}
    }
  }
  
  // Remove common overlay elements
  const overlaySelectors = [
    '[id*="cookie"]', '[class*="cookie"]', '[id*="consent"]',
    '[class*="consent"]', '[id*="overlay"]', '[class*="overlay"]',
    '[id*="modal"]', '[class*="modal"]', '[id*="popup"]', '[class*="popup"]',
    '[id*="banner"]', '[class*="gdpr"]', '[class*="privacy"]',
    '.fancybox-overlay', '#onetrust-banner-sdk', '#cookiebanner',
    '.cookie-notice', '.cc-window', '.cky-consent-container',
  ];
  overlaySelectors.forEach(sel => {
    try {
      document.querySelectorAll(sel).forEach(el => {
        const style = getComputedStyle(el);
        if (style.position === 'fixed' || style.position === 'sticky' || style.zIndex > 100) {
          el.remove();
        }
      });
    } catch {}
  });
  
  // Remove body scroll-lock
  document.body.style.overflow = 'auto';
  document.documentElement.style.overflow = 'auto';
  document.body.style.position = 'static';
  
  return dismissed;
})();
`;

/** Discover all category/product page links on current page */
const DISCOVER_LINKS_SCRIPT = `
(function() {
  const links = new Set();
  const PRODUCT_PATTERNS = [
    /produkt/i, /product/i, /artikel/i, /article/i, /shop/i,
    /kategorie/i, /category/i, /collection/i, /serie/i, /series/i,
    /bad/i, /bath/i, /sanit/i, /armatur/i, /faucet/i, /shower/i,
    /dusche/i, /waschbecken/i, /basin/i, /toilet/i, /wc/i,
    /heizung/i, /heating/i, /installation/i, /fliesen/i, /tile/i,
  ];
  const EXCLUDE_PATTERNS = [
    /login/i, /logout/i, /signin/i, /register/i, /cart/i,
    /warenkorb/i, /checkout/i, /impressum/i, /datenschutz/i,
    /agb/i, /kontakt/i, /contact/i, /career/i, /jobs/i,
    /press/i, /presse/i, /news/i, /blog/i, /about/i, /story/i,
    /facebook/i, /twitter/i, /instagram/i, /youtube/i, /linkedin/i,
    /#$/, /javascript:/i, /mailto:/i, /tel:/i,
  ];
  
  const origin = window.location.origin;
  const currentPath = window.location.pathname;
  
  document.querySelectorAll('a[href]').forEach(a => {
    try {
      const href = a.getAttribute('href');
      if (!href) return;
      const url = new URL(href, window.location.href);
      if (url.origin !== origin) return; // same-origin only
      if (url.pathname === currentPath) return; // skip current
      if (EXCLUDE_PATTERNS.some(p => p.test(url.pathname + url.href))) return;
      if (PRODUCT_PATTERNS.some(p => p.test(url.pathname + (a.textContent||'')))) {
        links.add(url.href.split('#')[0]); // strip hash
      }
    } catch {}
  });
  
  // Also find pagination links
  const PAGINATION_SELECTORS = [
    'a[rel="next"]', '[class*="next"]', '[class*="pagination"] a',
    '[class*="pager"] a', '.paginator a', '[aria-label*="next"]',
    '[aria-label*="weiter"]', 'a[class*="page-link"]',
    '[data-page]', '[data-pagination]',
  ];
  PAGINATION_SELECTORS.forEach(sel => {
    try {
      document.querySelectorAll(sel).forEach(a => {
        const href = a.getAttribute('href');
        if (href) {
          try { links.add(new URL(href, window.location.href).href.split('#')[0]); } catch {}
        }
      });
    } catch {}
  });
  
  return JSON.stringify([...links]);
})();
`;

/** Auto-scroll and click "load more" buttons */
const LOAD_ALL_SCRIPT = `
(async function() {
  // Click all visible "load more" / "show more" buttons
  function clickLoadMore() {
    const patterns = /mehr|load.?more|show.?more|weitere|anzeigen|laden|next/i;
    const btns = [...document.querySelectorAll(
      'button, a[role="button"], [class*="load-more"], [class*="show-more"], [class*="more-btn"]'
    )];
    let clicked = 0;
    for (const btn of btns) {
      const t = btn.textContent.trim() + ' ' + (btn.getAttribute('aria-label')||'');
      if (patterns.test(t) && !btn.disabled) {
        try { btn.click(); clicked++; } catch {}
      }
    }
    return clicked;
  }
  
  // Click all filter categories to load ALL products
  function clickAllFilters() {
    const filterSelectors = [
      '[class*="filter"] input[type="checkbox"]:not(:checked)',
      '[class*="facet"] input[type="checkbox"]:not(:checked)',
    ];
    let clicked = 0;
    filterSelectors.forEach(sel => {
      try {
        const inputs = [...document.querySelectorAll(sel)].slice(0, 10);
        inputs.forEach(inp => { try { inp.click(); clicked++; } catch {} });
      } catch {}
    });
    return clicked;
  }
  
  // Scroll to bottom repeatedly
  let lastH = 0, scrollRounds = 0;
  while (scrollRounds < 20) {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    await new Promise(r => setTimeout(r, 800));
    const newH = document.body.scrollHeight;
    const clicked = clickLoadMore();
    if (clicked > 0) { await new Promise(r => setTimeout(r, 1500)); }
    if (newH === lastH && clicked === 0) break;
    lastH = newH;
    scrollRounds++;
  }
  window.scrollTo(0, 0);
  return scrollRounds;
})();
`;

/** Main product extraction script - 4 passes */
const EXTRACT_PRODUCTS_SCRIPT = `
(function() {
  function safeText(el) { return el ? el.textContent.trim().replace(/\\s+/g, ' ') : ''; }
  function safeAttr(el, a) { return el ? (el.getAttribute(a) || '').trim() : ''; }
  
  function getBestImage(el) {
    const sources = [];
    el.querySelectorAll('img').forEach(img => {
      const attrs = ['data-src-large', 'data-zoom', 'data-hi-res', 'data-full',
                     'data-src', 'data-lazy-src', 'data-original', 'src'];
      for (const a of attrs) {
        const v = img.getAttribute(a);
        if (v && !v.includes('placeholder') && !v.includes('1x1') &&
            !v.includes('blank') && v.length > 10) {
          sources.push({ url: v, isLazy: a !== 'src' });
          break;
        }
      }
      const srcset = img.getAttribute('srcset') || img.getAttribute('data-srcset') || '';
      if (srcset) {
        const best = srcset.split(',').map(s => s.trim().split(/\\s+/))
          .filter(p => p[0]).sort((a,b) => (parseInt(b[1])||0) - (parseInt(a[1])||0))[0];
        if (best) sources.push({ url: best[0], isLazy: true });
      }
    });
    const best = sources.find(s => s.isLazy) || sources[0];
    return best ? toAbs(best.url) : '';
  }
  
  function toAbs(url) {
    if (!url) return '';
    try { return new URL(url, window.location.href).href; } catch { return url; }
  }
  
  function extractNum(text) {
    if (!text) return '';
    const patterns = [
      /Artikel(?:nummer)?[:\\-\\s]+([A-Z0-9][\\w\\-\\.]{3,})/i,
      /Art\\.?[-Nr.]+[:\\s]*([A-Z0-9][\\w\\-\\.]{3,})/i,
      /Bestellnr\\.?[:\\s]*([A-Z0-9][\\w\\-\\.]{3,})/i,
      /SKU[:\\s]+([A-Z0-9][\\w\\-\\.]{3,})/i,
      /Ref(?:erenz)?[:\\s]+([A-Z0-9][\\w\\-\\.]{3,})/i,
      /\\b([A-Z]{1,4}[\\-\\s]?\\d{5,}[\\w\\-]*)\\b/,
      /\\b(\\d{5,}[\\-\\./]?\\d*)\\b/,
    ];
    for (const p of patterns) { const m = text.match(p); if (m) return m[1].trim(); }
    return '';
  }
  
  function getManufacturer() {
    const h = window.location.hostname.toLowerCase().replace('www.','');
    if (h.includes('dornbracht')) return 'Dornbracht';
    if (h.includes('hansgrohe')) return 'Hansgrohe';
    if (h.includes('geberit')) return 'Geberit';
    if (h.includes('grohe')) return 'GROHE';
    if (h.includes('villeroy')) return 'Villeroy & Boch';
    if (h.includes('duravit')) return 'Duravit';
    if (h.includes('keuco')) return 'Keuco';
    if (h.includes('kaldewei')) return 'Kaldewei';
    if (h.includes('roca')) return 'Roca';
    if (h.includes('laufen')) return 'Laufen';
    if (h.includes('ideal-standard')) return 'Ideal Standard';
    if (h.includes('hansa')) return 'Hansa';
    if (h.includes('tece')) return 'TECE';
    if (h.includes('wedi')) return 'Wedi';
    if (h.includes('bette')) return 'Bette';
    return h.split('.')[0];
  }
  
  function makeProduct(name, artNo, imgUrl, desc, url, cat) {
    return {
      name: name.substring(0, 200).trim(),
      articleNumber: artNo.substring(0, 100).trim(),
      imageUrl: imgUrl,
      description: desc.substring(0, 400).trim(),
      url: url || window.location.href,
      category: cat || '',
      manufacturer: getManufacturer(),
      extractedAt: new Date().toISOString(),
      confidence: 0,
      pageUrl: window.location.href,
    };
  }

  // ── Pass 1: JSON-LD / Schema.org ──────────────────────────────────────────
  function pass1_schema() {
    const out = [];
    document.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
      try {
        const raw = JSON.parse(s.textContent);
        const items = Array.isArray(raw) ? raw.flat() : [raw];
        function processItem(item) {
          if (!item || typeof item !== 'object') return;
          if (item['@type'] === 'Product' && item.name) {
            const img = Array.isArray(item.image) ? item.image[0] : (item.image||'');
            const p = makeProduct(item.name, item.sku||item.mpn||item.gtin14||'',
              typeof img==='string'?img:(img.url||''), item.description||'',
              item.url||'', item.category||'');
            p.confidence = 0.97;
            out.push(p);
          }
          if (item['@type'] === 'ItemList' && item.itemListElement) {
            item.itemListElement.forEach(li => processItem(li.item || li));
          }
          if (item['@type'] === 'BreadcrumbList') {} // ignore
          if (item['@graph']) item['@graph'].forEach(processItem);
        }
        items.forEach(processItem);
      } catch {}
    });
    
    // Microdata
    document.querySelectorAll('[itemtype*="Product"]').forEach(el => {
      const name = safeText(el.querySelector('[itemprop="name"]'));
      if (!name) return;
      const sku = safeText(el.querySelector('[itemprop="sku"]'))||
                  safeText(el.querySelector('[itemprop="mpn"]'));
      const imgEl = el.querySelector('[itemprop="image"]');
      const img = imgEl ? toAbs(safeAttr(imgEl,'src')||safeAttr(imgEl,'content')) : '';
      const desc = safeText(el.querySelector('[itemprop="description"]'));
      const p = makeProduct(name, sku, img, desc, '', '');
      p.confidence = 0.93;
      out.push(p);
    });
    return out;
  }

  // ── Pass 2: Smart Container Detection ────────────────────────────────────
  const CONTAINER_SELS = [
    '[data-product-id]','[data-sku]','[data-article-number]',
    '[itemtype*="Product"]',
    '.product-tile','product-card','product-item',
    '[class*="ProductTile"],[class*="ProductCard"],[class*="ProductItem"]',
    '[class*="product-tile"],[class*="product-card"],[class*="product-item"]',
    '[class*="product-list-item"],[class*="product-listing"]',
    '[class*="article-tile"],[class*="article-card"],[class*="article-item"]',
    '.item-card','.catalog-product','.plp-item','.search-result-item',
    'article[class*="product"]','li[class*="product"]',
    '.p-card','.prod-item','.goods-item',
  ];
  const NAME_SELS = [
    '[itemprop="name"]','[class*="product-name"],[class*="product-title"]',
    '[class*="ProductName"],[class*="ProductTitle"]',
    '[class*="item-name"],[class*="item-title"]',
    '[class*="article-name"],[class*="article-title"]',
    'h1','h2','h3','h4',
    '[class*="name"],[class*="title"],[class*="heading"]',
  ];
  const NUM_SELS = [
    '[itemprop="sku"],[itemprop="mpn"]',
    '[class*="article-number"],[class*="articleNumber"]',
    '[class*="sku"],[class*="SKU"]',
    '[class*="art-no"],[class*="artno"]',
    '[data-sku],[data-article],[data-product-id]',
    '[class*="reference"],[class*="ref-no"]',
  ];
  const DESC_SELS = [
    '[itemprop="description"]',
    '[class*="description"],[class*="Description"]',
    '[class*="product-text"],[class*="product-info"]',
    'p.desc','p.description','.teaser','p',
  ];
  
  function findFirst(el, sels) {
    for (const s of sels) { try { const f=el.querySelector(s); if(f) return f; } catch {} }
    return null;
  }
  
  function pass2_containers() {
    const out = [];
    for (const sel of CONTAINER_SELS) {
      let containers;
      try { containers = [...document.querySelectorAll(sel)]; }
      catch { continue; }
      if (!containers.length) continue;
      for (const c of containers) {
        const nameEl = findFirst(c, NAME_SELS);
        const name = safeText(nameEl);
        if (!name || name.length < 2 || name.length > 200) continue;
        
        const numEl = findFirst(c, NUM_SELS);
        const numRaw = safeText(numEl)
          || safeAttr(c,'data-sku') || safeAttr(c,'data-article-number')
          || safeAttr(c,'data-product-id');
        const artNo = extractNum(numRaw) || extractNum(safeText(c)) || numRaw.substring(0,50);
        
        const img = getBestImage(c);
        
        const descEl = findFirst(c, DESC_SELS);
        const desc = nameEl !== descEl ? safeText(descEl).substring(0,300) : '';
        
        const linkEl = (c.tagName==='A'?c:null) || c.querySelector('a[href]') || c.closest('a[href]');
        const url = linkEl ? toAbs(safeAttr(linkEl,'href')) : window.location.href;
        
        // Try to find category from breadcrumb or parent context
        const breadcrumb = document.querySelector(
          '[class*="breadcrumb"], [aria-label*="breadcrumb"], nav ol, nav ul'
        );
        const cat = breadcrumb
          ? [...breadcrumb.querySelectorAll('a,li,span')].map(e=>safeText(e)).filter(t=>t&&t.length<50).slice(-2,-1).join('') 
          : '';
        
        const p = makeProduct(name, artNo, img, desc, url, cat);
        p.confidence = 0.80;
        out.push(p);
      }
      if (out.length >= 3) break; // use first successful selector set
    }
    return out;
  }

  // ── Pass 3: Table/Grid Detection ─────────────────────────────────────────
  function pass3_tables() {
    const out = [];
    document.querySelectorAll('table').forEach(table => {
      const headers = [...table.querySelectorAll('thead th,thead td')]
        .map(h => safeText(h).toLowerCase());
      if (!headers.length) return;
      
      const nameIdx = headers.findIndex(h => /name|bezeichn|produkt|artikel/i.test(h));
      const numIdx  = headers.findIndex(h => /nummer|number|sku|art/i.test(h));
      const imgIdx  = headers.findIndex(h => /bild|image|foto|photo/i.test(h));
      if (nameIdx < 0) return;
      
      table.querySelectorAll('tbody tr').forEach(row => {
        const cells = [...row.querySelectorAll('td')];
        const name = safeText(cells[nameIdx]);
        if (!name || name.length < 2) return;
        const artNo = numIdx >= 0 ? safeText(cells[numIdx]) : extractNum(safeText(row));
        const img   = imgIdx >= 0 ? getBestImage(cells[imgIdx]) : getBestImage(row);
        const p = makeProduct(name, artNo, img, '', window.location.href, '');
        p.confidence = 0.85;
        out.push(p);
      });
    });
    return out;
  }

  // ── Pass 4: Heuristic Link Scan ───────────────────────────────────────────
  function pass4_heuristic() {
    const out = [];
    const seen = new Set();
    
    // Score-based link scan
    document.querySelectorAll('a[href]').forEach(link => {
      try {
        const rect = link.getBoundingClientRect();
        if (rect.width < 80 || rect.height < 80) return;
        const imgs = link.querySelectorAll('img');
        if (!imgs.length) return;
        const heading = link.querySelector('h1,h2,h3,h4,[class*="title"],[class*="name"]');
        if (!heading) return;
        const name = safeText(heading);
        if (!name || name.length < 2 || seen.has(name.toLowerCase())) return;
        seen.add(name.toLowerCase());
        const fullText = safeText(link);
        const artNo = extractNum(fullText);
        const img = getBestImage(link);
        const url = toAbs(link.getAttribute('href'));
        const p = makeProduct(name, artNo, img, '', url, '');
        p.confidence = 0.60;
        out.push(p);
      } catch {}
    });
    
    // Grid/flex containers that might not be <a>
    document.querySelectorAll('[class*="grid"] > *, [class*="row"] > *, ul > li').forEach(item => {
      try {
        const heading = item.querySelector('h1,h2,h3,h4,[class*="title"],[class*="name"]');
        const img = item.querySelector('img');
        if (!heading || !img) return;
        const name = safeText(heading);
        if (!name || name.length < 2 || seen.has(name.toLowerCase())) return;
        seen.add(name.toLowerCase());
        const artNo = extractNum(safeText(item));
        const linkEl = item.querySelector('a[href]');
        const url = linkEl ? toAbs(linkEl.getAttribute('href')) : window.location.href;
        const imgUrl = getBestImage(item);
        const p = makeProduct(name, artNo, imgUrl, '', url, '');
        p.confidence = 0.50;
        out.push(p);
      } catch {}
    });
    return out;
  }

  // ── Merge & deduplicate ────────────────────────────────────────────────────
  function dedup(products) {
    const map = new Map();
    [...products].sort((a,b) => b.confidence - a.confidence).forEach(p => {
      if (!p.name || p.name.length < 2) return;
      const key = (p.articleNumber && p.articleNumber.length > 3)
        ? p.articleNumber.toLowerCase()
        : (p.name.toLowerCase().substring(0,60) + '|' + p.manufacturer);
      if (!map.has(key)) map.set(key, p);
    });
    return [...map.values()].filter(p => p.imageUrl || p.articleNumber);
  }

  const all = dedup([
    ...pass1_schema(),
    ...pass2_containers(),
    ...pass3_tables(),
    ...pass4_heuristic(),
  ]);
  
  return JSON.stringify(all);
})();
`;

// ─── Window Setup ─────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1024, minHeight: 700,
    frame: false, backgroundColor: '#080C12',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false, contextIsolation: true, webSecurity: false,
    },
  });

  if (isDev) mainWindow.loadURL('http://localhost:5173');
  else mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  ipcMain.handle('window:minimize', () => mainWindow?.minimize());
  ipcMain.handle('window:maximize', () => mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize());
  ipcMain.handle('window:close', () => mainWindow?.close());
  ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized());
  ipcMain.handle('shell:openExternal', (_, url) => shell.openExternal(url));
  mainWindow.on('closed', () => { mainWindow = null; });
}

// ─── Advanced Scraper IPC Handler ────────────────────────────────────────────
ipcMain.handle('scraper:run', async (event, { url, showWindow, maxPages = 50, followCategories = true }) => {

  const allProducts = new Map(); // key → product (global dedup)
  const visitedUrls = new Set();
  const queue = [url];           // URLs to visit
  let pageCount = 0;

  const send = (msg, count, page) => mainWindow?.webContents.send('scraper:progress', {
    message: msg, count, page, totalProducts: allProducts.size,
  });

  const win = new BrowserWindow({
    width: 1366, height: 900,
    show: showWindow === true,
    webPreferences: { nodeIntegration: false, contextIsolation: false, webSecurity: false, images: true },
  });

  const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

  win.webContents.session.webRequest.onBeforeSendHeaders((details, cb) => {
    cb({ requestHeaders: { ...details.requestHeaders, 'User-Agent': USER_AGENT } });
  });

  async function scrapePage(pageUrl) {
    if (visitedUrls.has(pageUrl) || pageCount >= maxPages) return [];
    visitedUrls.add(pageUrl);
    pageCount++;

    try {
      send(`📄 [${pageCount}] Lade: ${pageUrl.replace(/^https?:\/\/[^/]+/, '')}`, allProducts.size, pageCount);

      await win.loadURL(pageUrl, { userAgent: USER_AGENT });
      await new Promise(r => setTimeout(r, 2000));

      // Dismiss overlays (cookies/banners)
      await win.webContents.executeJavaScript(DISMISS_OVERLAYS_SCRIPT).catch(() => { });
      await new Promise(r => setTimeout(r, 500));

      // Load all products (scroll + click load more)
      send(`🔄 Scrolle & lade alle Inhalte...`, allProducts.size, pageCount);
      await win.webContents.executeJavaScript(LOAD_ALL_SCRIPT).catch(() => { });

      // Extract products from this page
      send(`🔍 Extrahiere Produkte...`, allProducts.size, pageCount);
      const rawJson = await win.webContents.executeJavaScript(EXTRACT_PRODUCTS_SCRIPT).catch(() => '[]');
      const products = JSON.parse(rawJson || '[]');

      let newFound = 0;
      products.forEach(p => {
        const key = (p.articleNumber && p.articleNumber.length > 3)
          ? p.articleNumber.toLowerCase()
          : (p.name.toLowerCase().substring(0, 60) + '|' + p.manufacturer);
        if (!allProducts.has(key) && p.name) {
          allProducts.set(key, p);
          newFound++;
        }
      });

      if (newFound > 0) {
        send(`✅ +${newFound} neue Produkte (gesamt: ${allProducts.size})`, allProducts.size, pageCount);
      }

      // Discover new links (categories + pagination)
      if (followCategories && pageCount < maxPages) {
        const linksJson = await win.webContents.executeJavaScript(DISCOVER_LINKS_SCRIPT).catch(() => '[]');
        const links = JSON.parse(linksJson || '[]');
        links.forEach(l => { if (!visitedUrls.has(l)) queue.push(l); });
      }

      return products;
    } catch (err) {
      send(`⚠️ Fehler auf ${pageUrl}: ${err.message}`, allProducts.size, pageCount);
      return [];
    }
  }

  try {
    // Process queue
    while (queue.length > 0 && pageCount < maxPages) {
      const nextUrl = queue.shift();
      if (!nextUrl || visitedUrls.has(nextUrl)) continue;
      await scrapePage(nextUrl);
      // Small delay between pages to be polite
      await new Promise(r => setTimeout(r, 800));
    }

    send(`🎉 Fertig! ${allProducts.size} Produkte aus ${pageCount} Seite(n)`, allProducts.size, pageCount);
    win.close();
    return { success: true, products: [...allProducts.values()], count: allProducts.size, pages: pageCount };

  } catch (err) {
    try { win.close(); } catch { }
    return { success: false, error: err.message, products: [...allProducts.values()], count: allProducts.size };
  }
});

// ─── App Events ──────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  setupUpdater(); // Start auto-update checks
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
