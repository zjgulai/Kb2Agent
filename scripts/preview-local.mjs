#!/usr/bin/env node

import { createReadStream } from 'node:fs'
import fs from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const outputDirectory = path.resolve(root, 'docs', '.vitepress', 'dist')
const defaultBase = '/Kb2Agent/'
const loopbackHost = '127.0.0.1'

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webp', 'image/webp'],
  ['.woff2', 'font/woff2']
])

function argumentValue(name, fallback) {
  const equalsPrefix = `${name}=`
  const equalsArgument = process.argv.find((argument) => argument.startsWith(equalsPrefix))
  if (equalsArgument) return equalsArgument.slice(equalsPrefix.length)
  const index = process.argv.indexOf(name)
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1]
  return fallback
}

function normalizeBase(value) {
  const trimmed = String(value).trim()
  return `/${trimmed.replace(/^\/+|\/+$/g, '')}/`
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value)
  } catch {
    return null
  }
}

async function existingFile(candidates) {
  for (const candidate of candidates) {
    const resolved = path.resolve(outputDirectory, candidate)
    if (resolved !== outputDirectory && !resolved.startsWith(`${outputDirectory}${path.sep}`)) continue
    try {
      const stats = await fs.stat(resolved)
      if (stats.isFile()) return { resolved, stats }
    } catch {
      // Try the next deterministic static-site candidate.
    }
  }
  return null
}

async function resolveRequest(pathname, base) {
  const relativePath = pathname.slice(base.length).replace(/^\/+/, '')
  const decoded = safeDecode(relativePath)
  if (decoded === null || decoded.includes('\0')) return null

  if (!decoded || decoded.endsWith('/')) {
    return existingFile([path.join(decoded, 'index.html')])
  }
  if (path.extname(decoded)) return existingFile([decoded])
  return existingFile([`${decoded}.html`, path.join(decoded, 'index.html')])
}

function sendText(response, statusCode, message) {
  response.writeHead(statusCode, {
    'cache-control': 'no-store',
    'content-type': 'text/plain; charset=utf-8',
    'x-content-type-options': 'nosniff'
  })
  response.end(message)
}

async function main() {
  const requestedHost = argumentValue('--host', loopbackHost)
  if (!['127.0.0.1', 'localhost'].includes(requestedHost)) {
    throw new Error(`preview host must remain loopback-only; received ${requestedHost}`)
  }
  const port = Number(argumentValue('--port', '4173'))
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`preview port must be an integer from 1 to 65535; received ${port}`)
  }
  const base = normalizeBase(argumentValue('--base', defaultBase))
  const notFoundPath = path.join(outputDirectory, '404.html')
  await fs.access(path.join(outputDirectory, 'index.html'))
  await fs.access(notFoundPath)

  const server = http.createServer(async (request, response) => {
    try {
      if (!['GET', 'HEAD'].includes(request.method || 'GET')) {
        response.setHeader('allow', 'GET, HEAD')
        sendText(response, 405, 'Method not allowed')
        return
      }

      const requestUrl = new URL(request.url || '/', `http://${loopbackHost}:${port}`)
      if (requestUrl.pathname === '/') {
        response.writeHead(302, { location: base, 'cache-control': 'no-store' })
        response.end()
        return
      }
      if (requestUrl.pathname === base.slice(0, -1)) {
        response.writeHead(308, { location: base, 'cache-control': 'no-store' })
        response.end()
        return
      }
      if (!requestUrl.pathname.startsWith(base)) {
        sendText(response, 404, 'Not found')
        return
      }

      const file = await resolveRequest(requestUrl.pathname, base)
      const statusCode = file ? 200 : 404
      const target = file || {
        resolved: notFoundPath,
        stats: await fs.stat(notFoundPath)
      }
      const extension = path.extname(target.resolved).toLowerCase()
      const isAsset = requestUrl.pathname.startsWith(`${base}assets/`)
      response.writeHead(statusCode, {
        'cache-control': isAsset ? 'public, max-age=31536000, immutable' : 'no-cache',
        'content-length': target.stats.size,
        'content-type': contentTypes.get(extension) || 'application/octet-stream',
        'x-content-type-options': 'nosniff'
      })
      if (request.method === 'HEAD') {
        response.end()
        return
      }
      createReadStream(target.resolved).pipe(response)
    } catch (error) {
      console.error(`[preview] request failed: ${error instanceof Error ? error.message : error}`)
      if (!response.headersSent) sendText(response, 500, 'Internal preview error')
      else response.destroy()
    }
  })

  server.on('clientError', (_error, socket) => {
    socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n')
  })

  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, loopbackHost, resolve)
  })
  console.log(`[preview] built site served at http://${loopbackHost}:${port}${base}`)

  const shutdown = () => {
    server.close(() => process.exit(0))
  }
  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
