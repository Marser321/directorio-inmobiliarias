'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

interface VirtualStagingProps {
    beforeImage: string;
    afterImage: string;
    beforeLabel?: string;
    afterLabel?: string;
    className?: string;
}

/**
 * VirtualStaging - Componente de slider Antes/Después
 * Permite comparar visualmente una propiedad vacía vs amueblada
 */
export function VirtualStaging({
    beforeImage,
    afterImage,
    beforeLabel = 'Antes',
    afterLabel = 'Después',
    className = ''
}: VirtualStagingProps) {
    const [sliderPosition, setSliderPosition] = useState(50);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Manejador de movimiento del slider
    const handleMove = useCallback((clientX: number) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));

        setSliderPosition(percentage);
    }, []);

    // Mouse events
    const handleMouseDown = () => setIsDragging(true);
    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging) handleMove(e.clientX);
    };

    // Touch events (mobile)
    const handleTouchMove = (e: React.TouchEvent) => {
        handleMove(e.touches[0].clientX);
    };

    // Keyboard accessibility
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowLeft') {
            setSliderPosition(prev => Math.max(0, prev - 5));
        } else if (e.key === 'ArrowRight') {
            setSliderPosition(prev => Math.min(100, prev + 5));
        }
    };

    // Global mouse up listener
    useEffect(() => {
        const handleGlobalMouseUp = () => setIsDragging(false);
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, []);

    return (
        <div
            ref={containerRef}
            className={`
        relative w-full aspect-video rounded-2xl overflow-hidden
        cursor-ew-resize select-none group
        ${className}
      `}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setIsDragging(false)}
            onTouchMove={handleTouchMove}
            role="slider"
            aria-label="Comparador de imagen antes/después"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(sliderPosition)}
            tabIndex={0}
            onKeyDown={handleKeyDown}
        >
            {/* Imagen "Después" (fondo completo) */}
            <div className="absolute inset-0">
                <Image
                    src={afterImage}
                    alt={afterLabel}
                    fill
                    className="object-cover"
                    priority
                />
            </div>

            {/* Imagen "Antes" (recortada) */}
            <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${sliderPosition}%` }}
            >
                <div className="relative w-full h-full" style={{ width: `${100 / (sliderPosition / 100)}%` }}>
                    <Image
                        src={beforeImage}
                        alt={beforeLabel}
                        fill
                        className="object-cover"
                        priority
                    />
                </div>
            </div>

            {/* Línea divisora */}
            <motion.div
                className="absolute top-0 bottom-0 w-1 bg-white shadow-2xl z-10"
                style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
                animate={{
                    boxShadow: isDragging
                        ? '0 0 20px rgba(212, 175, 55, 0.6)'
                        : '0 0 10px rgba(0,0,0,0.3)'
                }}
            >
                {/* Handle del slider */}
                <motion.div
                    className={`
            absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
            w-12 h-12 rounded-full bg-white shadow-xl
            flex items-center justify-center
            ${isDragging ? 'scale-110' : 'scale-100'}
            transition-transform duration-200
          `}
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleMouseDown}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                >
                    {/* Flechas */}
                    <div className="flex items-center gap-1 text-gray-600">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                </motion.div>
            </motion.div>

            {/* Labels */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="absolute top-4 left-4 z-20"
            >
                <span className="
          px-3 py-1.5 rounded-full text-sm font-medium
          bg-black/60 backdrop-blur-sm text-white
        ">
                    {beforeLabel}
                </span>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="absolute top-4 right-4 z-20"
            >
                <span className="
          px-3 py-1.5 rounded-full text-sm font-medium
          bg-gold/90 backdrop-blur-sm text-white
        ">
                    {afterLabel}
                </span>
            </motion.div>

            {/* Hint de interacción (se oculta después de mover) */}
            {sliderPosition === 50 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20"
                >
                    <span className="
            px-4 py-2 rounded-full text-xs font-medium
            bg-black/60 backdrop-blur-sm text-white
            opacity-60 group-hover:opacity-100 transition-opacity
          ">
                        ← Deslizá para comparar →
                    </span>
                </motion.div>
            )}
        </div>
    );
}

export default VirtualStaging;
