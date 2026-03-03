'use client';

import { PropertyCard } from '@/components/luxe/PropertyCard';

const MOCK_PROPERTY = {
    id: 999,
    title: "Test 3D Card Property",
    price: 1500000,
    currency: "USD",
    bedrooms: 4,
    bathrooms: 3,
    built_area: 300,
    main_image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=2671&auto=format&fit=crop",
    images: [
        "https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=2671&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2670&auto=format&fit=crop"
    ],
    location: "Test Location",
    status: "en_venta",
    is_featured: true
};

export default function Test3DCardPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-10">
            <div className="w-full max-w-sm">
                <PropertyCard property={MOCK_PROPERTY} />
            </div>
        </div>
    );
}
