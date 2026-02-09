
'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

export function DebugLogger() {
    const [logs, setLogs] = useState<string[]>([])
    const [isOpen, setIsOpen] = useState(true)

    useEffect(() => {
        // Only capture explicitly named logs for clarity, or all?
        // Let's capture relevant ones nicely formatted.

        const originalLog = console.log
        const originalError = console.error
        const originalWarn = console.warn

        const safeStringify = (arg: any) => {
            try {
                if (typeof arg === 'object') return JSON.stringify(arg, null, 2)
                return String(arg)
            } catch {
                return '[Circular/Error]'
            }
        }

        console.log = (...args) => {
            // Filter for our hooks
            if (args[0] && typeof args[0] === 'string' && (args[0].startsWith('useAuth') || args[0].startsWith('useUserAgency'))) {
                setLogs(prev => [...prev, `🔵 LOG: ${args.map(safeStringify).join(' ')}`])
            }
            originalLog(...args)
        }

        console.error = (...args) => {
            setLogs(prev => [...prev, `🔴 ERR: ${args.map(safeStringify).join(' ')}`])
            originalError(...args)
        }

        console.warn = (...args) => {
            setLogs(prev => [...prev, `🟡 WARN: ${args.map(safeStringify).join(' ')}`])
            originalWarn(...args)
        }

        return () => {
            console.log = originalLog
            console.error = originalError
            console.warn = originalWarn
        }
    }, [])

    if (!isOpen) return (
        <button
            onClick={() => setIsOpen(true)}
            className="fixed bottom-4 right-4 bg-red-600 text-white px-3 py-1 rounded shadow-lg z-[9999] text-xs font-bold"
        >
            DEBUG LOGS
        </button>
    )

    return (
        <div className="fixed bottom-0 left-0 right-0 h-80 bg-black/95 text-green-400 p-2 overflow-auto z-[9999] font-mono text-xs border-t-2 border-green-500 shadow-2xl">
            <div className="flex justify-between items-center sticky top-0 bg-black border-b border-green-800 pb-2 mb-2">
                <h3 className="font-bold text-white uppercase tracking-widest">System Diagnostics</h3>
                <div className='flex gap-2'>
                    <button onClick={() => setLogs([])} className="bg-gray-800 text-white px-2 py-1 rounded hover:bg-gray-700">CLEAR</button>
                    <button onClick={() => setIsOpen(false)} className="bg-red-900 text-white px-2 py-1 rounded hover:bg-red-800"><X className="w-4 h-4" /></button>
                </div>
            </div>
            <div className="space-y-1">
                {logs.length === 0 && <div className="text-gray-500 italic">Waiting for logs... (Refresh page if empty)</div>}
                {logs.map((l, i) => (
                    <div key={i} className="whitespace-pre-wrap border-b border-gray-900 pb-1 font-mono hover:bg-gray-900 transition-colors">
                        {l}
                    </div>
                ))}
            </div>
        </div>
    )
}
