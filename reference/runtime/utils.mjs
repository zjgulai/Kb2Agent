import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile as execFileCallback } from 'node:child_process'
import { promisify } from 'node:util'

const execFile = promisify(execFileCallback)

export const FIXED_NOW = '2026-08-09T00:00:00Z'
export const FIXED_AS_OF = '2026-08-01'

export function sha256(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(String(value))
  return `sha256:${crypto.createHash('sha256').update(bytes).digest('hex')}`
}

export async function hashFile(file) {
  return sha256(await fs.readFile(file))
}

export function stableId(prefix, ...parts) {
  const body = parts
    .join('-')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${prefix}-${body}`
}

export function shortHash(value, length = 10) {
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, length).toUpperCase()
}

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

export async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`)
}

export async function writeJsonl(file, values) {
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, `${values.map((value) => JSON.stringify(value)).join('\n')}\n`)
}

export async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'))
}

export async function run(command, args, options = {}) {
  try {
    const result = await execFile(command, args, {
      encoding: options.encoding || 'utf8',
      maxBuffer: options.maxBuffer || 20 * 1024 * 1024,
      cwd: options.cwd
    })
    return result.stdout
  } catch (error) {
    const detail = error.stderr?.toString().trim() || error.message
    throw new Error(`${command} failed: ${detail}`)
  }
}

export function decodeXml(value) {
  return String(value)
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
}

export function xmlText(xml, tagPattern = '[a-zA-Z0-9]+:t') {
  const pattern = new RegExp(`<${tagPattern}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagPattern}>`, 'g')
  return [...String(xml).matchAll(pattern)].map((match) => decodeXml(match[1])).join(' ').replace(/\s+/g, ' ').trim()
}

export function snapshotHash(snapshot) {
  return sha256(JSON.stringify({
    objectIds: [...snapshot.objectIds].sort(),
    relationIds: [...snapshot.relationIds].sort()
  }))
}

export function artifactHash(value) {
  return sha256(canonicalJson(value))
}
