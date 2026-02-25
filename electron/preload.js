const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    window: {
        minimize: () => ipcRenderer.invoke('window:minimize'),
        maximize: () => ipcRenderer.invoke('window:maximize'),
        close: () => ipcRenderer.invoke('window:close'),
        isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    },

    // Advanced scraper – full page traversal, no extension needed
    scraper: {
        run: (url, showWindow, maxPages, followCategories) =>
            ipcRenderer.invoke('scraper:run', { url, showWindow, maxPages, followCategories }),
    },

    shell: {
        openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
    },

    // Live scraper progress events
    onScraperProgress: (callback) => {
        const handler = (_, data) => callback(data);
        ipcRenderer.on('scraper:progress', handler);
        return () => ipcRenderer.off('scraper:progress', handler);
    },

    // Auto-Updater
    updater: {
        checkForUpdates: () => ipcRenderer.invoke('updater:check'),
        downloadUpdate: () => ipcRenderer.invoke('updater:download'),
        installUpdate: () => ipcRenderer.invoke('updater:install'),

        onChecking: (cb) => { const h = (_, d) => cb(d); ipcRenderer.on('updater:checking', h); return () => ipcRenderer.off('updater:checking', h); },
        onAvailable: (cb) => { const h = (_, d) => cb(d); ipcRenderer.on('updater:available', h); return () => ipcRenderer.off('updater:available', h); },
        onNotAvailable: (cb) => { const h = (_, d) => cb(d); ipcRenderer.on('updater:not-available', h); return () => ipcRenderer.off('updater:not-available', h); },
        onProgress: (cb) => { const h = (_, d) => cb(d); ipcRenderer.on('updater:progress', h); return () => ipcRenderer.off('updater:progress', h); },
        onReady: (cb) => { const h = (_, d) => cb(d); ipcRenderer.on('updater:ready', h); return () => ipcRenderer.off('updater:ready', h); },
        onError: (cb) => { const h = (_, d) => cb(d); ipcRenderer.on('updater:error', h); return () => ipcRenderer.off('updater:error', h); },
    },
});
