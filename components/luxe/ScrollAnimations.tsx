'use client';

import { motion } from 'framer-motion';

interface ScrollRevealSectionProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
    direction?: 'up' | 'down' | 'left' | 'right';
}

export function ScrollRevealSection({
    children,
    className = '',
    delay = 0,
    direction = 'up'
}: ScrollRevealSectionProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: direction === 'up' ? 60 : direction === 'down' ? -60 : 0, x: direction === 'left' ? 60 : direction === 'right' ? -60 : 0 }}
            whileInView={{ opacity: 1, y: 0, x: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.8, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

interface StickySidebarProps {
    children: React.ReactNode;
    className?: string;
    topOffset?: number;
}

export function StickySidebar({
    children,
    className = '',
    topOffset = 100
}: StickySidebarProps) {
    return (
        <div className={`relative lg:h-fit ${className}`}>
            <motion.div
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="lg:sticky space-y-6"
                style={{ top: topOffset }}
            >
                {children}
            </motion.div>
        </div>
    );
}

interface FeatureRevealProps {
    features: string[];
    className?: string;
}

export function FeatureReveal({ features, className = '' }: FeatureRevealProps) {
    return (
        <div className={`grid grid-cols-2 md:grid-cols-3 gap-4 ${className}`}>
            {features.map((feature, index) => (
                <motion.div
                    key={feature}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05, duration: 0.4 }}
                    className="flex items-center gap-3 text-muted-foreground group cursor-default"
                >
                    <motion.div
                        className="w-2 h-2 bg-[#D4AF37] rounded-full"
                        whileHover={{ scale: 1.5 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                    />
                    <span className="group-hover:text-foreground transition-colors">{feature}</span>
                </motion.div>
            ))}
        </div>
    );
}

interface TextRevealProps {
    text: string;
    className?: string;
    as?: 'h1' | 'h2' | 'h3' | 'p';
}

export function TextReveal({ text, className = '', as: Component = 'p' }: TextRevealProps) {
    const words = text.split(' ');

    return (
        <Component className={className}>
            {words.map((word, index) => (
                <motion.span
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.03, duration: 0.3 }}
                    className="inline-block mr-[0.25em]"
                >
                    {word}
                </motion.span>
            ))}
        </Component>
    );
}
