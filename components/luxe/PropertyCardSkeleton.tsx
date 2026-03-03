"use client"

import { cn } from "@/lib/utils"

interface PropertyCardSkeletonProps {
    className?: string
}

export function PropertyCardSkeleton({ className }: PropertyCardSkeletonProps) {
    return (
        <div
            className={cn(
                "flex flex-col bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden",
                className
            )}
        >
            {/* Image Skeleton */}
            <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                <div className="absolute inset-0 shimmer" />
            </div>

            {/* Content Skeleton */}
            <div className="p-4 flex flex-col flex-1 space-y-3">
                {/* Title & Badge */}
                <div className="flex justify-between items-start">
                    <div className="h-5 w-3/4 bg-slate-100 rounded shimmer" />
                    <div className="h-5 w-12 bg-slate-100 rounded shimmer" />
                </div>

                {/* Location */}
                <div className="h-4 w-1/2 bg-slate-100 rounded shimmer" />

                {/* Price */}
                <div className="h-6 w-1/3 bg-slate-100 rounded shimmer" />

                {/* Features Row */}
                <div className="flex gap-4 pt-3 border-t border-slate-50">
                    <div className="h-4 w-12 bg-slate-100 rounded shimmer" />
                    <div className="h-4 w-14 bg-slate-100 rounded shimmer" />
                    <div className="h-4 w-16 bg-slate-100 rounded shimmer" />
                </div>
            </div>

            {/* Shimmer animation */}
            <style jsx>{`
                .shimmer {
                    background: linear-gradient(
                        90deg,
                        transparent 0%,
                        rgba(255, 255, 255, 0.5) 50%,
                        transparent 100%
                    );
                    background-size: 200% 100%;
                    animation: shimmer 1.5s infinite;
                }
                @keyframes shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
            `}</style>
        </div>
    )
}
