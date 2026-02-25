// SCAPI Background Service Worker
// Relays messages from content script to the SCAPI app

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SCAPI_PRODUCTS_FOUND') {
        // Store in chrome.storage for the app to pick up
        chrome.storage.local.get(['scapi_products'], (result) => {
            const existing = result.scapi_products || [];
            const merged = mergeProducts(existing, message.products);
            chrome.storage.local.set({ scapi_products: merged }, () => {
                sendResponse({ success: true, total: merged.length });
            });
        });
        return true; // async response
    }

    if (message.type === 'SCAPI_PROGRESS') {
        chrome.storage.local.set({ scapi_progress: message.data });
        sendResponse({ success: true });
        return true;
    }

    if (message.type === 'SCAPI_GET_PRODUCTS') {
        chrome.storage.local.get(['scapi_products'], (result) => {
            sendResponse({ products: result.scapi_products || [] });
        });
        return true;
    }

    if (message.type === 'SCAPI_CLEAR') {
        chrome.storage.local.set({ scapi_products: [], scapi_progress: null });
        sendResponse({ success: true });
        return true;
    }
});

function mergeProducts(existing, newProducts) {
    const map = new Map(existing.map(p => [p.articleNumber || p.url, p]));
    for (const p of newProducts) {
        const key = p.articleNumber || p.url;
        if (!map.has(key)) map.set(key, p);
    }
    return Array.from(map.values());
}
