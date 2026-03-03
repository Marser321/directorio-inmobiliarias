import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'

/* eslint-disable @next/next/no-img-element */

export const runtime = 'edge'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)

        // Get parameters from URL
        const title = searchParams.get('title') || 'Propiedad en Venta'
        const price = searchParams.get('price') || '$0'
        const location = searchParams.get('location') || 'Uruguay'
        const image = searchParams.get('image') || ''
        const bedrooms = searchParams.get('bedrooms') || '0'
        const bathrooms = searchParams.get('bathrooms') || '0'
        const area = searchParams.get('area') || '0'

        return new ImageResponse(
            (
                <div
                    style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        backgroundColor: '#0a0a0a',
                        position: 'relative',
                    }}
                >
                    {/* Background Image with Overlay */}
                    {image && (
                        <img
                            src={image}
                            alt=""
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                opacity: 0.6,
                            }}
                        />
                    )}

                    {/* Gradient Overlay */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.5) 100%)',
                        }}
                    />

                    {/* Content */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'flex-end',
                            padding: '48px',
                            height: '100%',
                            position: 'relative',
                            zIndex: 10,
                        }}
                    >
                        {/* Logo */}
                        <div
                            style={{
                                position: 'absolute',
                                top: '32px',
                                left: '48px',
                                display: 'flex',
                                alignItems: 'center',
                                fontSize: '32px',
                                fontWeight: 'bold',
                                color: 'white',
                            }}
                        >
                            Luxe<span style={{ color: '#D4AF37' }}>Estate</span>
                        </div>

                        {/* Price Badge */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                marginBottom: '16px',
                            }}
                        >
                            <div
                                style={{
                                    backgroundColor: '#D4AF37',
                                    color: '#0a0a0a',
                                    padding: '12px 24px',
                                    borderRadius: '8px',
                                    fontSize: '40px',
                                    fontWeight: 'bold',
                                }}
                            >
                                {price}
                            </div>
                        </div>

                        {/* Title */}
                        <div
                            style={{
                                fontSize: '56px',
                                fontWeight: 'bold',
                                color: 'white',
                                lineHeight: 1.2,
                                marginBottom: '12px',
                                maxWidth: '80%',
                            }}
                        >
                            {title}
                        </div>

                        {/* Location */}
                        <div
                            style={{
                                fontSize: '28px',
                                color: '#a1a1aa',
                                marginBottom: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                            }}
                        >
                            📍 {location}
                        </div>

                        {/* Stats */}
                        <div
                            style={{
                                display: 'flex',
                                gap: '32px',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontSize: '24px' }}>
                                🛏️ {bedrooms} Dormitorios
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontSize: '24px' }}>
                                🚿 {bathrooms} Baños
                            </div>
                            {area !== '0' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontSize: '24px' }}>
                                    📐 {area} m²
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ),
            {
                width: 1200,
                height: 630,
            }
        )
    } catch (error) {
        console.error('OG Image generation error:', error)
        return new Response('Failed to generate image', { status: 500 })
    }
}
