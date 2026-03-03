'use client'

function SkeletonItem({ className }: { className?: string }) {
    return (
        <div className={`relative overflow-hidden bg-muted/20 ${className}`}>
            <div className="absolute inset-0 translate-x-[-100%] animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        </div>
    )
}

export function DashboardSkeleton() {
    return (
        <div className="min-h-[calc(100vh-4rem)] p-6 md:p-8 space-y-8">
            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-3">
                    <SkeletonItem className="h-10 w-64 rounded-xl bg-muted/40" />
                    <SkeletonItem className="h-5 w-96 rounded-lg bg-muted/30" />
                </div>
                <SkeletonItem className="h-12 w-40 rounded-xl bg-gold/10" />
            </div>

            {/* Stats Grid Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-32 rounded-xl border border-border/50 p-5 bg-background/50 relative overflow-hidden">
                        <div className="flex justify-between items-start mb-4">
                            <SkeletonItem className="h-4 w-24 rounded" />
                            <SkeletonItem className="h-8 w-8 rounded-lg" />
                        </div>
                        <SkeletonItem className="h-8 w-32 rounded mb-2" />
                        <SkeletonItem className="h-3 w-20 rounded" />
                    </div>
                ))}
            </div>

            {/* Table/Content Skeleton */}
            <div className="glass-card rounded-xl overflow-hidden border border-border/50">
                <div className="p-5 border-b border-border/20 flex justify-between">
                    <SkeletonItem className="h-6 w-48 rounded" />
                    <SkeletonItem className="h-4 w-24 rounded" />
                </div>
                <div className="p-4 space-y-5">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex gap-4 items-center">
                            <SkeletonItem className="w-16 h-12 rounded-lg bg-muted/30" />
                            <div className="flex-1 space-y-2">
                                <SkeletonItem className="h-5 w-1/3 rounded" />
                                <SkeletonItem className="h-3 w-1/4 rounded" />
                            </div>
                            <SkeletonItem className="w-24 h-8 rounded-full" />
                            <SkeletonItem className="w-12 h-6 rounded" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Quick Actions Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-32 rounded-xl border border-border/30 bg-background/30 p-6 flex flex-col justify-center space-y-3">
                        <SkeletonItem className="h-8 w-8 rounded-lg mb-2" />
                        <SkeletonItem className="h-5 w-48 rounded" />
                        <SkeletonItem className="h-3 w-full rounded" />
                    </div>
                ))}
            </div>
        </div>
    )
}
