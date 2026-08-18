import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

export const FIXED_NOW = '2026-08-09T00:00:00Z'

export function sha256(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(String(value))
  return `sha256:${crypto.createHash('sha256').update(bytes).digest('hex')}`
}

export async function hashFile(file) {
  return sha256(await fs.readFile(file))
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

export async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'))
}

export function artifactHash(value) {
  return sha256(canonicalJson(value))
}
