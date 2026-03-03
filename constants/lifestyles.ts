
import { LucideIcon, Waves, Sun, Palmtree, Coffee, Shield, Music, ShoppingBag, Anchor, Book, Flame } from "lucide-react"

export type Lifestyle = {
    id: string
    label: string
    icon: LucideIcon
    color: string
}

export const LIFESTYLES: Lifestyle[] = [
    { id: 'waterfront', label: 'Waterfront', icon: Waves, color: 'text-blue-500' },
    { id: 'sunset', label: 'Sunset Views', icon: Sun, color: 'text-orange-500' },
    { id: 'nature', label: 'Forest & Nature', icon: Palmtree, color: 'text-green-600' },
    { id: 'social', label: 'Social Hub', icon: Coffee, color: 'text-amber-700' },
    { id: 'security', label: 'Gated / Secure', icon: Shield, color: 'text-slate-600' },
    { id: 'nightlife', label: 'Nightlife', icon: Music, color: 'text-purple-600' },
    { id: 'shopping', label: 'Shopping', icon: ShoppingBag, color: 'text-pink-500' },
    { id: 'boating', label: 'Marina / Boating', icon: Anchor, color: 'text-blue-800' },
    { id: 'culture', label: 'Art & Culture', icon: Book, color: 'text-red-700' },
    { id: 'fireplace', label: 'Winter Ready', icon: Flame, color: 'text-orange-700' },
]
