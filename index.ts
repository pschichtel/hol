

type FetchInput = RequestInfo | URL
type FetchResult = Promise<Response>
type Fetch = (input: FetchInput, init?: RequestInit) => FetchResult
type Filter = (execute: Fetch, input: FetchInput, init?: RequestInit) => FetchResult

interface Request {
  input: FetchInput
  metadata: Map<Symbol, any>
}

interface Result {
  response: Response
  metadata: Map<Symbol, any>
}

function compose(fetch: Fetch, filters: ReadonlyArray<Filter>): Fetch {
  if (filters.length == 0) {
    return fetch
  }

  function composeFetch(currentFetch: Fetch, i: number): Fetch {
    if (i < 0) {
      return currentFetch
    }

    const filter = filters[i]
    const newFetch = function FilteredFetch(input: FetchInput, init?: RequestInit) {
      return filter(currentFetch, input, init)
    }

    return composeFetch(newFetch, i - 1)
  }

  return composeFetch(fetch, filters.length - 1)
}

function logger(execute: Fetch, input: FetchInput, init?: RequestInit): FetchResult {
  console.log('input', input)
  return execute(input, init).then(
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

function perf(execute: Fetch, input: FetchInput, init?: RequestInit): FetchResult {
  const start = performance.now()
  return execute(input, init).then(
    (response) => {
      const end = performance.now()
      console.log(`Completed in ${end - start}ms!`)
      return response
    },
    (error) => {
      const end = performance.now()
      console.log(`Failed in ${end - start}ms!`)
      throw error
    }
  )
}

function timeout(millis: number, reason?: any): Filter {
  return function TimeoutFilter(execute: Fetch, input: FetchInput, init?: RequestInit): FetchResult {
    const abort = new AbortController()
    const signal = abort.signal

    const existingSignal = init?.signal
    if (existingSignal) {
      if (existingSignal.aborted) {
        abort.abort(reason)
      } else {
        existingSignal.addEventListener('abort', () => abort.abort(reason))
      }
    }

    const downstreamInit = {
      ...init,
      signal: signal,
    }

    downstreamInit.signal.onabort

    let timer: number | undefined = undefined
    timer = setTimeout(() => {
      abort.abort(reason)
      timer = undefined
    }, millis)

    return execute(input, downstreamInit).then(
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
        throw error
      }
    )
  }
}

function delay(millis: number): Filter {
  return function DelayFilter(execute: Fetch, input: FetchInput, init?: RequestInit): FetchResult {
    return new Promise((fulfill, reject) => {
      const timer = setTimeout(() => {
        execute(input, init).then(fulfill, reject)
      }, millis)

      const signal = init?.signal
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

const client = compose(fetch, [logger, perf, timeout(3000, "meh!"), delay(4000)])

document.addEventListener('DOMContentLoaded', () => {
  client(new URL('https://api.github.com')).then(response => {
    console.log(response.statusText)
  })
});
