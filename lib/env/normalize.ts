export type EnvIssueCode =
  | 'wrapped_quotes'
  | 'escaped_newline'
  | 'control_newline'
  | 'outer_whitespace'
  | 'empty_after_normalize'
  | 'invalid_boolean'

export interface EnvInspection {
  raw: string | undefined
  normalized: string | undefined
  issues: EnvIssueCode[]
}

const TRUE_VALUES = new Set(['true', '1', 'yes', 'on'])
const FALSE_VALUES = new Set(['false', '0', 'no', 'off'])

function stripWrappingQuotes(value: string) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }

  return value
}

function decodeEscapedNewlines(value: string) {
  return value.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\r/g, '\r')
}

export function inspectEnvValue(raw: string | undefined | null): EnvInspection {
  if (typeof raw !== 'string') {
    return {
      raw: undefined,
      normalized: undefined,
      issues: [],
    }
  }

  const issues: EnvIssueCode[] = []
  const original = raw
  let next = original

  if (next !== next.trim()) {
    issues.push('outer_whitespace')
    next = next.trim()
  }

  if (
    (next.startsWith('"') && next.endsWith('"')) ||
    (next.startsWith("'") && next.endsWith("'"))
  ) {
    issues.push('wrapped_quotes')
    next = stripWrappingQuotes(next)
  }

  if (/\\r\\n|\\n|\\r/.test(next)) {
    issues.push('escaped_newline')
    next = decodeEscapedNewlines(next)
  }

  if (/[\r\n]/.test(next)) {
    issues.push('control_newline')
    next = next.replace(/[\r\n]/g, '').trim()
  }

  if (!next) {
    issues.push('empty_after_normalize')
    return {
      raw: original,
      normalized: undefined,
      issues,
    }
  }

  return {
    raw: original,
    normalized: next,
    issues,
  }
}

export function normalizeEnvValue(raw: string | undefined | null) {
  return inspectEnvValue(raw).normalized
}

export function readRequiredEnv(name: string) {
  const normalized = normalizeEnvValue(process.env[name])
  if (!normalized) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return normalized
}

export function parseBooleanEnv(
  raw: string | undefined | null,
  fallback = false
): { value: boolean; issues: EnvIssueCode[] } {
  const inspection = inspectEnvValue(raw)
  const normalized = inspection.normalized

  if (normalized === undefined) {
    return {
      value: fallback,
      issues: inspection.issues,
    }
  }

  const lowered = normalized.toLowerCase()
  if (TRUE_VALUES.has(lowered)) {
    return { value: true, issues: inspection.issues }
  }

  if (FALSE_VALUES.has(lowered)) {
    return { value: false, issues: inspection.issues }
  }

  return {
    value: fallback,
    issues: inspection.issues.concat('invalid_boolean'),
  }
}
