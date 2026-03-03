import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://realstate-nu.vercel.app').replace(/\/$/, '')

    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: [
                    '/admin/',
                    '/partners/dashboard/',
                    '/partners/debug/',
                    '/demo-antigravity',
                    '/demo-generator',
                    '/demo-mansion',
                    '/test-3d-card',
                ],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    }
}
