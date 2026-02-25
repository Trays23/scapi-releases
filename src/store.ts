import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Product {
    id: string;
    name: string;
    articleNumber: string;
    imageUrl: string;
    description: string;
    url: string;
    category: string;
    manufacturer: string;
    extractedAt: string;
    confidence: number;
    notes?: string;
    starred?: boolean;
}

export interface ScrapeSession {
    id: string;
    url: string;
    manufacturer: string;
    startTime: string;
    endTime?: string;
    productCount: number;
    status: 'running' | 'done' | 'error' | 'paused';
}

export interface ScraperProgress {
    url: string;
    manufacturer: string;
    count: number;
    status: 'running' | 'done' | 'error' | 'idle';
    timestamp: string;
}

interface AppState {
    // Products
    products: Product[];
    addProducts: (products: Omit<Product, 'id'>[]) => void;
    removeProduct: (id: string) => void;
    updateProduct: (id: string, updates: Partial<Product>) => void;
    clearProducts: () => void;
    toggleStar: (id: string) => void;

    // Sessions
    sessions: ScrapeSession[];
    addSession: (session: Omit<ScrapeSession, 'id'>) => void;
    updateSession: (id: string, updates: Partial<ScrapeSession>) => void;

    // Scraper state
    scraperStatus: 'idle' | 'running' | 'paused';
    scraperProgress: ScraperProgress | null;
    currentUrl: string;
    setScraperStatus: (s: AppState['scraperStatus']) => void;
    setScraperProgress: (p: ScraperProgress | null) => void;
    setCurrentUrl: (url: string) => void;

    // UI state
    activeTab: string;
    setActiveTab: (tab: string) => void;
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    filterManufacturer: string;
    setFilterManufacturer: (m: string) => void;
    viewMode: 'grid' | 'list';
    setViewMode: (v: 'grid' | 'list') => void;

    // Settings
    geminiApiKey: string;
    setGeminiApiKey: (key: string) => void;
    chromeProfile: string;
    setChromeProfile: (p: string) => void;
}

let idCounter = Date.now();
const genId = () => `prod_${idCounter++}_${Math.random().toString(36).slice(2, 7)}`;

export const useAppStore = create<AppState>()(
    persist(
        (set, get) => ({
            products: [],
            addProducts: (newProducts) => {
                const existing = get().products;
                const existingKeys = new Set(existing.map(p => p.articleNumber || p.name + p.manufacturer));
                const toAdd = newProducts
                    .filter(p => !existingKeys.has(p.articleNumber || p.name + p.manufacturer))
                    .map(p => ({ ...p, id: genId() }));
                set({ products: [...existing, ...toAdd] });
            },
            removeProduct: (id) => set(s => ({ products: s.products.filter(p => p.id !== id) })),
            updateProduct: (id, updates) => set(s => ({
                products: s.products.map(p => p.id === id ? { ...p, ...updates } : p),
            })),
            clearProducts: () => set({ products: [] }),
            toggleStar: (id) => set(s => ({
                products: s.products.map(p => p.id === id ? { ...p, starred: !p.starred } : p),
            })),

            sessions: [],
            addSession: (session) => set(s => ({
                sessions: [{ ...session, id: `sess_${Date.now()}` }, ...s.sessions].slice(0, 50),
            })),
            updateSession: (id, updates) => set(s => ({
                sessions: s.sessions.map(sess => sess.id === id ? { ...sess, ...updates } : sess),
            })),

            scraperStatus: 'idle',
            scraperProgress: null,
            currentUrl: '',
            setScraperStatus: (s) => set({ scraperStatus: s }),
            setScraperProgress: (p) => set({ scraperProgress: p }),
            setCurrentUrl: (url) => set({ currentUrl: url }),

            activeTab: 'scraper',
            setActiveTab: (tab) => set({ activeTab: tab }),
            searchQuery: '',
            setSearchQuery: (q) => set({ searchQuery: q }),
            filterManufacturer: '',
            setFilterManufacturer: (m) => set({ filterManufacturer: m }),
            viewMode: 'grid',
            setViewMode: (v) => set({ viewMode: v }),

            geminiApiKey: '',
            setGeminiApiKey: (key) => set({ geminiApiKey: key }),
            chromeProfile: '',
            setChromeProfile: (p) => set({ chromeProfile: p }),
        }),
        {
            name: 'scapi-store',
            partialize: (s) => ({
                products: s.products,
                sessions: s.sessions,
                geminiApiKey: s.geminiApiKey,
                chromeProfile: s.chromeProfile,
                viewMode: s.viewMode,
            }),
        }
    )
);
