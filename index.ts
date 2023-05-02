import {
  HolError,
  HolInput,
  HolRequest,
  HolResponse,
  HolMetadata,
  HolFilter,
  Hol,
} from './model'
import { BodyDecoder } from './codec'
import { composeFilters } from './filter_chain'

export function composeHol(hol: Hol, filters: ReadonlyArray<HolFilter>): Hol {
  const filter = composeFilters(filters)
  return (req) => filter(req, hol)
}

export function fetchToHolRequest(response: Response, metadata?: HolMetadata): HolResponse {
  let responseMetadata = metadata ?? new HolMetadata()
  return {
    response: response,
    metadata: responseMetadata,
    get statusCode(): number {
      return response.status
    },
    get successful(): boolean {
      return response.status >= 200 && response.status < 300
    },
    get clientError(): boolean {
      return response.status >= 400 && response.status < 500
    },
    get serverError(): boolean {
      return response.status >= 500 && response.status < 600
    },
    get headers(): Headers {
      return response.headers
    },
    body<T>(decoder: BodyDecoder<T>): Promise<T> {
      return decoder(response, responseMetadata)
    }
  }
}

export function hol(request: HolRequest): Promise<HolResponse> {
  const clonedMetadata = request.metadata.clone()
  return fetch(request.input, request.init).then(response => fetchToHolRequest(response, clonedMetadata), error => {
    throw new HolError(error, clonedMetadata)
  })
}

export function holToFetch(hol: Hol): (input: HolInput, init?: RequestInit) => Promise<Response> {
  return function HolAsFetch(input, init) {
    return hol(new HolRequest(input, init, new HolMetadata())).then(response => response.response)
  }
}
