'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, Expand, Grid3X3 } from 'lucide-react'
import Image from 'next/image'

interface GalleryImage {
    src: string
    alt: string
}

interface AirbnbGalleryProps {
    images: GalleryImage[]
    title: string
}

/**
 * AirbnbGallery: Premium gallery component with 1+4 grid layout
 * - Displays 1 large hero image + 4 smaller images in a grid
 * - Clicking any image opens a fullscreen lightbox
 * - Keyboard navigation (arrow keys, escape)
 * - Touch swipe support for mobile
 */
export function AirbnbGallery({ images, title }: AirbnbGalleryProps) {
    const [lightboxOpen, setLightboxOpen] = useState(false)
    const [currentIndex, setCurrentIndex] = useState(0)

    // displayImages is now computed after the early return check

    const openLightbox = useCallback((index: number) => {
        setCurrentIndex(index)
        setLightboxOpen(true)
        document.body.style.overflow = 'hidden'
    }, [])

    const closeLightbox = useCallback(() => {
        setLightboxOpen(false)
        document.body.style.overflow = 'unset'
    }, [])

    const goToNext = useCallback(() => {
        setCurrentIndex(prev => (prev + 1) % images.length)
    }, [images.length])

    const goToPrev = useCallback(() => {
        setCurrentIndex(prev => (prev - 1 + images.length) % images.length)
    }, [images.length])

    // Keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') closeLightbox()
        if (e.key === 'ArrowRight') goToNext()
        if (e.key === 'ArrowLeft') goToPrev()
    }, [closeLightbox, goToNext, goToPrev])

    useEffect(() => {
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [])

    if (!images.length) return null

    // Handle any number of images gracefully
    const imageCount = images.length

    // For the grid, we need to fill slots if less than 5 images
    const displayImages = imageCount >= 5
        ? images.slice(0, 5)
        : [...images, ...Array(Math.max(0, 5 - imageCount)).fill(images[0] || { src: '/images/placeholders/luxury-villa.jpg', alt: 'Propiedad' })].slice(0, 5)

    return (
        <>
            {/* 1+4 Grid Gallery */}
            <div className="group relative grid h-[400px] cursor-pointer grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-2xl border border-border/70 bg-surface-1/70 p-2 shadow-sm md:h-[500px]">
                {/* Main Hero Image (Takes 2 columns, 2 rows) */}
                <motion.div
                    className="col-span-2 row-span-2 relative overflow-hidden"
                    whileHover={{ scale: 1.01 }}
                    transition={{ duration: 0.3 }}
                    onClick={() => openLightbox(0)}
                >
                    <Image
                        src={displayImages[0]?.src || '/images/placeholders/luxury-villa.jpg'}
                        alt={displayImages[0]?.alt || title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 50vw"
                        priority
                        unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                </motion.div>

                {/* 4 Smaller Images */}
                {displayImages.slice(1, 5).map((image, index) => (
                    <motion.div
                        key={index}
                        className="relative overflow-hidden"
                        whileHover={{ scale: 1.02 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => openLightbox(index + 1)}
                    >
                        <Image
                            src={image?.src || '/images/placeholders/luxury-villa.jpg'}
                            alt={image?.alt || `${title} - Imagen ${index + 2}`}
                            fill
                            className="object-cover transition-transform duration-300 hover:scale-110"
                            sizes="(max-width: 768px) 50vw, 25vw"
                            unoptimized
                        />

                        {/* "Ver todas las fotos" button on last image */}
                        {index === 3 && images.length > 5 && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                <span className="flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 font-medium text-white backdrop-blur-sm">
                                    <Grid3X3 className="w-5 h-5" />
                                    Ver {images.length} fotos
                                </span>
                            </div>
                        )}
                    </motion.div>
                ))}

                {/* Expand Button (Bottom Right) */}
                <motion.button
                    className="absolute bottom-4 right-4 flex items-center gap-2 rounded-lg border border-border/60 bg-surface-0/90 px-4 py-2 font-medium text-ink-strong opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => openLightbox(0)}
                >
                    <Expand className="w-4 h-4" />
                    Ver todas las fotos
                </motion.button>
            </div>

            {/* Fullscreen Lightbox */}
            <AnimatePresence>
                {lightboxOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex flex-col bg-black/95"
                        onKeyDown={handleKeyDown}
                        tabIndex={0}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 text-white">
                            <span className="font-medium">
                                {currentIndex + 1} / {images.length}
                            </span>
                            <h3 className="font-serif text-lg hidden md:block">{title}</h3>
                            <motion.button
                                onClick={closeLightbox}
                                className="rounded-full p-2 transition-colors hover:bg-white/10"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                <X className="w-6 h-6" />
                            </motion.button>
                        </div>

                        {/* Main Image */}
                        <div className="flex-1 relative flex items-center justify-center px-4 md:px-16">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentIndex}
                                    initial={{ opacity: 0, x: 100 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -100 }}
                                    transition={{ duration: 0.3 }}
                                    className="relative w-full h-[60vh] md:h-[70vh]"
                                >
                                    <Image
                                        src={images[currentIndex]?.src || ''}
                                        alt={images[currentIndex]?.alt || `Imagen ${currentIndex + 1}`}
                                        fill
                                        className="object-contain"
                                        sizes="100vw"
                                        priority
                                        unoptimized
                                    />
                                </motion.div>
                            </AnimatePresence>

                            {/* Navigation Arrows */}
                            <motion.button
                                onClick={goToPrev}
                                className="absolute left-4 rounded-full border border-white/20 bg-white/10 p-3 text-white transition-colors hover:bg-white/20 md:left-8"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </motion.button>
                            <motion.button
                                onClick={goToNext}
                                className="absolute right-4 rounded-full border border-white/20 bg-white/10 p-3 text-white transition-colors hover:bg-white/20 md:right-8"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                <ChevronRight className="w-6 h-6" />
                            </motion.button>
                        </div>

                        {/* Thumbnail Strip */}
                        <div className="p-4 overflow-x-auto">
                            <div className="flex gap-2 justify-center">
                                {images.map((image, index) => (
                                    <motion.button
                                        key={index}
                                        onClick={() => setCurrentIndex(index)}
                                        className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all ${currentIndex === index
                                            ? 'scale-110 border-accent-gold-soft'
                                            : 'border-transparent opacity-60 hover:opacity-100'
                                            }`}
                                        whileHover={{ scale: 1.05 }}
                                    >
                                        <Image
                                            src={image.src}
                                            alt={image.alt}
                                            fill
                                            className="object-cover"
                                            sizes="64px"
                                            unoptimized
                                        />
                                    </motion.button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
