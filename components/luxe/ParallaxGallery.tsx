'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { MapPin } from 'lucide-react';

interface ParallaxGalleryImage {
    src: string;
    alt: string;
    caption?: string;
}

interface ParallaxGalleryProps {
    images: ParallaxGalleryImage[];
    title: string;
    location: string;
    badge?: string;
    id?: number | string;
}

export function ParallaxGallery({ images, title, location, badge, id }: ParallaxGalleryProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ['start start', 'end start']
    });

    // Smooth spring animation for parallax
    const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

    // Hero image parallax (slower movement)
    const heroY = useTransform(smoothProgress, [0, 1], ['0%', '30%']);
    const heroScale = useTransform(smoothProgress, [0, 0.5], [1, 1.1]);

    // Text parallax (faster movement)
    const textY = useTransform(smoothProgress, [0, 1], ['0%', '100%']);
    const textOpacity = useTransform(smoothProgress, [0, 0.3], [1, 0]);

    // Overlay gradient intensity
    const overlayOpacity = useTransform(smoothProgress, [0, 0.5], [0.4, 0.8]);

    const mainImage = images[0] || { src: '/images/placeholders/luxury-villa.jpg', alt: 'Property' };
    const secondaryImages = images.slice(1, 5);

    return (
        <div ref={containerRef} className="relative">
            {/* HERO IMAGE with Parallax */}
            <section className="relative h-[85vh] overflow-hidden">
                <motion.div
                    style={{ y: heroY, scale: heroScale }}
                    className="absolute inset-0 w-full h-[120%] -top-[10%]"
                    layoutId={id ? `property-image-${id}` : undefined}
                >
                    <Image
                        src={mainImage.src}
                        alt={mainImage.alt}
                        fill
                        unoptimized
                        sizes="100vw"
                        className="w-full h-full object-cover"
                    />
                </motion.div>

                {/* Gradient Overlay */}
                <motion.div
                    style={{ opacity: overlayOpacity }}
                    className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"
                />

                {/* Title Overlay with Parallax */}
                <motion.div
                    style={{ y: textY, opacity: textOpacity }}
                    className="absolute bottom-0 left-0 right-0 p-8 md:p-16 z-10"
                >
                    {badge && (
                        <Badge className="bg-[#D4AF37] text-white hover:bg-[#B8942F] text-sm uppercase px-4 py-1.5 mb-4 border-none">
                            {badge}
                        </Badge>
                    )}
                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold text-white tracking-tight max-w-4xl">
                        {title}
                    </h1>
                    <div className="flex items-center text-white/90 mt-4 text-lg md:text-xl">
                        <MapPin className="w-5 h-5 mr-2" />
                        {location}
                    </div>
                </motion.div>

                {/* Scroll Indicator */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 }}
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20"
                >
                    <motion.div
                        animate={{ y: [0, 8, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center pt-2"
                    >
                        <motion.div
                            animate={{ opacity: [1, 0], y: [0, 12] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="w-1.5 h-1.5 bg-white rounded-full"
                        />
                    </motion.div>
                </motion.div>
            </section>

            {/* REVEAL GALLERY - Staggered on scroll */}
            {secondaryImages.length > 0 && (
                <section className="relative bg-background py-8 -mt-24 z-20 rounded-t-3xl">
                    <div className="container mx-auto px-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                            {secondaryImages.map((img, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 60, scale: 0.9 }}
                                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                                    viewport={{ once: true, margin: '-100px' }}
                                    transition={{
                                        delay: index * 0.1,
                                        duration: 0.6,
                                        ease: [0.25, 0.46, 0.45, 0.94]
                                    }}
                                    whileHover={{ scale: 1.02 }}
                                    className="relative aspect-[4/3] rounded-xl overflow-hidden cursor-pointer group"
                                >
                                    <Image
                                        src={img.src}
                                        alt={img.alt}
                                        fill
                                        unoptimized
                                        sizes="(max-width: 768px) 50vw, 25vw"
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />

                                    {/* View overlay on last image */}
                                    {index === secondaryImages.length - 1 && (
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <span className="text-white font-bold text-lg border-b border-white pb-1">
                                                Ver todas ({images.length})
                                            </span>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}
