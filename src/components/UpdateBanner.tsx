import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, RefreshCw, X, CheckCircle2, Loader2, ArrowUp } from 'lucide-react';

type UpdateState =
    | { status: 'idle' }
    | { status: 'checking' }
    | { status: 'available'; version: string; releaseNotes?: string }
    | { status: 'not-available' }
    | { status: 'downloading'; percent: number }
    | { status: 'ready'; version: string }
    | { status: 'error'; message: string };

const electronAPI = (window as any).electronAPI;

export default function UpdateBanner() {
    const [update, setUpdate] = useState<UpdateState>({ status: 'idle' });
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        if (!electronAPI?.updater) return;

        // Listen for update events from main process
        const cleanups = [
            electronAPI.updater.onChecking(() => setUpdate({ status: 'checking' })),
            electronAPI.updater.onAvailable((info: any) => {
                setUpdate({ status: 'available', version: info.version, releaseNotes: info.releaseNotes });
                setDismissed(false);
            }),
            electronAPI.updater.onNotAvailable(() => setUpdate({ status: 'not-available' })),
            electronAPI.updater.onProgress((p: any) => setUpdate({ status: 'downloading', percent: Math.round(p.percent) })),
            electronAPI.updater.onReady((info: any) => {
                setUpdate({ status: 'ready', version: info.version });
                setDismissed(false);
            }),
            electronAPI.updater.onError((msg: string) => setUpdate({ status: 'error', message: msg })),
        ];

        // Auto-check on startup (after 3 seconds)
        const timer = setTimeout(() => {
            electronAPI.updater.checkForUpdates().catch(() => { });
        }, 3000);

        return () => {
            cleanups.forEach(fn => fn?.());
            clearTimeout(timer);
        };
    }, []);

    const handleDownload = () => electronAPI?.updater?.downloadUpdate();
    const handleInstall = () => electronAPI?.updater?.installUpdate();
    const handleCheck = () => {
        setUpdate({ status: 'checking' });
        electronAPI?.updater?.checkForUpdates();
    };

    const shouldShow =
        !dismissed &&
        (update.status === 'available' ||
            update.status === 'downloading' ||
            update.status === 'ready' ||
            update.status === 'error');

    return (
        <AnimatePresence>
            {shouldShow && (
                <motion.div
                    initial={{ y: -60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -60, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="fixed top-12 left-0 right-0 z-50 flex items-center gap-4 px-5 py-3 no-drag"
                    style={{
                        background: update.status === 'ready'
                            ? 'linear-gradient(90deg, hsl(160,60%,12%), hsl(160,60%,10%))'
                            : update.status === 'error'
                                ? 'linear-gradient(90deg, hsl(0,60%,12%), hsl(0,60%,10%))'
                                : 'linear-gradient(90deg, hsl(215,40%,12%), hsl(215,40%,10%))',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                    }}
                >
                    {/* Icon */}
                    <div className="flex-shrink-0">
                        {update.status === 'downloading' && <Loader2 size={16} className="animate-spin text-brand-400" />}
                        {update.status === 'ready' && <CheckCircle2 size={16} className="text-accent-400" />}
                        {update.status === 'available' && <ArrowUp size={16} className="text-brand-400" />}
                        {update.status === 'error' && <X size={16} className="text-red-400" />}
                    </div>

                    {/* Message */}
                    <div className="flex-1 min-w-0">
                        {update.status === 'available' && (
                            <span className="text-xs text-white/80">
                                <span className="font-semibold text-white">Update verfügbar:</span> Version {update.version} ist bereit zum Download
                            </span>
                        )}
                        {update.status === 'downloading' && (
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-white/80">Update wird heruntergeladen... {update.percent}%</span>
                                <div className="flex-1 max-w-32 h-1 rounded-full bg-white/10">
                                    <div className="h-full rounded-full bg-brand-400 transition-all"
                                        style={{ width: `${update.percent}%` }} />
                                </div>
                            </div>
                        )}
                        {update.status === 'ready' && (
                            <span className="text-xs text-white/80">
                                <span className="font-semibold text-accent-400">Update bereit!</span>  Version {update.version} – jetzt neustart und installieren
                            </span>
                        )}
                        {update.status === 'error' && (
                            <span className="text-xs text-red-300">Update-Fehler: {update.message}</span>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {update.status === 'available' && (
                            <button onClick={handleDownload}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                           bg-brand-500/30 border border-brand-400/30 text-brand-300
                           hover:bg-brand-500/50 transition-all">
                                <Download size={12} /> Herunterladen
                            </button>
                        )}
                        {update.status === 'ready' && (
                            <button onClick={handleInstall}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                           bg-accent-500/30 border border-accent-400/30 text-accent-300
                           hover:bg-accent-500/50 transition-all">
                                <RefreshCw size={12} /> Jetzt installieren
                            </button>
                        )}
                        <button onClick={() => setDismissed(true)}
                            className="w-6 h-6 flex items-center justify-center rounded-lg text-white/30
                         hover:bg-white/5 hover:text-white/60 transition-all">
                            <X size={12} />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
