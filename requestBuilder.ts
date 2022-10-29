import {
  HolMetadata,
  HolMetadataKey,
  HolRequest,
} from './model.js'

const dummyHost = 'example.org'

export interface UrlBuilder {
  from(url: URL | string): void

  protocol(protocol: string): void

  host(host: string): void

  port(port: number): void

  path(path: string): void

  addQueryParam(name: string, value: string): void

  fragment(fragment: string | undefined): void
}

class SimpleUrlBuilder implements UrlBuilder {
  private url: URL = new URL(`https://${dummyHost}`)

  from(url: URL | string) {
    this.url = new URL(url)
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

  fragment(fragment: string | undefined) {
    if (!fragment) {
      this.url.hash = ''
    } else {
      this.url.hash = `#${fragment}`
    }
  }

  build(): URL {
    return this.url
  }
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD'

export interface RequestBuilder {
  buildUrl(build: (builder: UrlBuilder) => void): void

  method(method: HttpMethod): void

  addHeader(name: string, value: string): void

  addMetadata<T>(key: HolMetadataKey<T>, value: T): void

  body(body: BodyInit): void

  requestInit(init: RequestInit): void
}

class SimpleRequestBuilder implements RequestBuilder {

  private readonly urlBuilder = new SimpleUrlBuilder()
  private methodValue: HttpMethod | undefined = undefined
  private init: RequestInit | undefined = undefined
  private headers = new Headers()
  private metadata = new HolMetadata()
  private bodyValue: BodyInit | null = null

  buildUrl(build: (builder: UrlBuilder) => void) {
    build(this.urlBuilder)
  }

  method(method: HttpMethod) {
    this.methodValue = method
  }

  addHeader(name: string, value: string) {
    this.headers.append(name, value)
  }

  addMetadata<T>(key: HolMetadataKey<T>, value: T) {
    this.metadata.put(key, value)
  }

  body(body: BodyInit) {
    this.bodyValue = body
  }

  requestInit(init: RequestInit) {
    this.init = init
  }

  build(): HolRequest {
    return {
      input: this.urlBuilder.build(),
      init: {
        ...this.init,
        method: this.methodValue,
        headers: this.headers,
        body: this.bodyValue,
      },
      metadata: this.metadata,
    }
  }
}

export function buildRequest(block: (builder: RequestBuilder) => void): HolRequest {
  const builder = new SimpleRequestBuilder()

  block(builder)

  return builder.build()
}