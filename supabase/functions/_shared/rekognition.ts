/**
 * Amazon Rekognition: find objects (DetectLabels) and read text (DetectText).
 * Spec: .kiro/specs/photo-care R3. The image is sent as bytes; AWS does not store it.
 * Secrets: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION (IAM user limited to
 * exactly these two actions, see docs/AWS-SETUP.md).
 */
import { AwsClient } from 'npm:aws4fetch@1.0.20'

export type Detected = {
  labels: { name: string; confidence: number; parents: string[] }[]
  words: { text: string; confidence: number }[]
}

export function rekognitionConfigured(): string[] {
  return [
    !Deno.env.get('AWS_ACCESS_KEY_ID') && 'AWS_ACCESS_KEY_ID',
    !Deno.env.get('AWS_SECRET_ACCESS_KEY') && 'AWS_SECRET_ACCESS_KEY',
  ].filter(Boolean) as string[]
}

function b64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

async function call(aws: AwsClient, region: string, target: string, body: unknown, attempt = 0): Promise<unknown> {
  const res = await aws.fetch(`https://rekognition.${region}.amazonaws.com/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': `RekognitionService.${target}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    // Status + AWS error type only (never the image or keys).
    const type = ((await res.json().catch(() => ({}))) as { __type?: string }).__type ?? ''
    // New AWS accounts throttle bursts (seen 17 Nov: ProvisionedThroughputExceeded). Back off and retry.
    if (attempt < 3 && /Throughput|Throttl/.test(type)) {
      await new Promise((r) => setTimeout(r, 400 * 2 ** attempt))
      return call(aws, region, target, body, attempt + 1)
    }
    throw new Error(`rekognition ${target} ${res.status} ${type}`)
  }
  return res.json()
}

export async function detect(bytes: Uint8Array): Promise<Detected> {
  const region = Deno.env.get('AWS_REGION') ?? 'eu-west-2'
  const aws = new AwsClient({
    accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID')!,
    secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY')!,
    region,
    service: 'rekognition',
  })
  const image = { Bytes: b64(bytes) }
  const [labels, text] = await Promise.all([
    call(aws, region, 'DetectLabels', { Image: image, MaxLabels: 40, MinConfidence: 50 }),
    call(aws, region, 'DetectText', { Image: image }),
  ])
  return {
    labels: ((labels as { Labels?: { Name: string; Confidence: number; Parents?: { Name: string }[] }[] }).Labels ?? []).map(
      (l) => ({ name: l.Name, confidence: Math.round(l.Confidence * 10) / 10, parents: (l.Parents ?? []).map((p) => p.Name) }),
    ),
    words: ((text as { TextDetections?: { DetectedText: string; Confidence: number; Type: string }[] }).TextDetections ?? [])
      .filter((t) => t.Type === 'WORD')
      .map((t) => ({ text: t.DetectedText, confidence: Math.round(t.Confidence * 10) / 10 })),
  }
}
