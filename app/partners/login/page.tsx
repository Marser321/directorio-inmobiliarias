import { Suspense } from 'react'
import LoginContent from './LoginContent'

// Force dynamic for secure login flow
export const dynamic = 'force-dynamic'

function LoginLoading() {
    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={<LoginLoading />}>
            <LoginContent />
        </Suspense>
    )
}
