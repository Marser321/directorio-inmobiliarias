'use client';

import { motion } from 'framer-motion';

// Types
interface VibeFilters {
    surf: boolean;
    nightlife: boolean;
    silence: boolean;
    forest: boolean;
    beach: boolean;
}

type VibeFilter = keyof VibeFilters;

interface VibeTogglesProps {
    activeFilters: VibeFilters;
    onToggle: (filter: VibeFilter) => void;
    onClear: () => void;
}

// Toggle button configurations
const TOGGLE_CONFIG: { key: VibeFilter; label: string; emoji: string; color: string; activeColor: string }[] = [
    { key: 'surf', label: 'Zona de Surf', emoji: '🏄', color: 'bg-blue-500/10', activeColor: 'bg-blue-500' },
    { key: 'nightlife', label: 'Vida Nocturna', emoji: '🌙', color: 'bg-red-500/10', activeColor: 'bg-red-500' },
    { key: 'silence', label: 'Silencio Total', emoji: '🧘', color: 'bg-green-500/10', activeColor: 'bg-green-500' },
    { key: 'forest', label: 'Bosque', emoji: '🌲', color: 'bg-lime-500/10', activeColor: 'bg-lime-500' },
    { key: 'beach', label: 'Playa', emoji: '🏖️', color: 'bg-amber-500/10', activeColor: 'bg-amber-500' },
];

export default function VibeToggles({ activeFilters, onToggle, onClear }: VibeTogglesProps) {
    const hasActiveFilters = Object.values(activeFilters).some(Boolean);

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-4 left-4 z-[1000] flex flex-col gap-2"
        >
            {/* Glassmorphism Container */}
            <div className="backdrop-blur-xl bg-white/80 dark:bg-neutral-900/80 rounded-2xl shadow-xl border border-white/20 p-3">
                {/* Header */}
                <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                        Filtros de Estilo de Vida
                    </span>
                    {hasActiveFilters && (
                        <button
                            onClick={onClear}
                            className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
                        >
                            Limpiar
                        </button>
                    )}
                </div>

                {/* Toggle Buttons */}
                <div className="flex flex-wrap gap-2">
                    {TOGGLE_CONFIG.map(({ key, label, emoji, color, activeColor }) => {
                        const isActive = activeFilters[key];

                        return (
                            <motion.button
                                key={key}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => onToggle(key)}
                                className={`
                  flex items-center gap-2 px-3 py-2 rounded-xl
                  text-sm font-medium transition-all duration-200
                  ${isActive
                                        ? `${activeColor} text-white shadow-lg`
                                        : `${color} text-neutral-700 dark:text-neutral-200 hover:bg-opacity-20`
                                    }
                `}
                            >
                                <span className="text-base">{emoji}</span>
                                <span className="hidden sm:inline">{label}</span>
                            </motion.button>
                        );
                    })}
                </div>
            </div>

            {/* Active Filter Pills */}
            {hasActiveFilters && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-wrap gap-1.5"
                >
                    {TOGGLE_CONFIG.filter(t => activeFilters[t.key]).map(({ key, label, emoji, activeColor }) => (
                        <span
                            key={key}
                            className={`
                ${activeColor} text-white text-xs px-2.5 py-1 rounded-full
                flex items-center gap-1 shadow-md
              `}
                        >
                            {emoji} {label}
                        </span>
                    ))}
                </motion.div>
            )}
        </motion.div>
    );
}
