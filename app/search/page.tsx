import { Suspense } from 'react'
import SearchContent from './SearchContent'
import { PropertyCardSkeleton } from '@/components/luxe/PropertyCardSkeleton'

// Force dynamic for search with filters
export const dynamic = 'force-dynamic'

function SearchLoading() {
    return (
        <div className="flex flex-col h-screen bg-white">
            <header className="flex-none h-16 border-b border-slate-100 flex items-center px-4 md:px-6 sticky top-0 bg-white/95 backdrop-blur-md z-50">
                <div className="font-serif font-bold text-xl tracking-tight text-slate-900">
                    Luxe<span className="text-[#D4AF37]">Estate</span>
                </div>
            </header>
            <div className="flex-1 p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <PropertyCardSkeleton key={i} />
                ))}
            </div>
        </div>
    )
}

export default function SearchPage() {
    return (
        <Suspense fallback={<SearchLoading />}>
            <SearchContent />
        </Suspense>
    )
}
