import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Search, BookOpen, Download, Settings,
    Zap, X, Minus, Square, ChevronRight,
} from 'lucide-react';
import { useAppStore } from './store';
import ScraperPage from './pages/ScraperPage';
import CatalogPage from './pages/CatalogPage';
import ExportPage from './pages/ExportPage';
import SettingsPage from './pages/SettingsPage';
import DashboardPage from './pages/DashboardPage';
import UpdateBanner from './components/UpdateBanner';

const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'scraper', label: 'Extraktion', icon: Search },
    { id: 'catalog', label: 'Katalog', icon: BookOpen },
    { id: 'export', label: 'Export', icon: Download },
    { id: 'settings', label: 'Einstellungen', icon: Settings },
];

// Safe Electron API access
const electronAPI = (window as any).electronAPI;

export default function App() {
    const { activeTab, setActiveTab, products, scraperStatus } = useAppStore();
    const [isMaximized, setIsMaximized] = useState(false);

    const handleMin = () => electronAPI?.window.minimize();
    const handleMax = async () => {
        await electronAPI?.window.maximize();
        const max = await electronAPI?.window.isMaximized();
        setIsMaximized(max ?? !isMaximized);
    };
    const handleClose = () => electronAPI?.window.close();

    const renderPage = () => {
        switch (activeTab) {
            case 'dashboard': return <DashboardPage />;
            case 'scraper': return <ScraperPage />;
            case 'catalog': return <CatalogPage />;
            case 'export': return <ExportPage />;
            case 'settings': return <SettingsPage />;
            default: return <ScraperPage />;
        }
    };

    return (
        <div className="flex flex-col h-screen bg-surface-950 overflow-hidden">
            {/* Auto-Update Banner */}
            <UpdateBanner />
            {/* ── Title Bar ── */}
            <div className="flex items-center justify-between h-12 px-4 drag-region flex-shrink-0"
                style={{ background: 'hsl(222, 28%, 4%)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {/* Logo */}
                <div className="flex items-center gap-2.5 no-drag">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, hsl(215,75%,50%), hsl(160,84%,40%))' }}>
                        <Zap size={14} className="text-white" />
                    </div>
                    <span className="text-sm font-bold text-gradient">SCAPI</span>
                    <span className="text-xs text-surface-100/30 font-medium">Produktkatalog</span>
                </div>

                {/* Status pill */}
                <div className="flex items-center gap-2 no-drag">
                    <div className={scraperStatus === 'running' ? 'status-dot-yellow' :
                        scraperStatus === 'paused' ? 'status-dot-yellow' : 'status-dot-gray'} />
                    <span className="text-xs text-surface-100/40 font-mono">
                        {scraperStatus === 'running' ? 'Extrahiere...' :
                            scraperStatus === 'paused' ? 'Pausiert' : 'Bereit'}
                    </span>
                    <span className="mx-2 text-surface-100/10">|</span>
                    <span className="text-xs text-surface-100/40">{products.length} Produkte</span>
                </div>

                {/* Window controls */}
                <div className="flex items-center gap-1 no-drag">
                    <button onClick={handleMin}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-surface-100/40
                       hover:bg-white/5 hover:text-white transition-all duration-150">
                        <Minus size={13} />
                    </button>
                    <button onClick={handleMax}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-surface-100/40
                       hover:bg-white/5 hover:text-white transition-all duration-150">
                        <Square size={12} />
                    </button>
                    <button onClick={handleClose}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-surface-100/40
                       hover:bg-red-500/15 hover:text-red-400 transition-all duration-150">
                        <X size={14} />
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* ── Sidebar ── */}
                <aside className="flex flex-col w-56 flex-shrink-0 py-4 px-3"
                    style={{ background: 'hsl(222, 25%, 7%)', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                    <nav className="flex flex-col gap-1 flex-1">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                             transition-all duration-200 text-left w-full group relative"
                                    style={{
                                        background: isActive ? 'linear-gradient(135deg, rgba(50,120,220,0.2), rgba(30,200,140,0.1))' : 'transparent',
                                        color: isActive ? 'white' : 'hsl(220,15%,55%)',
                                        border: isActive ? '1px solid rgba(50,120,220,0.25)' : '1px solid transparent',
                                    }}
                                >
                                    {isActive && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                                            style={{ background: 'hsl(215, 75%, 55%)' }} />
                                    )}
                                    <Icon size={16} className={isActive ? 'text-brand-400' : 'text-current'} />
                                    {tab.label}
                                    {tab.id === 'catalog' && products.length > 0 && (
                                        <span className="ml-auto text-xs font-mono px-2 py-0.5 rounded-lg"
                                            style={{ background: 'rgba(50,120,220,0.2)', color: 'hsl(215,80%,65%)' }}>
                                            {products.length}
                                        </span>
                                    )}
                                    {!isActive && (
                                        <ChevronRight size={12} className="ml-auto opacity-0 group-hover:opacity-40 transition-opacity" />
                                    )}
                                </button>
                            );
                        })}
                    </nav>

                    {/* Footer */}
                    <div className="pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                        <p className="text-xs text-surface-100/20 text-center font-mono">SCAPI v1.0</p>
                    </div>
                </aside>

                {/* ── Main Content ── */}
                <main className="flex-1 overflow-hidden">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="h-full overflow-y-auto scrollbar-thin"
                        >
                            {renderPage()}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}
