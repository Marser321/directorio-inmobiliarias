'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function DebugPage() {
    const [logs, setLogs] = useState<string[]>([])
    const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toISOString().split('T')[1].split('.')[0]} - ${msg}`])

    useEffect(() => {
        const runTests = async () => {
            addLog('🚀 STARTING DIAGNOSTICS...')

            // 1. Check LocalStorage
            try {
                window.localStorage.setItem('test', 'ok')
                const val = window.localStorage.getItem('test')
                window.localStorage.removeItem('test')
                addLog(`✅ LocalStorage OK (val=${val})`)
            } catch (e: unknown) {
                const message = e instanceof Error ? e.message : 'Unknown error'
                addLog(`❌ LocalStorage FAILED: ${message}`)
            }

            // 2. Check Supabase Config
            const supabase = createSupabaseBrowserClient()
            const url = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL
            const key = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY
            addLog(`ℹ️ Supabase Config: URL=${url ? 'Yes' : 'MISSING'}, Key=${key ? 'Yes' : 'MISSING'}`)

            if (!url) {
                addLog('❌ FATAL: NEXT_PUBLIC_INSFORGE_BASE_URL is missing!')
                return
            }

            // 3. Check Network Connectivity to Supabase (simple fetch)
            try {
                addLog(`⏳ Testing connectivity to ${url}...`)
                // Ping verify/health endpoint or just root
                // Supabase URLs usually respond with 404 or something on root, but if network is blocked it will time out
                const controller = new AbortController()
                const timeoutId = setTimeout(() => controller.abort(), 5000)

                const res = await fetch(`${url}/auth/v1/health`, {
                    method: 'GET',
                    headers: { 'apikey': key || '' },
                    signal: controller.signal
                })
                clearTimeout(timeoutId)
                addLog(`✅ Connectivity OK: Status ${res.status} ${res.statusText}`)
            } catch (e: unknown) {
                if (e instanceof Error && e.name === 'AbortError') {
                    addLog('❌ Connectivity TIMED OUT (5s). Network blocked?')
                } else {
                    const message = e instanceof Error ? e.message : 'Unknown error'
                    addLog(`❌ Connectivity FAILED: ${message}`)
                }
            }

            // 4. Check getSession directly
            addLog('⏳ Testing supabase.auth.getSession()...')
            try {
                const sessionPromise = supabase.auth.getSession()
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout 5s')), 5000))

                const sessionResult = await Promise.race([sessionPromise, timeoutPromise]) as Awaited<typeof sessionPromise>
                const { data, error } = sessionResult

                if (error) {
                    addLog(`❌ getSession Error: ${error.message}`)
                } else {
                    addLog(`✅ getSession Success: Has Session? ${!!data.session}`)
                    if (data.session) {
                        addLog(`   User: ${data.session.user.email}`)
                    }
                }
            } catch (e: unknown) {
                const message = e instanceof Error ? e.message : 'Unknown error'
                addLog(`❌ getSession CRASH/TIMEOUT: ${message}`)
            }

            addLog('🏁 DIAGNOSTICS COMPLETE')
        }

        runTests()
    }, [])

    return (
        <div className="p-8 bg-black min-h-screen text-green-400 font-mono text-sm">
            <h1 className="text-xl font-bold mb-4 text-white">🕵️ Supabase Connectivity Diagnostic</h1>
            <div className="border border-green-800 p-4 rounded bg-gray-900 overflow-auto max-h-[80vh]">
                {logs.map((log, i) => (
                    <div key={i} className="mb-1 border-b border-gray-800 pb-1">{log}</div>
                ))}
            </div>
            <div className="mt-4">
                <button
                    onClick={() => window.location.reload()}
                    className="bg-green-700 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                    Run Again
                </button>
                <Link
                    href="/partners/dashboard"
                    className="ml-4 text-gray-400 hover:text-white underline"
                >
                    Back to Dashboard
                </Link>
            </div>
        </div>
    )
}
