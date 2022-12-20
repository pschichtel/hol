import {
  HolError,
  HolInput,
  HolRequest,
  HolResponse,
  HolMetadata,
  HolFilter,
  Hol,
} from './model.js'
import { BodyDecoder } from './codec'

export function composeHol(hol: Hol, filters: ReadonlyArray<HolFilter>): Hol {
  if (filters.length == 0) {
    return hol
  }

  function composeFetch(currentFetch: Hol, i: number): Hol {
    if (i < 0) {
      return currentFetch
    }

    const filter = filters[i]
    const newFetch = function FilteredFetch(request: HolRequest) {
      return filter(request, currentFetch)
    }

    return composeFetch(newFetch, i - 1)
  }

  return composeFetch(hol, filters.length - 1)
}

export function hol(request: HolRequest): Promise<HolResponse> {
  return fetch(request.input, request.init).then(response => ({
    response: response,
    metadata: request.metadata,
    get successful(): boolean {
      return response.status >= 200 && response.status < 300
    },
    get clientError(): boolean {
      return response.status >= 400 && response.status < 500
    },
    get serverError(): boolean {
      return response.status >= 500 && response.status < 600
    },
    body<T>(decoder: BodyDecoder<T>): Promise<T> {
      return decoder(response, request.metadata)
    }
  }), error => {
    throw new HolError(error, request.metadata.clone())
  })
}

export function holToFetch(hol: Hol): (input: HolInput, init?: RequestInit) => Promise<Response> {
  return function HolAsFetch(input, init) {
    return hol({
      input: input,
      init: init,
      metadata: new HolMetadata(),
    }).then(response => response.response)
  }
}
