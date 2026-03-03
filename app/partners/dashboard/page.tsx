import { Suspense } from 'react'
import DashboardContent from './DashboardContent'

// Force dynamic rendering for dashboard with auth
export const dynamic = 'force-dynamic'

function DashboardLoading() {
    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        </div>
    )
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<DashboardLoading />}>
            <DashboardContent />
        </Suspense>
    )
}
