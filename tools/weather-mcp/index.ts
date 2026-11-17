#!/usr/bin/env node
/**
 * haggis-weather MCP server (dev-time only; the app never needs it).
 * Spec: .kiro/specs/weather-mood R7, design section 8.
 *
 * Lets Kiro fetch live Open-Meteo readings and run them through the SAME
 * classification and temperament rules the app uses (packages/care-engine).
 * Own code, no third-party MCP package (supply-chain safety). stdio, JSON-RPC 2.0.
 *
 * Run: node tools/weather-mcp/index.ts   (Node 22.18+ runs TypeScript directly)
 */
import { createInterface } from 'node:readline'
import {
  classifyWeather,
  TEMPERAMENT_WEATHER,
  WEATHER_BUCKETS,
  WEATHER_LABEL,
  weatherDelta,
  weatherLine,
  type WeatherBucket,
  type WeatherReading,
} from '../../packages/care-engine/src/weather.ts'

const TEMPERAMENTS = Object.keys(TEMPERAMENT_WEATHER)

const TOOLS = [
  {
    name: 'get_current_weather',
    description: 'Live Open-Meteo reading for a place, plus the Haggis-gotchi weather bucket.',
    inputSchema: {
      type: 'object',
      properties: { lat: { type: 'number' }, lon: { type: 'number' }, place: { type: 'string' }, coastal: { type: 'boolean' } },
      required: ['lat', 'lon'],
    },
  },
  {
    name: 'classify_weather',
    description: 'Classify a reading into a bucket (same rules as the app).',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'number' }, tempC: { type: 'number' }, windKmh: { type: 'number' },
        gustKmh: { type: 'number' }, humidity: { type: 'number' }, precipitationMm: { type: 'number' },
      },
      required: ['code', 'tempC', 'windKmh', 'gustKmh', 'humidity', 'precipitationMm'],
    },
  },
  {
    name: 'weather_effect',
    description: 'How a bucket changes a temperament (mood/energy/hunger) and the scrapbook line.',
    inputSchema: {
      type: 'object',
      properties: {
        bucket: { type: 'string', enum: [...WEATHER_BUCKETS] },
        temperament: { type: 'string', enum: TEMPERAMENTS },
      },
      required: ['bucket', 'temperament'],
    },
  },
]

async function fetchReading(lat: number, lon: number): Promise<WeatherReading> {
  const la = Math.round(lat * 10) / 10 // coarse, as the app does
  const lo = Math.round(lon * 10) / 10
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${la}&longitude=${lo}` +
    '&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_gusts_10m'
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`)
  const c = ((await res.json()) as { current: Record<string, number> }).current
  return {
    code: c.weather_code,
    tempC: c.temperature_2m,
    windKmh: c.wind_speed_10m,
    gustKmh: c.wind_gusts_10m,
    humidity: c.relative_humidity_2m,
    precipitationMm: c.precipitation,
  }
}

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  if (name === 'get_current_weather') {
    const reading = await fetchReading(Number(args.lat), Number(args.lon))
    const bucket = classifyWeather(reading, { coastal: args.coastal === true })
    return { place: args.place ?? null, reading, bucket, label: WEATHER_LABEL[bucket], capturedAt: new Date().toISOString() }
  }
  if (name === 'classify_weather') {
    const bucket = classifyWeather(args as unknown as WeatherReading)
    return { bucket, label: WEATHER_LABEL[bucket] }
  }
  if (name === 'weather_effect') {
    const bucket = String(args.bucket) as WeatherBucket
    const temperament = String(args.temperament)
    if (!WEATHER_BUCKETS.includes(bucket)) throw new Error(`unknown bucket ${bucket}`)
    return { delta: weatherDelta(bucket, temperament), line: weatherLine('Wee Yin', bucket, temperament) }
  }
  throw new Error(`unknown tool ${name}`)
}

const send = (msg: unknown) => process.stdout.write(JSON.stringify(msg) + '\n')

createInterface({ input: process.stdin }).on('line', async (line) => {
  if (!line.trim()) return
  let req: { id?: number | string; method?: string; params?: Record<string, unknown> }
  try {
    req = JSON.parse(line)
  } catch {
    send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } })
    return
  }
  const { id, method, params = {} } = req
  if (id === undefined) return // notifications (e.g. notifications/initialized)
  try {
    if (method === 'initialize') {
      send({
        jsonrpc: '2.0', id,
        result: {
          protocolVersion: (params.protocolVersion as string) ?? '2025-06-18',
          capabilities: { tools: {} },
          serverInfo: { name: 'haggis-weather', version: '1.0.0' },
        },
      })
    } else if (method === 'ping') {
      send({ jsonrpc: '2.0', id, result: {} })
    } else if (method === 'tools/list') {
      send({ jsonrpc: '2.0', id, result: { tools: TOOLS } })
    } else if (method === 'tools/call') {
      const out = await callTool(String(params.name), (params.arguments as Record<string, unknown>) ?? {})
      send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(out, null, 2) }] } })
    } else {
      send({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } })
    }
  } catch (err) {
    send({
      jsonrpc: '2.0', id,
      result: { isError: true, content: [{ type: 'text', text: err instanceof Error ? err.message : String(err) }] },
    })
  }
})
