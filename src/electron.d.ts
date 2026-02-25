// Electron API type declarations for browser context
interface ElectronAPI {
    window: {
        minimize: () => Promise<void>;
        maximize: () => Promise<void>;
        close: () => Promise<void>;
        isMaximized: () => Promise<boolean>;
    };
    scraper: {
        injectAndScrape: (url: string) => Promise<any[]>;
        getWindows: () => Promise<any[]>;
    };
    shell: {
        openExternal: (url: string) => Promise<void>;
    };
    db: {
        saveProduct: (product: any) => Promise<{ success: boolean }>;
    };
    onProductFound: (cb: (product: any) => void) => () => void;
    onScraperProgress: (cb: (data: any) => void) => () => void;
}

declare global {
    interface Window {
        electronAPI?: ElectronAPI;
    }
}

export { };
