import { BodyDecoder } from './codec'

export class HolMetadata {
  private readonly metadata = new Map<symbol, any>()

  get<T>(key: HolMetadataKey<T>): T | undefined {
    return this.metadata.get(key.symbol) as T | undefined
  }

  put<T>(key: HolMetadataKey<T>, value: T): T | undefined {
    const old = this.metadata.get(key.symbol)
    this.metadata.set(key.symbol, value)
    return old
  }

  compute<T>(key: HolMetadataKey<T>, compute: (value: T | undefined) => T) {
    this.put(key, compute(this.get(key)))
  }

  putAll(other: HolMetadata) {
    for (let [symbol, value] of other.metadata.entries()) {
      this.metadata.set(symbol, value)
    }
  }

  merge(other: HolMetadata): HolMetadata {
    const out = this.clone()
    out.putAll(other)
    return out
  }

  clone(): HolMetadata {
    const out = new HolMetadata()
    out.putAll(this)
    return out
  }

  entries(): IterableIterator<[symbol, any]> {
    return this.metadata.entries()
  }
}

export class HolMetadataKey<T> {
  readonly symbol: symbol

  constructor(description: string) {
    this.symbol = Symbol(description)
  }

  cast(value: any): T {
    return value as T
  }
}

export interface HolResponse {
  response: Response
  metadata: HolMetadata
  get statusCode(): number
  get successful(): boolean
  get clientError(): boolean
  get serverError(): boolean
  get headers(): Headers
  body<T>(decoder: BodyDecoder<T>): Promise<T>
}

export class HolError implements Error {
  name: string
  message: string
  stack?: string
  cause: any
  metadata: HolMetadata

  constructor(error: any, metadata: HolMetadata) {
    if (error instanceof HolError) {
      this.name = error.name
      this.message = error.message
      this.stack = error.stack
      this.cause = error.cause
      this.metadata = error.metadata.merge(metadata)
    } else if (typeof error === 'string') {
      this.name = error
      this.message = error
      this.stack = undefined
      this.cause = error
      this.metadata = metadata
    } else {
      this.name = error?.name ?? 'unknown'
      this.message = error?.message ?? ''
      this.stack = error?.stack
      this.cause = error
      this.metadata = metadata
    }
  }

  static rethrowWithMetadata<T>(error: any, metadata: HolMetadata): never {
    if (error instanceof HolError) {
      error.metadata.putAll(metadata)
      throw error
    } else {
      throw new HolError(error, metadata)
    }
  }
}

export type HolInput = RequestInfo | URL

export class HolRequest {
  input: HolInput
  init: RequestInit
  readonly metadata: HolMetadata

  constructor(input: HolInput, init?: RequestInit, metadata?: HolMetadata) {
    this.input = input
    this.init = init ?? {}
    this.metadata = metadata ?? new HolMetadata()
  }

  get headers() {
    let headers = this.init.headers
    if (!headers) {
      headers = new Headers()
      this.init.headers = headers;
    } else if (!(headers instanceof Headers)) {
      headers = new Headers(this.init.headers)
      this.init.headers = headers
    }
    return headers;
  }

  clone(cloneMetadata: boolean) {
    return {
      ...this,
      init: {
        ...this.init,
      },
      metadata: cloneMetadata ? this.metadata.clone() : this.metadata,
    }
  }

  toFetchRequest(): Request {
    return new Request(this.input, this.init)
  }
}

export type Hol = (request: HolRequest) => Promise<HolResponse>
export type HolFilter = (request: HolRequest, execute: Hol) => Promise<HolResponse>

