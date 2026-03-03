'use client';

import { useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { motion, useScroll, useTransform, useMotionTemplate, MotionValue } from 'framer-motion';

interface Caption {
    at: number; // 0-1 progress when it appears
    text: string;
    position?: 'center' | 'bottom-left' | 'bottom-right';
}

interface CanvasSequenceAnimatorProps {
    frameCount: number;
    frameUrlPattern: string; // e.g., "/sequences/mansion/frame_{index}.png"
    captions?: Caption[];
    className?: string;
    children?: ReactNode | ((progress: MotionValue<number>) => ReactNode);
}

export function CanvasSequenceAnimator({
    frameCount,
    frameUrlPattern,
    captions = [],
    className = '',
    children,
}: CanvasSequenceAnimatorProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [images, setImages] = useState<HTMLImageElement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadProgress, setLoadProgress] = useState(0);

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ['start start', 'end end'],
    });

    // Preload all images with progress tracking
    useEffect(() => {
        let isMounted = true;
        let loadedCount = 0;

        console.log(`Starting to load ${frameCount} images for sequence: ${frameUrlPattern}`);

        const loadImage = (index: number): Promise<HTMLImageElement> => {
            return new Promise((resolve, reject) => {
                const paddedIndex = String(index).padStart(4, '0');
                const url = frameUrlPattern.replace('{index}', paddedIndex);
                const img = new Image();

                img.onload = () => {
                    loadedCount++;
                    if (isMounted) {
                        setLoadProgress((loadedCount / frameCount) * 100);
                    }
                    resolve(img);
                };

                img.onerror = () => {
                    console.error(`Failed to load image at: ${url}`);
                    reject(new Error(`Failed to load: ${url}`));
                };
                img.src = url;
            });
        };

        const loadAllImages = async () => {
            try {
                const promises = Array.from({ length: frameCount }, (_, i) => loadImage(i + 1));
                const allImages = await Promise.all(promises);

                if (isMounted) {
                    console.log('All images loaded successfully');
                    setImages(allImages);
                    setIsLoading(false);
                }
            } catch (error) {
                console.error('Error loading sequence images:', error);
                // Even if some fail, let's try to proceed if we have some images? 
                // Or at least set loading false so we don't get stuck.
                if (isMounted) setIsLoading(false);
            }
        };

        loadAllImages();

        return () => {
            isMounted = false;
        };
    }, [frameCount, frameUrlPattern]);

    // Draw the current frame based on scroll position
    const drawFrame = useCallback(
        (progress: number) => {
            if (images.length === 0) return;

            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const frameIndex = Math.min(
                Math.floor(progress * (images.length - 1)),
                images.length - 1
            );

            const img = images[frameIndex];
            if (!img) return;

            // Get current canvas dimensions
            const rect = canvas.getBoundingClientRect();

            // Set canvas size for retina displays
            const dpr = window.devicePixelRatio || 1;
            if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
                canvas.width = rect.width * dpr;
                canvas.height = rect.height * dpr;
                ctx.scale(dpr, dpr);
            }

            // Clear canvas
            ctx.clearRect(0, 0, rect.width, rect.height);

            // Calculate cover dimensions (like CSS object-fit: cover)
            const imgAspect = img.width / img.height;
            const canvasAspect = rect.width / rect.height;

            let drawWidth: number;
            let drawHeight: number;
            let drawX: number;
            let drawY: number;

            if (imgAspect > canvasAspect) {
                drawHeight = rect.height;
                drawWidth = drawHeight * imgAspect;
                drawX = (rect.width - drawWidth) / 2;
                drawY = 0;
            } else {
                drawWidth = rect.width;
                drawHeight = drawWidth / imgAspect;
                drawX = 0;
                drawY = (rect.height - drawHeight) / 2;
            }

            ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
        },
        [images]
    );

    // Subscribe to scroll progress changes
    useEffect(() => {
        if (images.length === 0) return;

        const unsubscribe = scrollYProgress.on('change', drawFrame);

        // Draw initial frame
        drawFrame(scrollYProgress.get());

        return () => unsubscribe();
    }, [images, scrollYProgress, drawFrame]);

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            drawFrame(scrollYProgress.get());
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [drawFrame, scrollYProgress]);

    return (
        <div
            ref={containerRef}
            className={`relative ${className}`}
            style={{ height: `${Math.max(frameCount * 6, 400)}vh` }}
        >
            {/* Sticky Canvas Container */}
            <div className="sticky top-0 h-screen w-full overflow-hidden">
                {/* Loading State & Fallback */}
                {isLoading && (
                    <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center z-20">
                        {/* Fallback Image while loading or if fails */}
                        <div
                            className="absolute inset-0 bg-cover bg-center opacity-50"
                            style={{ backgroundImage: 'url(/sequences/mansion/frame_0001.webp)' }}
                        />
                        <div className="relative z-10 w-64 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-[#D4AF37] via-[#F4E4BC] to-[#D4AF37]"
                                style={{ width: `${loadProgress}%` }}
                                transition={{ duration: 0.1 }}
                            />
                        </div>
                        <span className="relative z-10 mt-6 text-white/60 text-sm font-light tracking-wide">
                            Cargando experiencia inmersiva... {Math.round(loadProgress)}%
                        </span>
                    </div>
                )}

                {/* Canvas */}
                <canvas
                    ref={canvasRef}
                    className="w-full h-full"
                    style={{ display: isLoading ? 'none' : 'block' }}
                />

                {/* Gradient Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/20 pointer-events-none" />

                {/* Content Overlay (Hero text, Navbar, etc.) */}
                {children && (
                    <div className="absolute inset-0 z-10 pointer-events-none [&>*]:pointer-events-auto">
                        {typeof children === 'function'
                            ? (children as (progress: MotionValue<number>) => ReactNode)(scrollYProgress)
                            : children}
                    </div>
                )}

                {/* Captions */}
                {captions.map((caption, idx) => (
                    <CaptionOverlay
                        key={idx}
                        caption={caption}
                        scrollProgress={scrollYProgress}
                    />
                ))}

                {/* Scroll Hint (only at beginning) */}
                <ScrollHint scrollProgress={scrollYProgress} />
            </div>
        </div>
    );
}

// Kinetic 3D Caption Component - Text appears attached to surfaces
function CaptionOverlay({
    caption,
    scrollProgress,
}: {
    caption: Caption;
    scrollProgress: MotionValue<number>;
}) {
    // Opacity with longer visible duration
    const opacity = useTransform(
        scrollProgress,
        [caption.at - 0.06, caption.at - 0.02, caption.at + 0.1, caption.at + 0.18],
        [0, 1, 1, 0]
    );

    // Position-specific kinetic transforms
    const isCenter = caption.position === 'center' || !caption.position;
    const isLeft = caption.position === 'bottom-left';
    const isRight = caption.position === 'bottom-right';

    // Parallax Y movement (text rises from surface)
    const y = useTransform(
        scrollProgress,
        [caption.at - 0.06, caption.at, caption.at + 0.12],
        isCenter ? [80, 0, -40] : [60, 0, -30]
    );

    // 3D Rotation (tilted like on a surface)
    const rotateX = useTransform(
        scrollProgress,
        [caption.at - 0.06, caption.at, caption.at + 0.12],
        isCenter ? [25, 0, -15] : [20, 5, -10]
    );

    // Skew effect (perspective distortion)
    const skewX = useTransform(
        scrollProgress,
        [caption.at - 0.06, caption.at, caption.at + 0.12],
        isLeft ? [8, 0, -4] : isRight ? [-8, 0, 4] : [0, 0, 0]
    );

    const skewY = useTransform(
        scrollProgress,
        [caption.at - 0.06, caption.at + 0.06],
        isCenter ? [3, -2] : [2, -1]
    );

    // Scale with depth perception
    const scale = useTransform(
        scrollProgress,
        [caption.at - 0.06, caption.at, caption.at + 0.12],
        [0.85, 1, 1.05]
    );

    // Z-translation for depth
    const z = useTransform(
        scrollProgress,
        [caption.at - 0.06, caption.at, caption.at + 0.12],
        [-100, 0, 50]
    );

    // Blur for depth of field effect (using motion template for reactivity)
    const blurValue = useTransform(
        scrollProgress,
        [caption.at - 0.06, caption.at - 0.02, caption.at + 0.1, caption.at + 0.15],
        [4, 0, 0, 2]
    );
    const blurFilter = useMotionTemplate`blur(${blurValue}px)`;

    // Position styles with perspective origin
    const positionStyles: Record<string, { classes: string; origin: string }> = {
        center: {
            classes: 'inset-0 flex items-center justify-center',
            origin: 'center bottom',
        },
        'bottom-left': {
            classes: 'bottom-16 left-6 md:left-12 lg:left-20',
            origin: 'left bottom',
        },
        'bottom-right': {
            classes: 'bottom-16 right-6 md:right-12 lg:right-20',
            origin: 'right bottom',
        },
    };

    const position = caption.position || 'center';
    const { classes, origin } = positionStyles[position];

    return (
        <motion.div
            className={`absolute ${classes} pointer-events-none z-10`}
            style={{
                opacity,
                perspective: 1200,
                perspectiveOrigin: origin,
            }}
        >
            <motion.div
                style={{
                    y,
                    rotateX,
                    skewX,
                    skewY,
                    scale,
                    z,
                    filter: blurFilter,
                    transformStyle: 'preserve-3d',
                }}
            >
                <h2
                    className={`
                        font-serif font-bold leading-tight
                        ${isCenter
                            ? 'text-5xl md:text-7xl lg:text-8xl text-center max-w-4xl'
                            : 'text-3xl md:text-5xl lg:text-6xl text-left max-w-xl'
                        }
                        text-white
                    `}
                    style={{
                        textShadow: `
                            0 4px 20px rgba(0,0,0,0.8),
                            0 8px 40px rgba(0,0,0,0.6),
                            0 0 80px rgba(212,175,55,0.3)
                        `,
                        WebkitTextStroke: '0.5px rgba(255,255,255,0.1)',
                    }}
                >
                    {caption.text}
                </h2>
                {/* Reflection/shadow on ground effect */}
                {isCenter && (
                    <div
                        className="absolute top-full left-0 right-0 h-20 opacity-20 pointer-events-none"
                        style={{
                            background: 'linear-gradient(to bottom, rgba(255,255,255,0.1), transparent)',
                            transform: 'scaleY(-0.3) rotateX(180deg)',
                            filter: 'blur(8px)',
                        }}
                    />
                )}
            </motion.div>
        </motion.div>
    );
}

// Scroll Indicator that fades out
function ScrollHint({ scrollProgress }: { scrollProgress: MotionValue<number> }) {
    const opacity = useTransform(scrollProgress, [0, 0.05], [1, 0]);

    return (
        <motion.div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2"
            style={{ opacity }}
        >
            <span className="text-white/60 text-xs uppercase tracking-widest font-light">
                Hacer scroll para explorar
            </span>
            <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                className="w-6 h-10 border-2 border-white/40 rounded-full flex items-start justify-center p-2"
            >
                <div className="w-1.5 h-3 bg-[#D4AF37] rounded-full" />
            </motion.div>
        </motion.div>
    );
}
