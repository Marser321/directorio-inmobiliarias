
"use client"

import { useState } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"

export function useLifestyleFilter() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()

    // Initialize from URL or default to empty
    const initialSelected = searchParams.get("lifestyle")?.split(",") || []
    const [selectedStyles, setSelectedStyles] = useState<string[]>(initialSelected)

    const toggleStyle = (styleId: string) => {
        const newStyles = selectedStyles.includes(styleId)
            ? selectedStyles.filter((id) => id !== styleId)
            : [...selectedStyles, styleId]

        setSelectedStyles(newStyles)

        // Sync with URL
        const params = new URLSearchParams(searchParams)
        if (newStyles.length > 0) {
            params.set("lifestyle", newStyles.join(","))
        } else {
            params.delete("lifestyle")
        }
        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    }

    return {
        selectedStyles,
        toggleStyle,
        reset: () => {
            setSelectedStyles([])
            router.replace(pathname, { scroll: false })
        }
    }
}
