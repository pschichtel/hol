import {
  HolMetadata,
  HolMetadataKey,
  HolRequest,
} from './model.js'
import { BodyEncoder } from './codec.js'

export type QueryParamPrimitiveValue = string | number | boolean | undefined | null
export type QueryParamValue = QueryParamPrimitiveValue | Array<QueryParamPrimitiveValue>
export type QueryParam = [string, QueryParamPrimitiveValue]
export type QueryParams = URLSearchParams | Array<QueryParam> | ReadonlyArray<QueryParam> | { [name: string]: QueryParamValue }

export interface UrlBuilder {
  from(url: URL | string): void

  protocol(protocol: string): void

  host(host: string): void

  port(port: number): void

  path(path: string): void

  addQueryParam(name: string, value: string): void
  addQueryParams(params: QueryParams): void

  fragment(fragment: string | undefined): void
}

class SimpleUrlBuilder implements UrlBuilder {
  private url: URL
  private hasHost: boolean = false

  constructor(baseUrl?: URL | string) {
    if (baseUrl) {
      this.url = new URL(baseUrl)
      this.hasHost = true
    } else {
      this.url = new URL('https://localhost')
    }
  }

  from(url: URL | string) {
    this.url = new URL(url)
    this.hasHost = true
  }

  protocol(protocol: string) {
    if (protocol.endsWith(':')) {
      this.url.protocol = protocol
    } else {
      this.url.protocol = `${protocol}:`
    }
  }

  host(host: string) {
    this.url.host = host
    this.hasHost = true
  }

  port(port: number | undefined) {
    if (typeof port === 'number') {
      this.url.port = `${port}`
    } else {
      this.url.port = ''
    }
  }

  path(path: string) {
    this.url.pathname = path
  }

  addQueryParam(name: string, value: string) {
    this.url.searchParams.append(name, value)
  }

  addQueryParams(params: QueryParams): void {
    if (params instanceof URLSearchParams) {
      for (const [name, value] of params.entries()) {
        this.addQueryParam(name, value)
      }
    } else if (Array.isArray(params)) {
      for (const [name, value] of params) {
        this.addQueryParam(name, `${value}`)
      }
    } else {
      for (const [name, value] of Object.entries(params)) {
        if (value === null || value === undefined) {
          continue
        }
        if (Array.isArray(value)) {
          for (const entry of value) {
            if (entry === null || entry === undefined) {
              continue
            }
            this.addQueryParam(name, `${entry}`)
          }
        } else {
          this.addQueryParam(name, `${value}`);
        }
      }
    }
  }

  fragment(fragment: string | undefined) {
    if (!fragment) {
      this.url.hash = ''
    } else {
      this.url.hash = `#${fragment}`
    }
  }

  build(): URL {
    if (!this.hasHost) {
      throw new Error("No host has been configured!")
    }
    return this.url
  }
}

export interface RequestBuilder {
  buildUrl(build: (builder: UrlBuilder) => void): void
  buildUrlFrom(from: URL | string, build?: (builder: UrlBuilder) => void): void

  method(method: string): void

  addHeader(name: string, value: string): void

  addMetadata<T>(key: HolMetadataKey<T>, value: T): void

  body(encoder: BodyEncoder): void
  rawBody(body: BodyInit): void

  abortOn(signal: AbortSignal): void

  requestInit(init: RequestInit): void
}

function mergeHeaders(init: HeadersInit | undefined, additionalHeaders: Headers): Headers {
  const headers = new Headers(init)
  for (let [name, value] of additionalHeaders) {
    headers.append(name, value);
  }

  return headers
}

function linkAbortSignals(a: AbortSignal | undefined | null, b: AbortSignal | undefined | null): AbortSignal | null {
  if (a && b) {
    const combined = new AbortController()
    a.addEventListener('abort', () => combined.abort(a.reason))
    b.addEventListener('abort', () => combined.abort(b.reason))
    return combined.signal
  } else if (a) {
    return a
  } else if (b) {
    return b
  } else {
    return null
  }
}

export class SimpleRequestBuilder implements RequestBuilder {

  private urlBuilder: SimpleUrlBuilder | undefined = undefined
  private methodValue: string | undefined = undefined
  private init: RequestInit | undefined = undefined
  private headers = new Headers()
  private metadata = new HolMetadata()
  private bodyValue: BodyInit | null = null
  private abortSignal: AbortSignal | undefined = undefined

  buildUrl(build: (builder: UrlBuilder) => void) {
    this.urlBuilder = new SimpleUrlBuilder()
    build(this.urlBuilder)
  }

  buildUrlFrom(from: URL | string, build?: (builder: UrlBuilder) => void) {
    this.urlBuilder = new SimpleUrlBuilder(from)
    if (build) {
      build(this.urlBuilder)
    }
  }

  method(method: string) {
    this.methodValue = method
  }

  addHeader(name: string, value: string) {
    this.headers.append(name, value)
  }

  addMetadata<T>(key: HolMetadataKey<T>, value: T) {
    this.metadata.put(key, value)
  }

  body(body: BodyEncoder) {
    body(this)
  }

  rawBody(body: BodyInit) {
    this.bodyValue = body
  }

  requestInit(init: RequestInit) {
    this.init = init
  }

  abortOn(signal: AbortSignal) {
    this.abortSignal = signal;
  }

  build(): HolRequest {
    if (!this.urlBuilder) {
      throw new Error("No URL has been configured!")
    }
    let mergedInit = {
      ...this.init,
      method: this.methodValue,
      headers: mergeHeaders(this.init?.headers, this.headers),
      signal: linkAbortSignals(this.init?.signal, this.abortSignal),
      body: this.bodyValue,
    }
    return new HolRequest(this.urlBuilder.build(), mergedInit, this.metadata)
  }
}

export function buildRequest(block: (builder: RequestBuilder) => void): HolRequest {
  const builder = new SimpleRequestBuilder()

  block(builder)

  return builder.build()
}