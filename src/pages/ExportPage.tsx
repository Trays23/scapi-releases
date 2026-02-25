import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, FileSpreadsheet, FileText, FileCsv, CheckCircle2, Package, Filter } from 'lucide-react';
import { useAppStore } from '../store';

type ExportFormat = 'csv' | 'json' | 'xlsx';

export default function ExportPage() {
    const { products, filterManufacturer } = useAppStore();
    const [format, setFormat] = useState<ExportFormat>('csv');
    const [scope, setScope] = useState<'all' | 'filtered' | 'starred'>('all');
    const [exported, setExported] = useState(false);

    const manufacturers = [...new Set(products.map(p => p.manufacturer))];

    const getProducts = () => {
        if (scope === 'starred') return products.filter(p => p.starred);
        if (scope === 'filtered' && filterManufacturer) return products.filter(p => p.manufacturer === filterManufacturer);
        return products;
    };

    const exportToCSV = (prods: typeof products) => {
        const headers = ['Name', 'Artikelnummer', 'Hersteller', 'Kategorie', 'Beschreibung', 'Bild-URL', 'Produkt-URL', 'Extrahiert am'];
        const rows = prods.map(p => [
            `"${p.name.replace(/"/g, '""')}"`,
            `"${p.articleNumber}"`,
            `"${p.manufacturer}"`,
            `"${p.category}"`,
            `"${p.description.replace(/"/g, '""').substring(0, 300)}"`,
            `"${p.imageUrl}"`,
            `"${p.url}"`,
            `"${new Date(p.extractedAt).toLocaleString('de-DE')}"`,
        ]);
        return [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    };

    const handleExport = () => {
        const prods = getProducts();
        if (prods.length === 0) return;

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const filename = `SCAPI_Katalog_${timestamp}`;

        if (format === 'csv') {
            const csv = '\uFEFF' + exportToCSV(prods); // BOM for Excel
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            downloadBlob(blob, `${filename}.csv`);
        } else if (format === 'json') {
            const json = JSON.stringify(prods, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            downloadBlob(blob, `${filename}.json`);
        }

        setExported(true);
        setTimeout(() => setExported(false), 3000);
    };

    const downloadBlob = (blob: Blob, name: string) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = name; a.click();
        URL.revokeObjectURL(url);
    };

    const toExport = getProducts();

    const formats: { id: ExportFormat; label: string; icon: React.ReactNode; desc: string }[] = [
        { id: 'csv', label: 'CSV', icon: <FileText size={20} />, desc: 'Komma-getrennte Werte, ideal für Excel' },
        { id: 'json', label: 'JSON', icon: <FileText size={20} />, desc: 'Strukturierte Daten für APIs' },
        { id: 'xlsx', label: 'Excel', icon: <FileSpreadsheet size={20} />, desc: 'Formatierte Arbeitsmappe (demnächst)' },
    ];

    const scopes = [
        { id: 'all' as const, label: 'Alle Produkte', count: products.length },
        { id: 'starred' as const, label: 'Nur Favoriten', count: products.filter(p => p.starred).length },
        { id: 'filtered' as const, label: filterManufacturer || 'Nach Hersteller', count: filterManufacturer ? products.filter(p => p.manufacturer === filterManufacturer).length : 0 },
    ];

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Export</h1>
                <p className="text-sm text-surface-100/40 mt-1">Produktkatalog exportieren</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
                {/* Format */}
                <div className="glass-card p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-white">Format wählen</h3>
                    <div className="space-y-2">
                        {formats.map(f => (
                            <button key={f.id} onClick={() => f.id !== 'xlsx' && setFormat(f.id)}
                                className="w-full flex items-center gap-4 p-4 rounded-xl transition-all text-left"
                                style={{
                                    background: format === f.id ? 'rgba(50,120,220,0.15)' : 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${format === f.id ? 'rgba(50,120,220,0.3)' : 'rgba(255,255,255,0.07)'}`,
                                    opacity: f.id === 'xlsx' ? 0.4 : 1,
                                    cursor: f.id === 'xlsx' ? 'not-allowed' : 'pointer',
                                }}>
                                <div style={{ color: format === f.id ? 'hsl(215,80%,65%)' : 'hsl(220,15%,45%)' }}>
                                    {f.icon}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-white">{f.label}</p>
                                    <p className="text-xs text-surface-100/40">{f.desc}</p>
                                </div>
                                {format === f.id && (
                                    <CheckCircle2 size={16} className="ml-auto text-brand-400" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Scope */}
                <div className="glass-card p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-white">Auswahl</h3>
                    <div className="space-y-2">
                        {scopes.map(s => (
                            <button key={s.id}
                                onClick={() => setScope(s.id)}
                                disabled={s.id === 'filtered' && !filterManufacturer}
                                className="w-full flex items-center gap-4 p-4 rounded-xl transition-all text-left disabled:opacity-30 disabled:cursor-not-allowed"
                                style={{
                                    background: scope === s.id ? 'rgba(50,120,220,0.15)' : 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${scope === s.id ? 'rgba(50,120,220,0.3)' : 'rgba(255,255,255,0.07)'}`,
                                }}>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-white">{s.label}</p>
                                    <p className="text-xs text-surface-100/40">{s.count} Produkte</p>
                                </div>
                                {scope === s.id && <CheckCircle2 size={16} className="text-brand-400" />}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Preview + Export button */}
            <div className="glass-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold text-white">Export-Vorschau</p>
                        <p className="text-xs text-surface-100/40 mt-1">{toExport.length} Produkte · Format: {format.toUpperCase()}</p>
                    </div>
                    <motion.button
                        className="btn-primary"
                        onClick={handleExport}
                        disabled={toExport.length === 0}
                        whileTap={{ scale: 0.97 }}
                    >
                        {exported
                            ? <><CheckCircle2 size={16} /> Exportiert!</>
                            : <><Download size={16} /> Exportieren</>}
                    </motion.button>
                </div>

                {toExport.length > 0 ? (
                    <div className="h-40 overflow-y-auto scrollbar-thin rounded-xl p-3 font-mono text-xs space-y-1"
                        style={{ background: 'rgba(0,0,0,0.3)' }}>
                        <p style={{ color: 'hsl(220,15%,45%)' }}>Name;Artikelnummer;Hersteller;Kategorie;Bild-URL</p>
                        {toExport.slice(0, 8).map(p => (
                            <p key={p.id} className="text-surface-100/60 truncate">
                                {p.name};{p.articleNumber};{p.manufacturer};{p.category};{p.imageUrl.substring(0, 40)}...
                            </p>
                        ))}
                        {toExport.length > 8 && <p style={{ color: 'hsl(220,15%,35%)' }}>... und {toExport.length - 8} weitere</p>}
                    </div>
                ) : (
                    <div className="flex flex-col items-center py-8 text-center">
                        <Package size={36} style={{ color: 'hsl(220,15%,25%)' }} className="mb-3" />
                        <p className="text-sm text-surface-100/30">Keine Produkte für diese Auswahl</p>
                    </div>
                )}
            </div>
        </div>
    );
}
