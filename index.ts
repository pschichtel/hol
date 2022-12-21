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
import { composeFilters } from './filter_chain'

export function composeHol(hol: Hol, filters: ReadonlyArray<HolFilter>): Hol {
  const filter = composeFilters(filters)
  return (req) => filter(req, hol)
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
