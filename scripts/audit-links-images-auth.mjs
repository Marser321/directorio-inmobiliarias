#!/usr/bin/env node

const BASE_URL = process.env.AUDIT_BASE_URL || 'http://localhost:3000'
const CHECKOUT_PROPERTY_ID = Number(process.env.AUDIT_CHECKOUT_PROPERTY_ID || '0')

const START_PAGES = [
  '/',
  '/search',
  '/explore',
  '/partners',
  '/partners/login',
  '/partners/registro',
  '/demo-antigravity',
]

const API_CHECKS = [
  { path: '/api/auth/me', method: 'GET', expected: [200] },
  { path: '/api/marketing/tiers', method: 'GET', expected: [200] },
  { path: '/api/marketing/requests', method: 'GET', expected: [200, 401] },
  { path: '/api/partners/onboarding', method: 'POST', expected: [400, 401, 503], body: {} },
  { path: '/api/partners/properties', method: 'POST', expected: [400, 401, 503], body: {} },
  { path: '/api/stripe/checkout/featured', method: 'POST', expected: [400, 401, 403, 503], body: {} },
  { path: '/api/stripe/checkout/subscription', method: 'POST', expected: [400, 401, 503], body: {} },
  { path: '/api/stripe/checkout/service-request', method: 'POST', expected: [400, 401, 503], body: {} },
]

function decodeHtmlEntities(value) {
  return value.replace(/&amp;/g, '&')
}

function toAbsoluteUrl(input) {
  if (!input) return null
  if (input.startsWith('http://') || input.startsWith('https://')) return input
  if (input.startsWith('//')) return `https:${input}`
  if (input.startsWith('/')) return `${BASE_URL}${input}`
  return null
}

async function requestWithFallback(url, method = 'GET', body) {
  const init = {
    method,
    redirect: 'manual',
    headers: {},
  }

  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(body)
  }

  let response = await fetch(url, init)
  // Some endpoints (notably Next Image optimizer) can return non-200 to HEAD
  // while GET is healthy, so degrade gracefully for audit checks.
  if (method === 'HEAD' && response.status >= 400) {
    response = await fetch(url, { ...init, method: 'GET', body: undefined })
  }
  return response
}

async function crawlPages() {
  const visited = new Set()
  const queue = [...START_PAGES]
  const pageResults = []
  const imageCandidates = new Set()
  const linkCandidates = new Set()

  while (queue.length > 0) {
    const path = queue.shift()
    if (!path || visited.has(path)) continue
    visited.add(path)

    const url = toAbsoluteUrl(path)
    if (!url) continue

    try {
      const response = await fetch(url, { redirect: 'manual' })
      const status = response.status
      const location = response.headers.get('location')
      const html = status === 200 ? await response.text() : ''

      pageResults.push({ path, status, location })

      if (status !== 200 || !html) continue

      const hrefPattern = /href=(?:"([^"#?]+)"|'([^'#?]+)')/g
      let hrefMatch
      while ((hrefMatch = hrefPattern.exec(html)) !== null) {
        const href = decodeHtmlEntities((hrefMatch[1] || hrefMatch[2] || '').trim())
        if (!href.startsWith('/')) continue
        if (href.startsWith('/api') || href.startsWith('/_next')) continue
        linkCandidates.add(href)
        if (!visited.has(href) && queue.length < 200) queue.push(href)
      }

      const imgPattern = /<img[^>]+src=(?:"([^"]+)"|'([^']+)')/g
      let imgMatch
      while ((imgMatch = imgPattern.exec(html)) !== null) {
        const src = decodeHtmlEntities((imgMatch[1] || imgMatch[2] || '').trim())
        const absolute = toAbsoluteUrl(src)
        if (absolute) imageCandidates.add(absolute)
      }
    } catch (error) {
      pageResults.push({ path, status: 'ERR', error: String(error) })
    }
  }

  return {
    pageResults,
    linkCandidates: [...linkCandidates],
    imageCandidates: [...imageCandidates],
  }
}

async function checkLinks(paths) {
  const broken = []
  for (const path of paths) {
    const url = toAbsoluteUrl(path)
    if (!url) continue
    try {
      const response = await fetch(url, { redirect: 'manual' })
      const status = response.status
      if (status >= 400) {
        broken.push({ path, status })
      }
    } catch (error) {
      broken.push({ path, status: 'ERR', error: String(error) })
    }
  }
  return broken
}

async function checkImages(urls) {
  const broken = []
  for (const url of urls) {
    try {
      const response = await requestWithFallback(url, 'HEAD')
      if (response.status >= 400) {
        broken.push({ url, status: response.status })
      }
    } catch (error) {
      broken.push({ url, status: 'ERR', error: String(error) })
    }
  }
  return broken
}

async function checkApis() {
  const failures = []
  const results = []

  for (const check of API_CHECKS) {
    const url = `${BASE_URL}${check.path}`
    try {
      const response = await requestWithFallback(url, check.method, check.body)
      const status = response.status
      results.push({ path: check.path, method: check.method, status })
      if (!check.expected.includes(status)) {
        failures.push({ path: check.path, method: check.method, status, expected: check.expected })
      }
    } catch (error) {
      failures.push({
        path: check.path,
        method: check.method,
        status: 'ERR',
        expected: check.expected,
        error: String(error),
      })
    }
  }

  if (CHECKOUT_PROPERTY_ID > 0) {
    const checkoutPath = '/api/stripe/checkout/featured'
    try {
      const response = await requestWithFallback(`${BASE_URL}${checkoutPath}`, 'POST', {
        propertyId: CHECKOUT_PROPERTY_ID,
        propertyTitle: `Audit property ${CHECKOUT_PROPERTY_ID}`,
      })
      const status = response.status
      const payload = await response.json().catch(() => null)
      results.push({ path: checkoutPath, method: 'POST', status, payload })
      if (![200, 401, 403, 503].includes(status)) {
        failures.push({
          path: checkoutPath,
          method: 'POST',
          status,
          expected: [200, 401, 403, 503],
          payload,
        })
      }
    } catch (error) {
      failures.push({
        path: checkoutPath,
        method: 'POST',
        status: 'ERR',
        expected: [200, 401, 403, 503],
        error: String(error),
      })
    }
  }

  return { failures, results }
}

function printSection(title, payload) {
  console.log(`\n=== ${title} ===`)
  console.log(JSON.stringify(payload, null, 2))
}

async function main() {
  console.log(`Audit base URL: ${BASE_URL}`)
  if (CHECKOUT_PROPERTY_ID > 0) {
    console.log(`Checkout simulation check enabled for property id: ${CHECKOUT_PROPERTY_ID}`)
  }

  const crawl = await crawlPages()
  const brokenLinks = await checkLinks(crawl.linkCandidates)
  const brokenImages = await checkImages(crawl.imageCandidates)
  const apiChecks = await checkApis()

  printSection('Pages', crawl.pageResults)
  printSection('Broken Internal Links', brokenLinks)
  printSection('Broken Images', brokenImages)
  printSection('API Checks', apiChecks.results)
  printSection('API Failures', apiChecks.failures)

  const hasPageFailures = crawl.pageResults.some((entry) => entry.status === 'ERR')
  const hasBrokenLinks = brokenLinks.length > 0
  const hasBrokenImages = brokenImages.length > 0
  const hasApiFailures = apiChecks.failures.length > 0

  const failed = hasPageFailures || hasBrokenLinks || hasBrokenImages || hasApiFailures

  console.log('\n=== Summary ===')
  console.log(
    JSON.stringify(
      {
        pagesVisited: crawl.pageResults.length,
        internalLinksChecked: crawl.linkCandidates.length,
        imagesChecked: crawl.imageCandidates.length,
        brokenLinks: brokenLinks.length,
        brokenImages: brokenImages.length,
        apiFailures: apiChecks.failures.length,
      },
      null,
      2
    )
  )

  process.exit(failed ? 1 : 0)
}

main().catch((error) => {
  console.error('Audit failed with unhandled error:', error)
  process.exit(1)
})
