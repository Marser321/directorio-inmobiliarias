
import React from 'react'

type JsonLdProps = {
    data: Record<string, unknown>
}

export function JsonLd({ data }: JsonLdProps) {
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
    )
}

// Helper generators for specific schemas

export function generatePropertySchema(property: Record<string, unknown>) {
    const images = property.images as string[] | undefined
    const locationImage = property.main_image as string | undefined

    return {
        "@context": "https://schema.org",
        "@type": "RealEstateListing",
        "name": property.title,
        "description": property.description,
        "image": images?.[0] || locationImage,
        "datePosted": property.created_at,
        "price": property.price,
        "priceCurrency": property.currency,
        "address": {
            "@type": "PostalAddress",
            "addressLocality": "Punta del Este", // Ideally dynamic
            "addressCountry": "UY"
        },
        "numBedrooms": property.bedrooms,
        "numBathrooms": property.bathrooms,
        "floorSize": {
            "@type": "QuantitativeValue",
            "value": property.built_area,
            "unitCode": "MTK" // Square Meters
        }
    }
}

export function generatePlaceSchema(name: string, description: string) {
    return {
        "@context": "https://schema.org",
        "@type": "Place",
        "name": name,
        "description": description,
        "address": {
            "@type": "PostalAddress",
            "addressLocality": name,
            "addressCountry": "UY"
        }
    }
}
