import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Key, Chrome, Save, CheckCircle2, AlertCircle, Info, Eye, EyeOff } from 'lucide-react';
import { useAppStore } from '../store';

export default function SettingsPage() {
    const { geminiApiKey, setGeminiApiKey, chromeProfile, setChromeProfile } = useAppStore();
    const [apiKey, setApiKey] = useState(geminiApiKey);
    const [profile, setProfile] = useState(chromeProfile);
    const [showKey, setShowKey] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        setGeminiApiKey(apiKey);
        setChromeProfile(profile);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    return (
        <div className="p-6 space-y-6 max-w-2xl">
            <div>
                <h1 className="text-2xl font-bold text-white">Einstellungen</h1>
                <p className="text-sm text-surface-100/40 mt-1">Konfiguration der SCAPI-App</p>
            </div>

            {/* AI Settings */}
            <div className="glass-card p-5 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: 'rgba(50,120,220,0.15)', border: '1px solid rgba(50,120,220,0.2)' }}>
                        <Key size={16} className="text-brand-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-white">KI-Unterstützung</h3>
                        <p className="text-xs text-surface-100/40">Gemini API für erweiterte Produkterkennung</p>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-medium text-surface-100/50">Google Gemini API-Schlüssel</label>
                    <div className="relative">
                        <input
                            type={showKey ? 'text' : 'password'}
                            className="input-field pr-10 font-mono text-xs"
                            placeholder="AIzaSy..."
                            value={apiKey}
                            onChange={e => setApiKey(e.target.value)}
                        />
                        <button onClick={() => setShowKey(!showKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-100/30 hover:text-surface-100/60">
                            {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                    </div>
                </div>

                <div className="flex items-start gap-2 p-3 rounded-xl"
                    style={{ background: 'rgba(50,120,220,0.08)', border: '1px solid rgba(50,120,220,0.15)' }}>
                    <Info size={14} className="text-brand-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-surface-100/50 space-y-1">
                        <p>Ohne API-Key läuft SCAPI im <strong className="text-white">Heuristik-Modus</strong> (4-Pass DOM-Analyse).</p>
                        <p>Mit Gemini API wird die Produkt-Erkennung durch KI-Klassifizierung verbessert.</p>
                        <p>Schlüssel unter: <span className="text-brand-400">aistudio.google.com</span></p>
                    </div>
                </div>

                {apiKey && (
                    <div className="flex items-center gap-2 text-xs text-accent-400">
                        <CheckCircle2 size={13} /> API-Schlüssel konfiguriert
                    </div>
                )}
            </div>

            {/* Chrome Settings */}
            <div className="glass-card p-5 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: 'rgba(160,84%,50%,0.1)', border: '1px solid rgba(30,200,140,0.2)' }}>
                        <Chrome size={16} className="text-accent-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-white">Browser-Integration</h3>
                        <p className="text-xs text-surface-100/40">Chrome Extension Einstellungen</p>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-medium text-surface-100/50">Chrome Profil-Pfad (optional)</label>
                    <input
                        className="input-field font-mono text-xs"
                        placeholder='C:\Users\...\AppData\Local\Google\Chrome\User Data'
                        value={profile}
                        onChange={e => setProfile(e.target.value)}
                    />
                    <p className="text-xs text-surface-100/30">Leer lassen für Standardprofil</p>
                </div>

                <div className="p-3 rounded-xl space-y-2"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <p className="text-xs font-semibold text-white">Extension manuell installieren</p>
                    <p className="text-xs text-surface-100/40">Falls die Extension nicht automatisch geladen wird:</p>
                    <ol className="text-xs text-surface-100/40 space-y-1 list-decimal pl-4">
                        <li>Chrome öffnen → <span className="text-white font-mono">chrome://extensions/</span></li>
                        <li>"Entwicklermodus" aktivieren (oben rechts)</li>
                        <li>"Entpackte Erweiterung laden" → Ordner wählen: <span className="text-brand-400 font-mono">extension/</span></li>
                    </ol>
                </div>
            </div>

            {/* About */}
            <div className="glass-card p-5">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold text-white">SCAPI Produktkatalog</p>
                        <p className="text-xs text-surface-100/30 mt-0.5">Version 1.0.0 · Electron + React + Vite</p>
                    </div>
                    <span className="text-xs text-surface-100/20 font-mono">© 2026</span>
                </div>
            </div>

            {/* Save */}
            <motion.button
                className="btn-primary"
                onClick={handleSave}
                whileTap={{ scale: 0.97 }}
            >
                {saved ? <><CheckCircle2 size={16} /> Gespeichert!</> : <><Save size={16} /> Einstellungen speichern</>}
            </motion.button>
        </div>
    );
}
