/**
 * SCAPI Content Script – AI-powered Product Detection Engine
 * Supports: Dornbracht, Hansgrohe, Geberit + Generic Heuristic fallback
 * 
 * Multi-Pass Strategy:
 *   Pass 1: Schema.org / Semantic HTML (highest confidence)
 *   Pass 2: Manufacturer-specific CSS selectors
 *   Pass 3: Heuristic DOM pattern recognition (image+heading+number cluster)
 *   Pass 4: AI-assisted classification via structural signatures
 */

(function () {
    'use strict';

    // ─── Helpers ───────────────────────────────────────────────────────────────

    function safeText(el) {
        return el ? el.textContent.trim() : '';
    }

    function safeAttr(el, attr) {
        return el ? (el.getAttribute(attr) || '').trim() : '';
    }

    function getBestImage(el) {
        const imgs = el.querySelectorAll('img');
        for (const img of imgs) {
            const src =
                img.getAttribute('data-src') ||
                img.getAttribute('data-lazy-src') ||
                img.getAttribute('data-original') ||
                img.getAttribute('src') ||
                '';
            if (src && !src.includes('placeholder') && !src.includes('blank') && src.length > 10) {
                const srcset = img.getAttribute('srcset') || img.getAttribute('data-srcset') || '';
                if (srcset) {
                    const best = parseSrcset(srcset);
                    if (best) return best;
                }
                return toAbsolute(src);
            }
        }
        // Try background-image
        const allEls = el.querySelectorAll('*');
        for (const e of allEls) {
            const bg = getComputedStyle(e).backgroundImage;
            if (bg && bg !== 'none') {
                const match = bg.match(/url\(["']?([^"')]+)["']?\)/);
                if (match) return toAbsolute(match[1]);
            }
        }
        return '';
    }

    function parseSrcset(srcset) {
        const parts = srcset.split(',').map(s => s.trim());
        let best = null, bestW = 0;
        for (const part of parts) {
            const [url, descriptor] = part.split(/\s+/);
            if (!url) continue;
            const w = descriptor ? parseInt(descriptor) : 0;
            if (w > bestW) { bestW = w; best = url; }
        }
        return best ? toAbsolute(best) : null;
    }

    function toAbsolute(url) {
        if (!url) return '';
        try {
            return new URL(url, window.location.href).href;
        } catch {
            return url;
        }
    }

    function extractArticleNumber(text) {
        if (!text) return '';
        // Common article number patterns for sanitary industry
        const patterns = [
            /\b([A-Z]{1,4}[\s\-]?\d{5,}[\w\-]*)\b/,  // Dornbracht style: IMO 10900978
            /\b(\d{5,}[\w\.\-]*)\b/,                    // Numeric codes: 26001000
            /Artikel[:\-\s]+([A-Z0-9\-\.]+)/i,
            /Art\.[:\-\s]+([A-Z0-9\-\.]+)/i,
            /Art\.?[-Nr\.]+[:\s]*([A-Z0-9\-\.]+)/i,
            /Bestellnummer[:\s]*([A-Z0-9\-\.]+)/i,
            /Order[:\s]+([A-Z0-9\-\.]+)/i,
            /SKU[:\s]+([A-Z0-9\-\.]+)/i,
            /Ref[:\s]+([A-Z0-9\-\.]+)/i,
        ];
        for (const p of patterns) {
            const m = text.match(p);
            if (m) return m[1].trim();
        }
        return '';
    }

    function deduplicateProducts(products) {
        const seen = new Map();
        for (const p of products) {
            const key = p.articleNumber || p.name + p.imageUrl;
            if (!seen.has(key) && p.name && p.name.length > 2) {
                seen.set(key, p);
            }
        }
        return Array.from(seen.values());
    }

    function getManufacturer() {
        const hostname = window.location.hostname.toLowerCase();
        if (hostname.includes('dornbracht')) return 'Dornbracht';
        if (hostname.includes('hansgrohe')) return 'Hansgrohe';
        if (hostname.includes('geberit')) return 'Geberit';
        if (hostname.includes('grohe')) return 'GROHE';
        if (hostname.includes('villeroy')) return 'Villeroy & Boch';
        if (hostname.includes('duravit')) return 'Duravit';
        if (hostname.includes('keuco')) return 'Keuco';
        if (hostname.includes('kaldewei')) return 'Kaldewei';
        if (hostname.includes('roca')) return 'Roca';
        if (hostname.includes('laufen')) return 'Laufen';
        if (hostname.includes('ideal-standard')) return 'Ideal Standard';
        if (hostname.includes('hansa')) return 'Hansa';
        if (hostname.includes('tece')) return 'TECE';
        if (hostname.includes('wedi')) return 'Wedi';
        return hostname.replace('www.', '').split('.')[0];
    }

    function buildProduct(name, articleNumber, imageUrl, description, url, category) {
        return {
            name: name.substring(0, 200),
            articleNumber: articleNumber.substring(0, 100),
            imageUrl,
            description: description.substring(0, 500),
            url: url || window.location.href,
            category,
            manufacturer: getManufacturer(),
            extractedAt: new Date().toISOString(),
            confidence: 0,
        };
    }

    // ─── Pass 1: Schema.org / JSON-LD ─────────────────────────────────────────

    function extractSchemaOrg() {
        const products = [];
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        for (const script of scripts) {
            try {
                const data = JSON.parse(script.textContent);
                const items = Array.isArray(data) ? data : [data];
                for (const item of items) {
                    if (item['@type'] === 'Product' || item['@type'] === 'ItemList') {
                        if (item['@type'] === 'Product') {
                            const p = buildProduct(
                                item.name || '',
                                item.sku || item.mpn || item.gtin || '',
                                (item.image && (Array.isArray(item.image) ? item.image[0] : item.image)) || '',
                                item.description || '',
                                item.url || '',
                                item.category || ''
                            );
                            p.confidence = 0.95;
                            if (p.name) products.push(p);
                        } else if (item.itemListElement) {
                            for (const listItem of item.itemListElement) {
                                const prod = listItem.item || listItem;
                                if (prod['@type'] === 'Product' && prod.name) {
                                    const p = buildProduct(
                                        prod.name, prod.sku || '', prod.image || '',
                                        prod.description || '', prod.url || '', prod.category || ''
                                    );
                                    p.confidence = 0.95;
                                    products.push(p);
                                }
                            }
                        }
                    }
                }
            } catch (e) { /* ignore parse errors */ }
        }

        // Microdata
        const microItems = document.querySelectorAll('[itemtype*="schema.org/Product"]');
        for (const item of microItems) {
            const name = safeText(item.querySelector('[itemprop="name"]'));
            const sku = safeText(item.querySelector('[itemprop="sku"]')) ||
                safeText(item.querySelector('[itemprop="mpn"]'));
            const imgEl = item.querySelector('[itemprop="image"]');
            const imageUrl = imgEl ? (safeAttr(imgEl, 'src') || safeAttr(imgEl, 'content')) : '';
            const description = safeText(item.querySelector('[itemprop="description"]'));
            if (name) {
                const p = buildProduct(name, sku, toAbsolute(imageUrl), description, '', '');
                p.confidence = 0.90;
                products.push(p);
            }
        }

        return products;
    }

    // ─── Pass 2: Manufacturer-Specific Selectors ──────────────────────────────

    const ADAPTERS = {
        dornbracht: {
            match: () => window.location.hostname.includes('dornbracht'),
            containerSelector: [
                '.product-tile',
                '.product-item',
                '[class*="ProductTile"]',
                '[class*="product-card"]',
                '.c-product-tile',
                'article[data-product]',
            ],
            nameSelector: ['.product-tile__name', '.product-name', 'h2', 'h3', '[class*="name"]'],
            numberSelector: ['[data-sku]', '[class*="sku"]', '[class*="article"]', '.product-number'],
            imageSelector: ['img'],
            descSelector: ['.product-tile__description', '.product-description', 'p'],
        },
        hansgrohe: {
            match: () => window.location.hostname.includes('hansgrohe'),
            containerSelector: [
                '.product-card',
                '.product-item',
                '[class*="ProductCard"]',
                '.product-tile',
                'article',
                '.search-result-item',
            ],
            nameSelector: ['.product-card__title', '.product-title', 'h2', 'h3', '.title'],
            numberSelector: ['.product-number', '[class*="articleNo"]', '[class*="article-no"]', '.sku'],
            imageSelector: ['img'],
            descSelector: ['.product-card__description', 'p'],
        },
        geberit: {
            match: () => window.location.hostname.includes('geberit'),
            containerSelector: [
                '.product-item',
                '.product-list-item',
                '[class*="ProductItem"]',
                '.product-tile',
                '.search-result__item',
                'article',
            ],
            nameSelector: ['.product-item__name', '.product-name', 'h2', 'h3', '[class*="name"]'],
            numberSelector: ['.product-item__article-number', '[class*="articleNumber"]', '.article-number'],
            imageSelector: ['img'],
            descSelector: ['.product-item__description', 'p.description'],
        },
        grohe: {
            match: () => window.location.hostname.includes('grohe'),
            containerSelector: ['.product-tile', '.product-card', '.search-result', 'article', '[class*="product"]'],
            nameSelector: ['h2', 'h3', '[class*="name"]', '[class*="title"]'],
            numberSelector: ['[class*="sku"]', '[class*="article"]', '[class*="number"]'],
            imageSelector: ['img'],
            descSelector: ['p'],
        },
        villeroy: {
            match: () => window.location.hostname.includes('villeroy'),
            containerSelector: ['.product-tile', '.product-item', 'article', '[class*="product"]'],
            nameSelector: ['h2', 'h3', '[class*="name"]'],
            numberSelector: ['[class*="sku"]', '[class*="article"]'],
            imageSelector: ['img'],
            descSelector: ['p'],
        },
        generic: {
            match: () => true,
            containerSelector: [
                '[itemtype*="Product"]',
                '.product-card',
                '.product-tile',
                '.product-item',
                '.product-listing-item',
                '.product-list-item',
                '.search-result-item',
                'article.product',
                '[class*="product-card"]',
                '[class*="product-tile"]',
                '[class*="ProductCard"]',
                '[class*="ProductTile"]',
                '[class*="ProductItem"]',
                '[data-product-id]',
                '[data-sku]',
            ],
            nameSelector: ['h1', 'h2', 'h3', '[class*="title"]', '[class*="name"]'],
            numberSelector: ['[class*="sku"]', '[class*="article"]', '[class*="number"]', '[data-sku]', '[itemprop="sku"]'],
            imageSelector: ['img'],
            descSelector: ['p', '[class*="description"]'],
        },
    };

    function getAdapter() {
        for (const [, adapter] of Object.entries(ADAPTERS)) {
            if (adapter.match()) return adapter;
        }
        return ADAPTERS.generic;
    }

    function findFirst(el, selectors) {
        for (const sel of selectors) {
            try {
                const found = el.querySelector(sel);
                if (found) return found;
            } catch { continue; }
        }
        return null;
    }

    function extractWithAdapter() {
        const products = [];
        const adapter = getAdapter();

        for (const containerSel of adapter.containerSelector) {
            let containers;
            try {
                containers = document.querySelectorAll(containerSel);
            } catch { continue; }

            if (containers.length === 0) continue;

            for (const container of containers) {
                const nameEl = findFirst(container, adapter.nameSelector);
                const name = safeText(nameEl);
                if (!name || name.length < 3) continue;

                const numEl = findFirst(container, adapter.numberSelector);
                const numText = safeText(numEl) || safeAttr(numEl, 'data-sku') || safeAttr(container, 'data-product-id');
                const articleNumber = extractArticleNumber(numText) || extractArticleNumber(safeText(container));

                const imageUrl = getBestImage(container);
                const descEl = findFirst(container, adapter.descSelector);
                const description = nameEl !== descEl ? safeText(descEl) : '';

                const linkEl = container.querySelector('a[href]') || container.closest('a[href]');
                const url = linkEl ? toAbsolute(safeAttr(linkEl, 'href')) : window.location.href;

                const p = buildProduct(name, articleNumber, imageUrl, description, url, '');
                p.confidence = 0.75;
                products.push(p);
            }

            if (products.length > 0) break; // Use first successful adapter selector
        }
        return products;
    }

    // ─── Pass 3: Heuristic Pattern Recognition ────────────────────────────────

    function heuristicScan() {
        const products = [];

        // Score elements for product-likeness
        const candidates = [];
        const allLinks = document.querySelectorAll('a[href]');

        for (const link of allLinks) {
            const rect = link.getBoundingClientRect();
            if (rect.width < 80 || rect.height < 80) continue;

            const imgs = link.querySelectorAll('img');
            if (imgs.length === 0) continue;

            const headings = link.querySelectorAll('h1,h2,h3,h4,p,span');
            if (headings.length === 0) continue;

            let score = 0;
            if (imgs.length > 0) score += 30;
            if (headings.length > 0) score += 20;
            if (rect.width > 150 && rect.height > 150) score += 20;

            const text = link.textContent;
            if (/\d{4,}/.test(text)) score += 15; // article number-like
            if (/art\.?|artikel|sku|bestellnr/i.test(text)) score += 15;

            if (score >= 50) candidates.push({ el: link, score });
        }

        // Also check article tags and list items
        const articleBased = document.querySelectorAll('article, li.product, li[class*="product"], div[class*="product-item"], div[class*="product-card"]');
        for (const el of articleBased) {
            const imgs = el.querySelectorAll('img');
            const headings = el.querySelectorAll('h1,h2,h3,h4');
            if (imgs.length > 0 && headings.length > 0) {
                candidates.push({ el, score: 60 });
            }
        }

        for (const { el } of candidates) {
            const name = safeText(el.querySelector('h1,h2,h3,h4') || el.querySelector('[class*="title"],[class*="name"]'));
            if (!name || name.length < 3) continue;

            const fullText = safeText(el);
            const articleNumber = extractArticleNumber(fullText);
            const imageUrl = getBestImage(el);
            const linkEl = el.tagName === 'A' ? el : el.querySelector('a[href]');
            const url = linkEl ? toAbsolute(safeAttr(linkEl, 'href')) : window.location.href;

            const p = buildProduct(name, articleNumber, imageUrl, '', url, '');
            p.confidence = 0.55;
            products.push(p);
        }

        return products;
    }

    // ─── Auto-Scroll & Pagination ──────────────────────────────────────────────

    async function autoScroll() {
        return new Promise(resolve => {
            let lastHeight = 0;
            let tries = 0;
            const maxTries = 15;

            function scroll() {
                window.scrollTo(0, document.body.scrollHeight);
                setTimeout(() => {
                    const newHeight = document.body.scrollHeight;
                    if (newHeight === lastHeight || tries >= maxTries) {
                        window.scrollTo(0, 0);
                        resolve();
                    } else {
                        lastHeight = newHeight;
                        tries++;
                        scroll();
                    }
                }, 800);
            }
            scroll();
        });
    }

    function clickShowMore() {
        const selectors = [
            'button[class*="more"]',
            'button[class*="load"]',
            'a[class*="more"]',
            '.load-more',
            '.show-more',
            '[id*="load-more"]',
            '[data-action="load-more"]',
            'button:not([disabled])',
        ];

        for (const sel of selectors) {
            const btns = document.querySelectorAll(sel);
            for (const btn of btns) {
                const text = btn.textContent.toLowerCase();
                if (/mehr|load|show|next|weiter|anzeigen|laden/i.test(text)) {
                    try {
                        btn.click();
                        return true;
                    } catch { continue; }
                }
            }
        }
        return false;
    }

    // ─── Main Extraction ──────────────────────────────────────────────────────

    async function extractProducts() {
        // Show visual overlay
        showOverlay('🔍 SCAPI analysiert Seite...');

        // Scroll to load lazy content
        await autoScroll();
        clickShowMore();
        await new Promise(r => setTimeout(r, 1500));

        // Run all passes
        const schemaProducts = extractSchemaOrg();
        const adapterProducts = extractWithAdapter();
        const heuristicProducts = heuristicScan();

        // Merge with confidence priority
        let allProducts = [
            ...schemaProducts,
            ...adapterProducts,
            ...heuristicProducts,
        ];

        allProducts = deduplicateProducts(allProducts);

        // Filter out low quality
        allProducts = allProducts.filter(p =>
            p.name.length > 2 &&
            (p.imageUrl || p.articleNumber) // must have either image or article number
        );

        updateOverlay(`✅ ${allProducts.length} Produkte gefunden!`);

        // Highlight found products
        highlightProducts(allProducts);

        // Send to background
        chrome.runtime.sendMessage({
            type: 'SCAPI_PRODUCTS_FOUND',
            products: allProducts,
        });

        // Also send progress
        chrome.runtime.sendMessage({
            type: 'SCAPI_PROGRESS',
            data: {
                url: window.location.href,
                manufacturer: getManufacturer(),
                count: allProducts.length,
                status: 'done',
                timestamp: new Date().toISOString(),
            },
        });

        setTimeout(hideOverlay, 3000);

        return allProducts;
    }

    // ─── Visual Overlay ───────────────────────────────────────────────────────

    function showOverlay(message) {
        let overlay = document.getElementById('scapi-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'scapi-overlay';
            overlay.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 999999;
        background: linear-gradient(135deg, hsl(215,75%,20%), hsl(215,75%,15%));
        color: white; padding: 16px 24px; border-radius: 16px;
        font-family: Inter, sans-serif; font-size: 14px; font-weight: 600;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1);
        backdrop-filter: blur(20px); transition: all 0.3s ease;
        display: flex; align-items: center; gap: 12px; max-width: 320px;
      `;
            document.body.appendChild(overlay);
        }
        overlay.innerHTML = `<span style="font-size:20px;">🔍</span> <span>${message}</span>`;
        overlay.style.opacity = '1';
        overlay.style.transform = 'translateX(0)';
    }

    function updateOverlay(message) {
        const overlay = document.getElementById('scapi-overlay');
        if (overlay) overlay.innerHTML = `<span style="font-size:20px;">✅</span> <span>${message}</span>`;
    }

    function hideOverlay() {
        const overlay = document.getElementById('scapi-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            overlay.style.transform = 'translateX(20px)';
            setTimeout(() => overlay?.remove(), 300);
        }
    }

    function highlightProducts(products) {
        // Briefly flash product containers
        const containers = [
            ...document.querySelectorAll('[class*="product-card"]'),
            ...document.querySelectorAll('[class*="product-tile"]'),
            ...document.querySelectorAll('[class*="product-item"]'),
            ...document.querySelectorAll('article'),
        ].slice(0, 50);

        containers.forEach((el, i) => {
            setTimeout(() => {
                el.style.outline = '2px solid hsl(160, 84%, 50%)';
                el.style.outlineOffset = '2px';
                el.style.transition = 'outline 0.3s ease';
                setTimeout(() => {
                    el.style.outline = 'none';
                }, 1500);
            }, i * 30);
        });
    }

    // ─── Listen For Commands ──────────────────────────────────────────────────

    chrome.runtime.onMessage.addListener((msg, _, respond) => {
        if (msg.type === 'SCAPI_START_EXTRACTION') {
            extractProducts().then(products => respond({ success: true, count: products.length }));
            return true;
        }
    });

    // Auto-extract if triggered from SCAPI app
    chrome.storage.local.get(['scapi_auto_extract'], (result) => {
        if (result.scapi_auto_extract === window.location.hostname) {
            extractProducts();
        }
    });

    // Return products when used as injected script (fallback mode)
    return extractProducts();
})();
