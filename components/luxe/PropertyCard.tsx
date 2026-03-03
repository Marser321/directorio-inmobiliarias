'use client';

import { motion } from 'framer-motion';
import { MapPin, Bed, Bath, Maximize2, Heart, Scale } from 'lucide-react';
import { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useFavorites } from '@/hooks/useFavorites';
import { useCompare } from '@/hooks/useCompare';
import { CardContainer, CardBody, CardItem } from '@/components/ui/3d-card';

interface Property {
    id: number | string;
    title: string;
    slug?: string | null;
    price: number;
    currency: string | null;
    bedrooms: number | null;
    bathrooms: number | null;
    built_area: number | null;
    main_image: string | null;
    images?: string[] | null;
    location?: string | null;
    location_name?: string | null;
    status?: string;
    lifestyle_tags?: string[] | null;
    is_featured?: boolean;
    boost_level?: number | null;
}

interface PropertyCardProps {
    property: Property;
    onHover?: (id: string | number | null) => void;
    onClick?: (id: string | number) => void;
    index?: number;
    className?: string;
}

const BLUR_PLACEHOLDER = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAUH/8QAIhAAAQMDBAMBAAAAAAAAAAAAAQIDBAAFEQYSITEHE0FR/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAZEQADAQEBAAAAAAAAAAAAAAAAAQIDESH/2gAMAwAAAhEDEQA/9oAzAeJLAuVwuMm4XJC21LUptDYBSgeAD9q60UjyGPQ14lkqf/Z';

export function PropertyCard({ property, onHover, onClick, index = 0, className = '' }: PropertyCardProps) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [imageLoaded, setImageLoaded] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Hook de favoritos
    const { isFavorite, toggleFavorite } = useFavorites();
    const isPropertyFavorite = isFavorite(property.id);
    const { isInCompare, toggleCompare, compareCount, maxCompareItems } = useCompare();
    const isPropertyInCompare = isInCompare(property.id);

    // Handle images safely
    const images = property.images?.length
        ? property.images
        : property.main_image
            ? [property.main_image]
            : [BLUR_PLACEHOLDER];

    // Handle location fallback
    const locationDisplay = property.location || property.location_name || 'Punta del Este';

    const handleMouseEnter = () => {
        onHover?.(property.id);

        if (images.length > 1) {
            intervalRef.current = setInterval(() => {
                setCurrentImageIndex((prev) => (prev + 1) % images.length);
            }, 2000);
        }
    };

    const handleMouseLeave = () => {
        onHover?.(null);
        setCurrentImageIndex(0);

        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    const formatPrice = (price: number, currency: string | null | undefined) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency || 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(price);
    };

    const isBoosted = (property.boost_level && property.boost_level >= 2) || false;
    const isPlatinum = (property.boost_level && property.boost_level >= 3) || false;

    return (
        <CardContainer className="inter-var h-full w-full" containerClassName={`py-0 ${className}`}>
            <CardBody className={`bg-card relative group/card dark:hover:shadow-2xl dark:hover:shadow-accent-gold-soft/20 dark:bg-black w-full h-full rounded-xl p-4 border transition-all duration-300 flex flex-col justify-between ${isBoosted
                ? 'border-accent-gold-soft shadow-lg shadow-accent-gold-soft/10'
                : 'dark:border-white/[0.1] border-black/[0.1]'
                }`}>

                <Link
                    href={`/property/${property.id}`}
                    className="block h-full group flex flex-col"
                    onClick={() => onClick?.(property.id)}
                >
                    <div
                        className="flex-1 flex flex-col"
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                    >
                        {/* Image Container with 3D Pop */}
                        <CardItem
                            translateZ="50"
                            className="w-full mt-2"
                        >
                            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl group-hover/card:shadow-xl shadow-md border border-border/50">
                                <div
                                    className="absolute inset-0 bg-cover bg-center blur-xl scale-110 transition-opacity duration-700"
                                    style={{
                                        backgroundImage: `url(${BLUR_PLACEHOLDER})`,
                                        opacity: imageLoaded ? 0 : 1
                                    }}
                                />

                                {/* Main Image Slider */}
                                <div className="absolute inset-0 overflow-hidden">
                                    {images.map((img, i) => (
                                        <motion.div
                                            key={i}
                                            className={`absolute inset-0 w-full h-full transition-opacity duration-700 ${i === currentImageIndex ? 'opacity-100' : 'opacity-0'}`}
                                            initial={false}
                                        >
                                            <Image
                                                src={img}
                                                alt={`${property.title} - Image ${i + 1}`}
                                                fill
                                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                className={`object-cover ${imageLoaded ? 'blur-0' : 'blur-sm'}`}
                                                priority={index < 2}
                                                unoptimized
                                                onLoad={() => setImageLoaded(true)}
                                            />
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Status Badge - Pops more */}
                                <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
                                    <CardItem translateZ="60" as="div">
                                        <span className="px-2.5 py-1 bg-black/70 backdrop-blur-md border border-accent-gold-soft/50 text-[10px] font-bold uppercase tracking-wider text-white rounded shadow-lg">
                                            {property.status?.replace('_', ' ') || 'En Venta'}
                                        </span>
                                    </CardItem>

                                    {isBoosted && (
                                        <CardItem translateZ="60" as="div">
                                            <span className={`px-2.5 py-1 backdrop-blur-md border text-[10px] font-bold uppercase tracking-wider text-white rounded shadow-lg ${isPlatinum
                                                ? 'bg-gradient-to-r from-slate-900 to-slate-800 border-slate-400'
                                                : 'bg-accent-gold-soft border-accent-gold-soft'
                                                }`}>
                                                {isPlatinum ? 'Platinum' : 'Destacado'}
                                            </span>
                                        </CardItem>
                                    )}
                                </div>

                                {/* Favorite + Compare Buttons - Pops most */}
                                <div className="absolute top-3 right-3 z-20">
                                    <CardItem translateZ="80" as="div" className="flex flex-col gap-2">
                                        <motion.button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                toggleFavorite(property.id);
                                            }}
                                            whileTap={{ scale: 0.9 }}
                                            aria-label="Agregar o quitar de favoritos"
                                            className={`p-2 rounded-full backdrop-blur-sm transition-all duration-300 shadow-lg ${isPropertyFavorite
                                                ? 'bg-accent-gold-soft text-white'
                                                : 'bg-white/90 text-foreground hover:bg-accent-gold-soft hover:text-white'
                                                }`}
                                        >
                                            <Heart className={`w-4 h-4 transition-transform ${isPropertyFavorite ? 'fill-current' : ''}`} />
                                        </motion.button>

                                        <motion.button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                if (!isPropertyInCompare && compareCount >= maxCompareItems) return;
                                                toggleCompare(property.id, 'search');
                                            }}
                                            whileTap={{ scale: 0.9 }}
                                            aria-label="Agregar o quitar en comparador"
                                            className={`p-2 rounded-full backdrop-blur-sm transition-all duration-300 shadow-lg ${isPropertyInCompare
                                                ? 'bg-slate-900 text-white'
                                                : 'bg-white/90 text-foreground hover:bg-slate-900 hover:text-white'
                                                }`}
                                        >
                                            <Scale className="w-4 h-4" />
                                        </motion.button>
                                    </CardItem>
                                </div>

                                {/* Image Indicators */}
                                {images.length > 1 && (
                                    <div className="absolute bottom-3 left-3 z-10 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {images.map((_, i) => (
                                            <span
                                                key={i}
                                                className={`h-1 rounded-full transition-all duration-300 shadow-sm ${i === currentImageIndex ? 'bg-accent-gold-soft w-4' : 'bg-white/80 w-1.5'}`}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CardItem>

                        {/* Content */}
                        <div className="mt-5 space-y-4 flex-1 flex flex-col justify-between">
                            <div className="flex justify-between items-start gap-4">
                                <CardItem
                                    translateZ="40"
                                    className="flex-1"
                                >
                                    <h3 className="font-serif text-xl font-bold text-foreground line-clamp-1 group-hover/card:text-accent-gold-strong transition-colors">
                                        {property.title}
                                    </h3>
                                    <div className="flex items-center text-muted-foreground text-sm mt-1.5 truncate">
                                        <MapPin className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 text-accent-gold-soft" />
                                        <span className="truncate">{locationDisplay}</span>
                                    </div>
                                </CardItem>

                                <CardItem
                                    translateZ="50"
                                    className="text-right flex-shrink-0"
                                >
                                    <span className="text-xl font-bold text-accent-gold-strong drop-shadow-sm">
                                        {formatPrice(property.price, property.currency)}
                                    </span>
                                </CardItem>
                            </div>

                            <div className="mt-auto pt-2">
                                <CardItem translateZ="30">
                                    <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent w-full mb-3" />
                                </CardItem>

                                <CardItem
                                    translateZ="40"
                                    className="flex justify-between text-xs font-medium text-muted-foreground"
                                >
                                    <span className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1.5 rounded-md border border-border/50 transition-colors group-hover/card:border-accent-gold-soft/30 group-hover/card:bg-accent-gold-soft/5">
                                        <Bed className="w-3.5 h-3.5 text-accent-gold-soft" />
                                        {property.bedrooms ?? 0} Dorm
                                    </span>
                                    <span className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1.5 rounded-md border border-border/50 transition-colors group-hover/card:border-accent-gold-soft/30 group-hover/card:bg-accent-gold-soft/5">
                                        <Bath className="w-3.5 h-3.5 text-accent-gold-soft" />
                                        {property.bathrooms ?? 0} Baños
                                    </span>
                                    {property.built_area && (
                                        <span className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1.5 rounded-md border border-border/50 transition-colors group-hover/card:border-accent-gold-soft/30 group-hover/card:bg-accent-gold-soft/5">
                                            <Maximize2 className="w-3.5 h-3.5 text-accent-gold-soft" />
                                            {property.built_area} m²
                                        </span>
                                    )}
                                </CardItem>
                            </div>
                        </div>
                    </div>
                </Link>
            </CardBody>
        </CardContainer>
    );
}
