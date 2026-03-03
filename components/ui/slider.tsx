"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SliderProps {
    value: number[]
    min: number
    max: number
    step?: number
    onValueChange?: (value: number[]) => void
    onValueCommit?: (value: number[]) => void
    className?: string
}

export function Slider({
    value,
    min,
    max,
    step = 1,
    onValueChange,
    onValueCommit,
    className,
}: SliderProps) {
    const trackRef = React.useRef<HTMLDivElement>(null)
    const [isDragging, setIsDragging] = React.useState<number | null>(null)

    // Calculate percentage for positioning
    const getPercent = (val: number) => ((val - min) / (max - min)) * 100

    const leftPercent = getPercent(value[0])
    const rightPercent = getPercent(value[1])

    // Handle mouse/touch events
    const handlePointerDown = (thumbIndex: number) => (e: React.PointerEvent) => {
        e.preventDefault()
        setIsDragging(thumbIndex)
            ; (e.target as HTMLElement).setPointerCapture(e.pointerId)
    }

    const handlePointerMove = (e: React.PointerEvent) => {
        if (isDragging === null || !trackRef.current) return

        const rect = trackRef.current.getBoundingClientRect()
        const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
        const newValue = Math.round((percent / 100) * (max - min) + min)
        const steppedValue = Math.round(newValue / step) * step

        const newValues = [...value]
        if (isDragging === 0) {
            newValues[0] = Math.min(steppedValue, value[1] - step)
        } else {
            newValues[1] = Math.max(steppedValue, value[0] + step)
        }

        onValueChange?.(newValues)
    }

    const handlePointerUp = (e: React.PointerEvent) => {
        if (isDragging !== null) {
            ; (e.target as HTMLElement).releasePointerCapture(e.pointerId)
            setIsDragging(null)
            onValueCommit?.(value)
        }
    }

    return (
        <div
            ref={trackRef}
            className={cn("relative h-2 w-full rounded-full bg-slate-100", className)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
        >
            {/* Active Track */}
            <div
                className="absolute h-full rounded-full bg-gradient-to-r from-slate-800 to-slate-600"
                style={{
                    left: `${leftPercent}%`,
                    right: `${100 - rightPercent}%`,
                }}
            />

            {/* Left Thumb */}
            <div
                role="slider"
                tabIndex={0}
                aria-valuemin={min}
                aria-valuemax={max}
                aria-valuenow={value[0]}
                className={cn(
                    "absolute top-1/2 -translate-y-1/2 -translate-x-1/2",
                    "h-5 w-5 rounded-full border-2 bg-white shadow-md cursor-grab",
                    "focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:ring-offset-2",
                    isDragging === 0 && "cursor-grabbing scale-110"
                )}
                style={{ left: `${leftPercent}%` }}
                onPointerDown={handlePointerDown(0)}
            />

            {/* Right Thumb */}
            <div
                role="slider"
                tabIndex={0}
                aria-valuemin={min}
                aria-valuemax={max}
                aria-valuenow={value[1]}
                className={cn(
                    "absolute top-1/2 -translate-y-1/2 -translate-x-1/2",
                    "h-5 w-5 rounded-full border-2 bg-white shadow-md cursor-grab",
                    "focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:ring-offset-2",
                    isDragging === 1 && "cursor-grabbing scale-110"
                )}
                style={{ left: `${rightPercent}%` }}
                onPointerDown={handlePointerDown(1)}
            />
        </div>
    )
}
