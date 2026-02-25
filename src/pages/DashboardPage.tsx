import React from 'react';
import { motion } from 'framer-motion';
import { Package, TrendingUp, Clock, Star, Globe, Zap, ArrowRight } from 'lucide-react';
import { useAppStore } from '../store';

const MANUFACTURER_COLORS: Record<string, string> = {
    'Dornbracht': 'hsl(215,75%,55%)',
    'Hansgrohe': 'hsl(0,75%,55%)',
    'Geberit': 'hsl(30,75%,55%)',
    'GROHE': 'hsl(270,75%,60%)',
    'Villeroy & Boch': 'hsl(160,75%,45%)',
    'Duravit': 'hsl(45,75%,50%)',
};

export default function DashboardPage() {
    const { products, sessions, setActiveTab } = useAppStore();

    const manufacturers = [...new Set(products.map(p => p.manufacturer))];
    const starred = products.filter(p => p.starred);
    const recentSessions = sessions.slice(0, 5);

    const stats = [
        { label: 'Produkte gesamt', value: products.length, icon: Package, color: 'hsl(215,75%,55%)' },
        { label: 'Hersteller', value: manufacturers.length, icon: Globe, color: 'hsl(160,84%,45%)' },
        { label: 'Favoriten', value: starred.length, icon: Star, color: 'hsl(45,90%,55%)' },
        { label: 'Extraktionen', value: sessions.length, icon: Zap, color: 'hsl(270,75%,60%)' },
    ];

    const manufacturerCounts = manufacturers.map(m => ({
        name: m,
        count: products.filter(p => p.manufacturer === m).length,
        color: MANUFACTURER_COLORS[m] || 'hsl(215,50%,55%)',
    })).sort((a, b) => b.count - a.count);

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                <p className="text-sm text-surface-100/40 mt-1">Übersicht Ihres digitalen Produktkatalogs</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                {stats.map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.07 }}
                            className="glass-card p-5"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                                    style={{ background: stat.color + '20', border: `1px solid ${stat.color}30` }}>
                                    <Icon size={18} style={{ color: stat.color }} />
                                </div>
                            </div>
                            <p className="text-3xl font-bold text-white">{stat.value.toLocaleString('de-DE')}</p>
                            <p className="text-xs text-surface-100/40 mt-1">{stat.label}</p>
                        </motion.div>
                    );
                })}
            </div>

            <div className="grid grid-cols-2 gap-6">
                {/* Manufacturer Distribution */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="glass-card p-5"
                >
                    <h2 className="text-sm font-semibold text-white mb-4">Hersteller-Verteilung</h2>
                    {manufacturerCounts.length === 0 ? (
                        <div className="text-center py-8">
                            <Globe size={32} className="mx-auto mb-2" style={{ color: 'hsl(220,15%,35%)' }} />
                            <p className="text-sm text-surface-100/30">Noch keine Produkte extrahiert</p>
                            <button onClick={() => setActiveTab('scraper')}
                                className="mt-3 btn-primary text-xs py-2">
                                Jetzt starten <ArrowRight size={12} />
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {manufacturerCounts.map(m => (
                                <div key={m.name}>
                                    <div className="flex justify-between mb-1">
                                        <span className="text-sm text-surface-100/70">{m.name}</span>
                                        <span className="text-xs font-mono" style={{ color: m.color }}>{m.count}</span>
                                    </div>
                                    <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                        <div className="h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${(m.count / products.length) * 100}%`,
                                                background: m.color,
                                            }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* Recent Sessions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                    className="glass-card p-5"
                >
                    <h2 className="text-sm font-semibold text-white mb-4">Letzte Extraktionen</h2>
                    {recentSessions.length === 0 ? (
                        <div className="text-center py-8">
                            <Clock size={32} className="mx-auto mb-2" style={{ color: 'hsl(220,15%,35%)' }} />
                            <p className="text-sm text-surface-100/30">Keine Extraktionen bisher</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {recentSessions.map(session => (
                                <div key={session.id} className="flex items-center gap-3 p-3 rounded-xl"
                                    style={{ background: 'rgba(255,255,255,0.03)' }}>
                                    <div className={session.status === 'done' ? 'status-dot-green' :
                                        session.status === 'running' ? 'status-dot-yellow' : 'status-dot-gray'} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-white truncate">{session.manufacturer}</p>
                                        <p className="text-xs text-surface-100/30 truncate">{session.url}</p>
                                    </div>
                                    <span className="text-xs font-mono text-brand-400">{session.productCount}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Quick actions */}
            {products.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                    className="glass-card p-8 text-center"
                    style={{ background: 'linear-gradient(135deg, rgba(50,120,220,0.08), rgba(30,200,140,0.08))' }}>
                    <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, hsl(215,75%,50%), hsl(160,84%,40%))' }}>
                        <Zap size={28} className="text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Willkommen bei SCAPI!</h2>
                    <p className="text-sm text-surface-100/50 max-w-md mx-auto mb-6">
                        Extrahieren Sie automatisch Produkte von Sanitär-Hersteller-Websites wie Dornbracht,
                        Hansgrohe und Geberit in Ihren digitalen Produktkatalog.
                    </p>
                    <button onClick={() => setActiveTab('scraper')} className="btn-primary">
                        Erste Extraktion starten <ArrowRight size={16} />
                    </button>
                </motion.div>
            )}
        </div>
    );
}
