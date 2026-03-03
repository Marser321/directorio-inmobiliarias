import { NextResponse } from 'next/server'

const SUNSET = 'Thu, 30 Apr 2026 23:59:59 GMT'
const SUCCESSOR = '/api/partners/onboarding'

function deprecatedResponse() {
  const response = NextResponse.json(
    {
      error: 'Endpoint deprecated',
      message: `Use ${SUCCESSOR} instead.`,
      successor: SUCCESSOR,
      sunset: SUNSET,
    },
    { status: 410 }
  )

  response.headers.set('Deprecation', 'true')
  response.headers.set('Sunset', SUNSET)
  response.headers.set('Link', `<${SUCCESSOR}>; rel="successor-version"`)
  return response
}

export async function POST() {
  return deprecatedResponse()
}
