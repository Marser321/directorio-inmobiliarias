#!/usr/bin/env node

/**
 * Safe migration helper for InsForge cutover.
 * This script intentionally avoids embedding credentials or calling legacy Supabase endpoints.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const schemaPath = resolve(process.cwd(), 'insforge', 'schema.sql')

function main() {
  const schema = readFileSync(schemaPath, 'utf-8')

  console.log('InsForge migration helper')
  console.log('------------------------')
  console.log(`Loaded schema: ${schemaPath}`)
  console.log('')
  console.log('Use MCP tool `mcp__insforge__run-raw-sql` to apply this SQL in controlled blocks.')
  console.log('No credentials are read or embedded by this script.')
  console.log('')
  console.log('Preview (first 40 lines):')
  console.log(schema.split('\n').slice(0, 40).join('\n'))
}

main()
