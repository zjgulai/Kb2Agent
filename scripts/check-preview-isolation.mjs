#!/usr/bin/env node

import { spawn } from 'node:child_process'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'

const host = '127.0.0.1'
const base = '/Kb2Agent/'

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function freeLoopbackPort() {
  const probe = net.createServer()
  await new Promise((resolve, reject) => {
    probe.once('error', reject)
    probe.listen(0, host, resolve)
  })
  const address = probe.address()
  const port = typeof address === 'object' && address ? address.port : null
  await new Promise((resolve) => probe.close(resolve))
  if (!port) throw new Error('could not allocate a loopback preview test port')
  return port
}

async function stopProcess(child) {
  if (child.exitCode !== null) return
  child.kill('SIGTERM')
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    wait(2_000)
  ])
  if (child.exitCode === null) child.kill('SIGKILL')
}

async function waitForUrl(child, url, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`preview exited early with code ${child.exitCode}`)
    try {
      const response = await fetch(url)
      if (response.ok) return response
    } catch {
      // The child is still binding the loopback socket.
    }
    await wait(100)
  }
  throw new Error(`timed out waiting for ${url}`)
}

function nonLoopbackIpv4Addresses() {
  return Object.values(os.networkInterfaces())
    .flatMap((entries) => entries || [])
    .filter((entry) => entry.family === 'IPv4' && !entry.internal)
    .map((entry) => entry.address)
}

async function main() {
  const port = await freeLoopbackPort()
  const previewScript = path.resolve('scripts', 'preview-local.mjs')
  const child = spawn(process.execPath, [previewScript, '--host', host, '--port', String(port)], {
    stdio: ['ignore', 'pipe', 'pipe']
  })
  let output = ''
  child.stdout.on('data', (chunk) => { output += chunk.toString() })
  child.stderr.on('data', (chunk) => { output += chunk.toString() })

  try {
    const localUrl = `http://${host}:${port}${base}`
    const response = await waitForUrl(child, localUrl)
    const html = await response.text()
    if (!html.includes('MKD Guide')) throw new Error('preview homepage did not contain the expected site title')

    const pageResponse = await fetch(`${localUrl}knowledge/appendix-validation`)
    if (!pageResponse.ok || !(await pageResponse.text()).includes('concept-workbench')) {
      throw new Error('preview did not serve the built concept workbench page')
    }
    const missingResponse = await fetch(`${localUrl}definitely-missing`)
    if (missingResponse.status !== 404) throw new Error(`preview missing route returned ${missingResponse.status}, expected 404`)
    const postResponse = await fetch(localUrl, { method: 'POST' })
    if (postResponse.status !== 405) throw new Error(`preview POST returned ${postResponse.status}, expected 405`)

    const externalAddresses = nonLoopbackIpv4Addresses()
    for (const address of externalAddresses) {
      try {
        await fetch(`http://${address}:${port}${base}`, { signal: AbortSignal.timeout(750) })
        throw new Error(`preview unexpectedly accepted a non-loopback connection on ${address}:${port}`)
      } catch (error) {
        if (error instanceof Error && error.message.includes('unexpectedly accepted')) throw error
      }
    }

    console.log(
      `Preview isolation passed: ${localUrl} served expected routes; ` +
      `${externalAddresses.length} non-loopback IPv4 address(es) rejected.`
    )
  } catch (error) {
    if (output.trim()) console.error(output.trim())
    throw error
  } finally {
    await stopProcess(child)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
