'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ActiveLinkProps {
    href: string;
    children: React.ReactNode;
    className?: string;
}

export function ActiveLink({ href, children, className }: ActiveLinkProps) {
    const pathname = usePathname();
    const isActive = pathname === href;
    const [isHovered, setIsHovered] = useState(false);

    return (
        <Link
            href={href}
            className={cn("relative px-1 py-2 text-sm font-medium transition-colors hover:text-foreground/80", isActive ? "text-foreground" : "text-muted-foreground", className)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {children}
            {isActive && (
                <motion.span
                    layoutId="nav-dot"
                    className="absolute -bottom-1 left-0 right-0 h-1 bg-[#D4AF37] rounded-full mx-auto w-1"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
            )}
            {isHovered && !isActive && (
                <motion.span
                    layoutId="nav-dot-hover"
                    className="absolute -bottom-1 left-0 right-0 h-1 bg-[#D4AF37]/50 rounded-full mx-auto w-1"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    transition={{ duration: 0.2 }}
                />
            )}
        </Link>
    );
}
