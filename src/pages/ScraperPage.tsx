import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Play, Square, Globe, ChevronDown, CheckCircle2,
    Loader2, Info, Settings2, Layers, ArrowRight,
} from 'lucide-react';
import { useAppStore } from '../store';

const QUICK_URLS = [
    { label: 'Dornbracht', url: 'https://www.dornbracht.com/de-de/produkte/', logo: '🚿' },
    { label: 'Hansgrohe', url: 'https://www.hansgrohe.de/produkte.html', logo: '🛁' },
    { label: 'Geberit', url: 'https://www.geberit.de/produkte/', logo: '🔧' },
    { label: 'GROHE', url: 'https://www.grohe.de/de_de/c/produkte/', logo: '💧' },
    { label: 'Villeroy & Boch', url: 'https://www.villeroy-boch.de/bad.html', logo: '🏛️' },
    { label: 'Duravit', url: 'https://www.duravit.de/produkte.html', logo: '🛁' },
    { label: 'Keuco', url: 'https://www.keuco.de/produkte', logo: '✨' },
    { label: 'Kaldewei', url: 'https://www.kaldewei.de/produkte/', logo: '🛁' },
];

type LogEntry = { time: string; type: 'info' | 'success' | 'error' | 'progress'; message: string };
const electronAPI = (window as any).electronAPI;

export default function ScraperPage() {
    const {
        scraperStatus, setScraperStatus, scraperProgress, setScraperProgress,
        setCurrentUrl, addProducts, addSession, updateSession, products,
    } = useAppStore();

    const [url, setUrl] = useState('');
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [showQuick, setShowQuick] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [liveCount, setLiveCount] = useState(0);
    const [pagesVisited, setPagesVisited] = useState(0);

    // Settings
    const [maxPages, setMaxPages] = useState(30);
    const [followCategories, setFollowCategories] = useState(true);
    const [showBrowser, setShowBrowser] = useState(true);

    const logRef = useRef<HTMLDivElement>(null);

    const addLog = (type: LogEntry['type'], msg: string) => {
        setLogs(prev => [...prev.slice(-99), { time: new Date().toLocaleTimeString('de-DE'), type, message: msg }]);
        setTimeout(() => logRef.current?.scrollTo({ top: 99999, behavior: 'smooth' }), 50);
    };

    // Live progress from Electron main
    useEffect(() => {
        if (!electronAPI?.onScraperProgress) return;
        const cleanup = electronAPI.onScraperProgress((data: any) => {
            if (data.message) addLog('progress', data.message);
            if (data.totalProducts !== undefined) setLiveCount(data.totalProducts);
            if (data.page !== undefined) setPagesVisited(data.page);
        });
        return cleanup;
    }, []);

    const detectManufacturer = (u: string) => {
        const h = u.toLowerCase();
        if (h.includes('dornbracht')) return 'Dornbracht';
        if (h.includes('hansgrohe')) return 'Hansgrohe';
        if (h.includes('geberit')) return 'Geberit';
        if (h.includes('grohe')) return 'GROHE';
        if (h.includes('villeroy')) return 'Villeroy & Boch';
        if (h.includes('duravit')) return 'Duravit';
        try { return new URL(h.startsWith('http') ? h : 'https://' + h).hostname.replace('www.', '').split('.')[0]; }
        catch { return h; }
    };

    const handleStart = async () => {
        const raw = url.trim();
        if (!raw) { addLog('error', 'Bitte URL eingeben'); return; }
        let finalUrl = raw.startsWith('http') ? raw : 'https://' + raw;

        setCurrentUrl(finalUrl);
        setScraperStatus('running');
        setLogs([]);
        setLiveCount(0);
        setPagesVisited(0);

        const manufacturer = detectManufacturer(finalUrl);
        addLog('info', `🚀 SCAPI Advanced Engine gestartet`);
        addLog('info', `🏭 Hersteller erkannt: ${manufacturer}`);
        addLog('info', `⚙️ Einstellungen: max ${maxPages} Seiten, Kategorien: ${followCategories ? 'ja' : 'nein'}`);

        const sessId = `sess_${Date.now()}`;
        setSessionId(sessId);
        addSession({ url: finalUrl, manufacturer, startTime: new Date().toISOString(), productCount: 0, status: 'running' });

        try {
            if (electronAPI?.scraper?.run) {
                const result = await electronAPI.scraper.run(finalUrl, showBrowser, maxPages, followCategories);

                if (result.success || result.products.length > 0) {
                    addProducts(result.products);
                    addLog('success', `🎉 Fertig! ${result.products.length} Produkte aus ${result.pages ?? '?'} Seite(n)`);
                    setScraperProgress({ url: finalUrl, manufacturer, count: result.products.length, status: 'done', timestamp: new Date().toISOString() });
                    updateSession(sessId, { status: 'done', productCount: result.products.length, endTime: new Date().toISOString() });
                } else {
                    addLog('error', result.error ?? 'Unbekannter Fehler');
                    updateSession(sessId, { status: 'error', endTime: new Date().toISOString() });
                }
            } else {
                // Demo fallback
                addLog('info', '📱 Demo-Modus (kein Electron)');
                const demoSteps = [
                    '🍪 Cookie-Banner wird automatisch geschlossen...',
                    '📂 Kategorie-Baum wird analysiert...',
                    '🔄 Seite 1/3: Hauptkategorie wird geladen...',
                    '🔄 Seite 2/3: Unterkategorie "Armaturen" wird geladen...',
                    '🔄 Seite 3/3: Unterkategorie "Duschen" wird geladen...',
                    '📋 Tabellen werden analysiert...',
                    '✨ Deduplizierung – 3 Duplikate entfernt',
                ];
                demoSteps.forEach((s, i) => setTimeout(() => addLog('progress', s), 600 * (i + 1)));
                setTimeout(() => {
                    addLog('success', '🎉 Fertig! 47 Produkte aus 3 Seiten extrahiert');
                    setScraperStatus('idle');
                    updateSession(sessId, { status: 'done', productCount: 47, endTime: new Date().toISOString() });
                }, 600 * (demoSteps.length + 1));
                return;
            }
        } catch (err: any) {
            addLog('error', `Fehler: ${err?.message}`);
            updateSession(sessId ?? '', { status: 'error', endTime: new Date().toISOString() });
        } finally {
            setScraperStatus('idle');
        }
    };

    const handleStop = () => {
        setScraperStatus('idle');
        addLog('info', '⏹ Extraktion gestoppt');
        if (sessionId) updateSession(sessionId, { status: 'error', endTime: new Date().toISOString() });
    };

    const isRunning = scraperStatus === 'running';

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Produkt-Extraktion</h1>
                    <p className="text-sm text-surface-100/40 mt-1">
                        Intelligenter Multi-Page Scraper · Kategorien · Paginierung · Auto-Scroll
                    </p>
                </div>
                <button onClick={() => setShowSettings(!showSettings)} className="btn-ghost text-xs py-2">
                    <Settings2 size={14} /> Einstellungen
                </button>
            </div>

            {/* URL + Controls */}
            <div className="glass-card p-5 space-y-4">
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <Globe size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-100/30" />
                        <input
                            className="input-field pl-10"
                            placeholder="https://www.dornbracht.com/de-de/produkte/"
                            value={url}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
                            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && !isRunning && handleStart()}
                            disabled={isRunning}
                        />
                    </div>
                    <button className="btn-ghost" onClick={() => setShowQuick(!showQuick)}>
                        Schnellwahl <ChevronDown size={13} className={`transition-transform ${showQuick ? 'rotate-180' : ''}`} />
                    </button>
                </div>

                <AnimatePresence>
                    {showQuick && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="grid grid-cols-4 gap-2 pt-1">
                                {QUICK_URLS.map(q => (
                                    <button key={q.label} onClick={() => { setUrl(q.url); setShowQuick(false); }}
                                        className="flex items-center gap-2 p-3 rounded-xl text-xs text-left transition-all"
                                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                        <span>{q.logo}</span>
                                        <span className="font-medium text-surface-100/70">{q.label}</span>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Advanced Settings */}
                <AnimatePresence>
                    {showSettings && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="grid grid-cols-3 gap-4 pt-2 p-4 rounded-xl"
                                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-surface-100/50">Max. Seiten</label>
                                    <input type="number" min={1} max={200} value={maxPages}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaxPages(parseInt(e.target.value) || 30)}
                                        className="input-field py-2 text-sm font-mono" />
                                    <p className="text-xs text-surface-100/30">Wie viele Seiten max. durchlaufen</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-surface-100/50">Kategorien folgen</label>
                                    <button onClick={() => setFollowCategories(!followCategories)}
                                        className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${followCategories
                                                ? 'bg-accent-500/20 border border-accent-400/30 text-accent-400'
                                                : 'bg-surface-800/50 border border-white/10 text-surface-100/40'
                                            }`}>
                                        {followCategories ? '✅ Aktiv' : '⬜ Inaktiv'}
                                    </button>
                                    <p className="text-xs text-surface-100/30">Alle Unterkategorien traversieren</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-surface-100/50">Browser anzeigen</label>
                                    <button onClick={() => setShowBrowser(!showBrowser)}
                                        className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${showBrowser
                                                ? 'bg-brand-500/20 border border-brand-400/30 text-brand-400'
                                                : 'bg-surface-800/50 border border-white/10 text-surface-100/40'
                                            }`}>
                                        {showBrowser ? '✅ Sichtbar' : '⬜ Versteckt'}
                                    </button>
                                    <p className="text-xs text-surface-100/30">Scraper-Fenster sichtbar machen</p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex items-center gap-3">
                    {!isRunning ? (
                        <button className="btn-primary" onClick={handleStart}>
                            <Play size={15} /> Extraktion starten
                        </button>
                    ) : (
                        <button className="btn-danger" onClick={handleStop}>
                            <Square size={14} /> Stoppen
                        </button>
                    )}
                    {!isRunning && scraperProgress?.status === 'done' && (
                        <div className="flex items-center gap-2 ml-auto text-xs text-accent-400">
                            <CheckCircle2 size={13} />
                            Letzter Lauf: {scraperProgress.count} Produkte · {scraperProgress.manufacturer}
                        </div>
                    )}
                    {isRunning && (
                        <div className="flex items-center gap-2 ml-auto text-xs text-surface-100/40">
                            <Loader2 size={13} className="animate-spin text-brand-400" />
                            Seite {pagesVisited} · {liveCount} Produkte gefunden
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                {/* Log */}
                <div className="col-span-2 glass-card p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <div className={isRunning ? 'status-dot-yellow' : 'status-dot-gray'} />
                        <span className="text-xs font-semibold text-surface-100/50 uppercase tracking-wider">Live-Log</span>
                        {isRunning && (
                            <span className="ml-auto text-xs font-mono text-brand-400">
                                {pagesVisited} Seiten · {liveCount} Produkte
                            </span>
                        )}
                    </div>
                    <div ref={logRef} className="h-72 overflow-y-auto scrollbar-thin space-y-0.5 font-mono text-xs">
                        {logs.length === 0 ? (
                            <p className="text-surface-100/20 italic pt-4 text-center">Bereit – starte eine Extraktion...</p>
                        ) : logs.map((log, i) => (
                            <div key={i} className="flex gap-2 items-start py-px">
                                <span className="text-surface-100/20 flex-shrink-0 w-16">{log.time}</span>
                                <span className={
                                    log.type === 'error' ? 'text-red-400' :
                                        log.type === 'success' ? 'text-accent-400' :
                                            log.type === 'progress' ? 'text-brand-300' : 'text-surface-100/50'
                                }>{log.message}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Stats + Engine Info */}
                <div className="space-y-4">
                    <div className="glass-card p-4 text-center">
                        <p className="text-4xl font-bold text-white">{isRunning ? liveCount : products.length}</p>
                        <p className="text-xs text-surface-100/40 mt-1">{isRunning ? 'Live gefunden' : 'Im Katalog'}</p>
                        {isRunning && (
                            <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                <motion.div className="h-full rounded-full"
                                    style={{ background: 'linear-gradient(90deg, hsl(215,75%,50%), hsl(160,84%,45%))' }}
                                    animate={{ width: ['10%', '90%', '10%'] }} transition={{ duration: 2.5, repeat: Infinity }} />
                            </div>
                        )}
                        {isRunning && pagesVisited > 0 && (
                            <p className="text-xs font-mono text-brand-400/60 mt-2">
                                <Layers size={10} className="inline mr-1" />{pagesVisited} / {maxPages} Seiten
                            </p>
                        )}
                    </div>

                    <div className="glass-card p-4 space-y-3">
                        <p className="text-xs font-semibold text-white">Engine Fähigkeiten</p>
                        {[
                            '🍪 Cookie-Banner Auto-Dismiss',
                            '📂 Kategorie-Traversierung',
                            '📄 Paginierung (next/numbered)',
                            '♾️ Infinite Scroll',
                            '📋 Tabellen-Erkennung',
                            '🔍 4-Pass Produkt-Scan',
                            '🧠 Schema.org / JSON-LD',
                            '🔁 Globale Deduplizierung',
                        ].map((f, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <span className="text-xs">{f}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
