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

export function fromJson<T>(): BodyDecoder<T> {
  return async (response) => JSON.parse(await response.text()) as T
}