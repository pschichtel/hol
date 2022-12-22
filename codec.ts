import { RequestBuilder } from './requestBuilder.js'
import { HolMetadata } from './model.js'

export type BodyEncoder = (requestBuilder: RequestBuilder) => void
export type BodyDecoder<T> = (response: Response, metadata: HolMetadata) => Promise<T>

export function asJson(body: any): BodyEncoder {
  return (it) => {
    it.addHeader('Content-Type', 'application/json')
    it.rawBody(JSON.stringify(body))
  }
}

export function asIs(body: any, contentType?: string): BodyEncoder {
  let detectedContentType: string
  if (contentType) {
    detectedContentType = contentType
  } else {
    if (body instanceof FormData) {
      detectedContentType = 'multipart/form-data'
    } else if (body instanceof URLSearchParams) {
      detectedContentType = 'application/x-www-form-urlencoded'
    } else {
      detectedContentType = 'application/octet-stream'
    }
  }
  return (it) => {
    it.rawBody(body)
    it.addHeader('Content-Type', detectedContentType)
  }
}

export async function fromJson<T>(response: Response): Promise<T> {
  return JSON.parse(await response.text()) as T
}

export function toBlob(response: Response): Promise<Blob> {
  return response.blob()
}

export function toArrayBuffer(response: Response): Promise<ArrayBuffer> {
  return response.arrayBuffer()
}

export function toText(response: Response): Promise<string> {
  return response.text()
}

export function toFormData(response: Response): Promise<FormData> {
  return response.formData()
}