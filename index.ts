class FetchyMetadata {
  private readonly metadata = new Map<Symbol, any>()

  get<T>(key: FetchyMetadataKey<T>): T | undefined {
    return this.metadata.get(key.symbol) as T | undefined
  }

  put<T>(key: FetchyMetadataKey<T>, value: T): T | undefined {
    const old = this.metadata.get(key.symbol)
    this.metadata.set(key.symbol, value)
    return old
  }

  putAll(other: FetchyMetadata) {
    for (let [symbol, value] of other.metadata.entries()) {
      this.metadata.set(symbol, value)
    }
  }

  merge(other: FetchyMetadata): FetchyMetadata {
    const out = this.clone()
    out.putAll(other)
    return out
  }

  clone(): FetchyMetadata {
    const out = new FetchyMetadata()
    out.putAll(this)
    return out;
  }

  entries(): IterableIterator<[Symbol, any]> {
    return this.metadata.entries()
  }
}

class FetchyMetadataKey<T> {
  readonly symbol: Symbol

  constructor(description: string) {
    this.symbol = Symbol(description);
  }

  cast(value: any): T {
    return value as T
  }
}

interface FetchyResponse {
  response: Response
  metadata: FetchyMetadata
}

class FetchyError implements Error {
  name: string
  message: string
  stack?: string
  cause: any
  metadata: FetchyMetadata

  constructor(error: any, metadata: FetchyMetadata) {
    if (error instanceof FetchyError) {
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

  static rethrowWithMetadata<T>(error: any, metadata: FetchyMetadata): never {
    if (error instanceof FetchyError) {
      error.metadata.putAll(metadata)
      throw error
    } else {
      throw new FetchyError(error, metadata)
    }
  }
}

type FetchInput = RequestInfo | URL

interface FetchyRequest {
  input: FetchInput
  init?: RequestInit,
  metadata: FetchyMetadata
}

type Fetchy = (request: FetchyRequest) => Promise<FetchyResponse>
type FetchyFilter = (request: FetchyRequest, execute: Fetchy) => Promise<FetchyResponse>

function compose(fetch: Fetchy, filters: ReadonlyArray<FetchyFilter>): Fetchy {
  if (filters.length == 0) {
    return fetch
  }

  function composeFetch(currentFetch: Fetchy, i: number): Fetchy {
    if (i < 0) {
      return currentFetch
    }

    const filter = filters[i]
    const newFetch = function FilteredFetch(request: FetchyRequest) {
      return filter(request, currentFetch)
    }

    return composeFetch(newFetch, i - 1)
  }

  return composeFetch(fetch, filters.length - 1)
}

function logger(request: FetchyRequest, execute: Fetchy): Promise<FetchyResponse> {
  console.log('input', request.input)
  return execute(request).then(
    (response) => {
      console.log('complete', response)
      return response
    },
    (error) => {
      console.log('reject', error)
      throw error;
    }
  )
}

const PerfRequestDurationKey = new FetchyMetadataKey<number>("request duration")

function perf(request: FetchyRequest, execute: Fetchy): Promise<FetchyResponse> {
  const start = performance.now()
  return execute(request).then(
    (response) => {
      const end = performance.now()
      response.metadata.put(PerfRequestDurationKey, end - start)
      return response
    },
    (error) => {
      const end = performance.now()
      const metadata = new FetchyMetadata()
      metadata.put(PerfRequestDurationKey, end - start)
      FetchyError.rethrowWithMetadata(error, metadata)
    }
  )
}

const TimeoutKey = new FetchyMetadataKey<number>("the maximum request duration in millis")
const TimeoutHappenedKey = new FetchyMetadataKey<boolean>("whether the request timeout out or not")

function timeout(millis: number): FetchyFilter {
  return function TimeoutFilter(request: FetchyRequest, execute: Fetchy): Promise<FetchyResponse> {
    request.metadata.put(TimeoutKey, millis)
    const abort = new AbortController()
    const signal = abort.signal

    const parentAbortReason = 'parent'
    const timeoutAbortReason = 'timeout';

    const existingSignal = request.init?.signal
    if (existingSignal) {
      if (existingSignal.aborted) {
        abort.abort(parentAbortReason)
      } else {
        existingSignal.addEventListener('abort', () => abort.abort(parentAbortReason))
      }
    }

    const augmentedRequest = {
      ...request,
      init: {
        ...request.init,
        signal: signal,
      },
    }

    let timer: number | undefined = undefined
    timer = setTimeout(() => {
      abort.abort(timeoutAbortReason)
      timer = undefined
    }, millis)

    return execute(augmentedRequest).then(
      (response) => {
        if (timer) {
          clearTimeout(timer)
        }
        return response
      },
      (error) => {
        if (timer) {
          clearTimeout(timer)
        }
        const metadata = request.metadata.clone()
        const fetchyError = new FetchyError(error, metadata)
        if (error == timeoutAbortReason || error?.code && error.code === 'ERR_CANCELLED') {
          metadata.put(TimeoutHappenedKey, signal.aborted && signal.reason === timeoutAbortReason)
        }
        throw fetchyError
      }
    )
  }
}

function delay(millis: number): FetchyFilter {
  return function DelayFilter(request: FetchyRequest, execute: Fetchy): Promise<FetchyResponse> {
    return new Promise((fulfill, reject) => {
      const timer = setTimeout(() => {
        execute(request).then(fulfill, reject)
      }, millis)

      const signal = request.init?.signal
      if (signal) {
        if (signal.aborted) {
          clearTimeout(timer)
          try {
            signal.throwIfAborted()
          } catch (e) {
            reject(e)
          }
        } else {
          signal.addEventListener('abort', () => {
            clearTimeout(timer)
            try {
              signal.throwIfAborted()
            } catch (e) {
              reject(e)
            }
          })
        }
      }
    })
  }
}

function fetchy(request: FetchyRequest): Promise<FetchyResponse> {
  return fetch(request.input, request.init).then(response => ({
    response: response,
    metadata: request.metadata,
  }), error => {
    throw new FetchyError(error, request.metadata.clone())
  })
}

export function fetchyToFetch(fetchy: Fetchy): (input: FetchInput, init?: RequestInit) => Promise<Response> {
  return (input, init) => {
    return fetchy({
      input: input,
      init: init,
      metadata: new FetchyMetadata(),
    }).then(response => response.response)
  }
}
