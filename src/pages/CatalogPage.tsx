import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Grid3X3, List, Star, StarOff, Trash2, ExternalLink,
    Package, Filter, X, Tag, Globe,
} from 'lucide-react';
import { useAppStore, Product } from '../store';

function ProductCard({ product, onRemove, onToggleStar, view }:
    { product: Product; onRemove: () => void; onToggleStar: () => void; view: 'grid' | 'list' }) {
    const [imgError, setImgError] = useState(false);
    const openUrl = () => (window as any).electronAPI?.shell.openExternal(product.url);

    if (view === 'list') {
        return (
            <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 p-3 rounded-xl transition-colors group"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
                <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.05)' }}>
                    {!imgError && product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover"
                            onError={() => setImgError(true)} />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Package size={20} style={{ color: 'hsl(220,15%,35%)' }} />
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{product.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                        {product.articleNumber && (
                            <span className="text-xs font-mono text-brand-400">{product.articleNumber}</span>
                        )}
                        <span className="text-xs text-surface-100/30">{product.manufacturer}</span>
                    </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={onToggleStar} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5">
                        {product.starred
                            ? <Star size={13} className="text-yellow-400 fill-yellow-400" />
                            : <StarOff size={13} className="text-surface-100/30" />}
                    </button>
                    <button onClick={openUrl} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5">
                        <ExternalLink size={13} className="text-surface-100/30" />
                    </button>
                    <button onClick={onRemove} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/10">
                        <Trash2 size={13} className="text-red-400/50" />
                    </button>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="glass-card-hover overflow-hidden flex flex-col group"
        >
            {/* Image */}
            <div className="relative h-44 overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                {!imgError && product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={() => setImgError(true)} />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Package size={40} style={{ color: 'hsl(220,15%,25%)' }} />
                    </div>
                )}
                {/* Overlay actions */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200
                        flex items-start justify-end p-2 gap-1"
                    style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)' }}>
                    <button onClick={onToggleStar}
                        className="w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-sm"
                        style={{ background: 'rgba(0,0,0,0.4)' }}>
                        {product.starred
                            ? <Star size={14} className="text-yellow-400 fill-yellow-400" />
                            : <Star size={14} className="text-white/60" />}
                    </button>
                    <button onClick={openUrl}
                        className="w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-sm"
                        style={{ background: 'rgba(0,0,0,0.4)' }}>
                        <ExternalLink size={14} className="text-white/60" />
                    </button>
                    <button onClick={onRemove}
                        className="w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-sm"
                        style={{ background: 'rgba(0,0,0,0.4)' }}>
                        <Trash2 size={14} className="text-red-300/70" />
                    </button>
                </div>
                {/* Manufacturer badge */}
                <div className="absolute bottom-2 left-2">
                    <span className="text-xs px-2 py-0.5 rounded-full backdrop-blur-sm font-medium"
                        style={{ background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.7)' }}>
                        {product.manufacturer}
                    </span>
                </div>
            </div>

            {/* Info */}
            <div className="p-3 flex flex-col gap-1 flex-1">
                <p className="text-sm font-semibold text-white leading-tight line-clamp-2">{product.name}</p>
                {product.articleNumber && (
                    <p className="text-xs font-mono text-brand-400 truncate">{product.articleNumber}</p>
                )}
                {product.description && (
                    <p className="text-xs text-surface-100/40 line-clamp-2 mt-1">{product.description}</p>
                )}
            </div>
        </motion.div>
    );
}

export default function CatalogPage() {
    const {
        products, removeProduct, toggleStar, updateProduct,
        searchQuery, setSearchQuery,
        filterManufacturer, setFilterManufacturer,
        viewMode, setViewMode,
        clearProducts,
    } = useAppStore();

    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [filterStarred, setFilterStarred] = useState(false);

    const manufacturers = [...new Set(products.map(p => p.manufacturer))].sort();

    const filtered = products.filter(p => {
        if (filterManufacturer && p.manufacturer !== filterManufacturer) return false;
        if (filterStarred && !p.starred) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return p.name.toLowerCase().includes(q) ||
                p.articleNumber.toLowerCase().includes(q) ||
                p.description.toLowerCase().includes(q) ||
                p.manufacturer.toLowerCase().includes(q);
        }
        return true;
    });

    return (
        <div className="p-6 space-y-5 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Produktkatalog</h1>
                    <p className="text-sm text-surface-100/40 mt-1">{filtered.length} von {products.length} Produkten</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setViewMode('grid')}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${viewMode === 'grid' ? 'bg-brand-500/20 text-brand-400' : 'text-surface-100/30 hover:text-surface-100/60'}`}>
                        <Grid3X3 size={16} />
                    </button>
                    <button onClick={() => setViewMode('list')}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${viewMode === 'list' ? 'bg-brand-500/20 text-brand-400' : 'text-surface-100/30 hover:text-surface-100/60'}`}>
                        <List size={16} />
                    </button>
                    {products.length > 0 && (
                        <button onClick={() => setShowClearConfirm(true)} className="btn-danger ml-2">
                            <Trash2 size={14} /> Alle löschen
                        </button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 max-w-sm">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-100/30" />
                    <input
                        className="input-field pl-9 py-2.5 text-xs"
                        placeholder="Suchen nach Name, Artikelnummer..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-100/30 hover:text-white">
                            <X size={12} />
                        </button>
                    )}
                </div>

                <select
                    className="input-field py-2.5 text-xs w-48"
                    value={filterManufacturer}
                    onChange={e => setFilterManufacturer(e.target.value)}
                >
                    <option value="">Alle Hersteller</option>
                    {manufacturers.map(m => <option key={m} value={m}>{m}</option>)}
                </select>

                <button
                    onClick={() => setFilterStarred(!filterStarred)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all ${filterStarred ? 'bg-yellow-400/15 border border-yellow-400/25 text-yellow-300' : 'btn-ghost'
                        }`}
                >
                    <Star size={13} className={filterStarred ? 'fill-yellow-300' : ''} />
                    Favoriten
                </button>
            </div>

            {/* Clear Confirm */}
            <AnimatePresence>
                {showClearConfirm && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="glass-card p-4 flex items-center justify-between"
                        style={{ border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.08)' }}>
                        <p className="text-sm text-red-300">Alle {products.length} Produkte wirklich löschen?</p>
                        <div className="flex gap-2">
                            <button className="btn-ghost text-xs py-1.5 px-3" onClick={() => setShowClearConfirm(false)}>Abbrechen</button>
                            <button className="btn-danger text-xs py-1.5 px-3" onClick={() => { clearProducts(); setShowClearConfirm(false); }}>
                                Löschen
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Product grid / list */}
            <div className="flex-1 overflow-y-auto scrollbar-thin -mx-1 px-1">
                {products.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        <Package size={48} style={{ color: 'hsl(220,15%,25%)' }} className="mb-4" />
                        <p className="text-surface-100/30 font-medium">Noch keine Produkte im Katalog</p>
                        <p className="text-xs text-surface-100/20 mt-1">Starten Sie eine Extraktion im Tab "Extraktion"</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        <Search size={40} style={{ color: 'hsl(220,15%,25%)' }} className="mb-4" />
                        <p className="text-surface-100/30 font-medium">Keine Produkte gefunden</p>
                        <p className="text-xs text-surface-100/20 mt-1">Filter anpassen</p>
                    </div>
                ) : (
                    <motion.div layout className={
                        viewMode === 'grid'
                            ? 'grid grid-cols-auto-fill gap-4'
                            : 'flex flex-col gap-2'
                    }>
                        {filtered.map(product => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                view={viewMode}
                                onRemove={() => removeProduct(product.id)}
                                onToggleStar={() => toggleStar(product.id)}
                            />
                        ))}
                    </motion.div>
                )}
            </div>
        </div>
    );
}
