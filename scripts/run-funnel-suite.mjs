#!/usr/bin/env node

import { spawn } from 'node:child_process'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'
const HEALTH_URL = `${BASE_URL}/api/health/config`

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function isServerUp() {
  try {
    const response = await fetch(HEALTH_URL, { cache: 'no-store' })
    return response.ok
  } catch {
    return false
  }
}

async function waitForServer(timeoutMs = 90_000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    if (await isServerUp()) return true
    await wait(1500)
  }
  return false
}

function runCommand(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      env: {
        ...process.env,
        ...env,
      },
    })

    child.on('error', reject)
    child.on('close', (code) => resolve(code ?? 1))
  })
}

async function main() {
  let devServer = null
  const alreadyUp = await isServerUp()

  if (!alreadyUp) {
    console.log(`No server detected on ${BASE_URL}. Starting \`npm run dev\`...`)
    devServer = spawn('npm', ['run', 'dev'], {
      stdio: 'inherit',
      env: process.env,
    })

    const ready = await waitForServer()
    if (!ready) {
      devServer.kill('SIGTERM')
      throw new Error(`Server did not become ready on ${BASE_URL}`)
    }
  }

  const testsExitCode = await runCommand(
    'node',
    [
      '--import',
      'tsx',
      '--test',
      'scripts/tests/search-ranking.unit.test.ts',
      'scripts/tests/partner-checklist.unit.test.ts',
      'scripts/tests/partner-coordinate-resolution.unit.test.ts',
      'scripts/tests/search-api.integration.test.ts',
      'scripts/tests/funnel-lead.integration.test.ts',
      'scripts/tests/compare-alerts.integration.test.ts',
    ],
    { TEST_BASE_URL: BASE_URL }
  )

  const perfExitCode = await runCommand(
    'node',
    ['scripts/perf-search-api.mjs'],
    { PERF_BASE_URL: BASE_URL }
  )

  if (devServer) {
    devServer.kill('SIGTERM')
  }

  if (testsExitCode !== 0 || perfExitCode !== 0) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Full funnel suite failed:', error.message)
  process.exit(1)
})
