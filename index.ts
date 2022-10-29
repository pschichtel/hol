import {
  HolError,
  HolInput,
  HolRequest,
  HolResponse,
  HolMetadata,
  HolFilter,
  Hol,
} from './model.js'

export function compose(hol: Hol, filters: ReadonlyArray<HolFilter>): Hol {
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
  }), error => {
    throw new HolError(error, request.metadata.clone())
  })
}

export function holToFetch(fetchy: Hol): (input: HolInput, init?: RequestInit) => Promise<Response> {
  return (input, init) => {
    return fetchy({
      input: input,
      init: init,
      metadata: new HolMetadata(),
    }).then(response => response.response)
  }
}
