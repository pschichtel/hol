import {
  buildRequest,
  QueryParams,
  RequestBuilder,
  SimpleRequestBuilder,
} from '../requestBuilder.js'
import {
  Hol,
  HolFilter,
  HolRequest,
  HolResponse,
} from '../model.js'
import {
  composeHol,
  holToFetch,
} from '../index.js'
import { BodyEncoder } from '../codec'

export class Client {
  private readonly rawHol: Hol
  private composedHol: Hol

  constructor(hol: Hol, filters?: ReadonlyArray<HolFilter>) {
    this.rawHol = hol
    this.composedHol = composeHol(hol, filters ?? [])
  }

  setFilters(filters: ReadonlyArray<HolFilter>) {
    this.composedHol = composeHol(this.rawHol, filters)
  }

  buildRequest(build: (builder: RequestBuilder) => void): HolRequest {
    const builder = new SimpleRequestBuilder()
    build(builder)
    return builder.build()
  }

  execute(request: HolRequest, adhocFilters?: Array<HolFilter>): Promise<HolResponse> {
    if (adhocFilters && adhocFilters.length > 0) {
      return composeHol(this.composedHol, adhocFilters)(request)
    }
    return this.composedHol(request)
  }

  buildAndExecuteRequest(build: (builder: RequestBuilder) => void, adhocFilters?: Array<HolFilter>): Promise<HolResponse> {
    return this.execute(buildRequest(build), adhocFilters)
  }

  private simpleExecuteWithoutBody(method: 'GET' | 'DELETE' | 'OPTIONS' | 'HEAD',
                                   target: URL | string,
                                   queryParams?: QueryParams,
                                   abortSignal?: AbortSignal) {
    const request = this.buildRequest(req => {
      req.method(method)
      req.buildUrl(url => {
        url.from(target)
        if (queryParams) {
          url.addQueryParams(queryParams)
        }
      })
      if (abortSignal) {
        req.abortOn(abortSignal)
      }
    })
    return this.execute(request)
  }

  get(target: URL | string, queryParams?: QueryParams, abortSignal?: AbortSignal): Promise<HolResponse> {
    return this.simpleExecuteWithoutBody('GET', target, queryParams, abortSignal)
  }

  delete(target: URL | string, queryParams?: QueryParams, abortSignal?: AbortSignal): Promise<HolResponse> {
    return this.simpleExecuteWithoutBody('DELETE', target, queryParams, abortSignal)
  }

  options(target: URL | string, queryParams?: QueryParams, abortSignal?: AbortSignal): Promise<HolResponse> {
    return this.simpleExecuteWithoutBody('OPTIONS', target, queryParams, abortSignal)
  }

  head(target: URL | string, queryParams?: QueryParams, abortSignal?: AbortSignal): Promise<HolResponse> {
    return this.simpleExecuteWithoutBody('HEAD', target, queryParams, abortSignal)
  }

  private simpleExecuteWithBody(method: 'POST' | 'PUT' | 'PATCH' | 'QUERY',
                                target: URL | string,
                                body?: BodyEncoder,
                                abortSignal?: AbortSignal) {
    const request = this.buildRequest(req => {
      req.buildUrl(url => {
        url.from(target)
      })
      req.method(method)
      if (body) {
        body(req)
      }
      if (abortSignal) {
        req.abortOn(abortSignal)
      }
    })
    return this.execute(request)
  }

  post(target: URL | string, body?: BodyEncoder, abortSignal?: AbortSignal): Promise<HolResponse> {
    return this.simpleExecuteWithBody('POST', target, body, abortSignal)
  }

  put(target: URL | string, body?: BodyEncoder, abortSignal?: AbortSignal): Promise<HolResponse> {
    return this.simpleExecuteWithBody('PUT', target, body, abortSignal)
  }

  patch(target: URL | string, body?: BodyEncoder, abortSignal?: AbortSignal): Promise<HolResponse> {
    return this.simpleExecuteWithBody('PATCH', target, body, abortSignal)
  }

  query(target: URL | string, body?: BodyEncoder, abortSignal?: AbortSignal): Promise<HolResponse> {
    return this.simpleExecuteWithBody('QUERY', target, body, abortSignal)
  }

  asHol(): Hol {
    const self = this
    return function ClientAsHol(request): Promise<HolResponse> {
      return self.composedHol(request)
    }
  }

  asFetch(): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
    return holToFetch(this.asHol())
  }
}