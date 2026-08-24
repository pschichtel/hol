import { buildRequest, QueryParams, RequestBuilder, SimpleRequestBuilder } from "../requestBuilder"
import { Hol, HolFilter, HolRequest, HolResponse } from "../model"
import { composeHol, holToFetch } from "../index"
import { BodyEncoder } from "../codec"

export type RequestTarget = URL | string

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

    buildAndExecuteRequest(
        build: (builder: RequestBuilder) => void,
        adhocFilters?: Array<HolFilter>,
    ): Promise<HolResponse> {
        return this.execute(buildRequest(build), adhocFilters)
    }

    private simpleExecute(
        method: string,
        target: RequestTarget,
        queryParams: QueryParams | undefined,
        body: BodyEncoder | undefined,
        abortSignal: AbortSignal | undefined,
    ) {
        const request = this.buildRequest(req => {
            req.method(method)
            req.buildUrl(url => {
                url.from(target)
                if (queryParams) {
                    url.addQueryParams(queryParams)
                }
            })
            if (body) {
                body(req)
            }
            if (abortSignal) {
                req.abortOn(abortSignal)
            }
        })
        return this.execute(request)
    }

    get(
        target: RequestTarget,
        queryParams?: QueryParams,
        abortSignal?: AbortSignal,
    ): Promise<HolResponse> {
        return this.simpleExecute("GET", target, queryParams, undefined, abortSignal)
    }

    delete(
        target: RequestTarget,
        queryParams?: QueryParams,
        body?: BodyEncoder,
        abortSignal?: AbortSignal,
    ): Promise<HolResponse> {
        return this.simpleExecute("DELETE", target, queryParams, body, abortSignal)
    }

    options(
        target: RequestTarget,
        queryParams?: QueryParams,
        abortSignal?: AbortSignal,
    ): Promise<HolResponse> {
        return this.simpleExecute("OPTIONS", target, queryParams, undefined, abortSignal)
    }

    head(
        target: RequestTarget,
        queryParams?: QueryParams,
        abortSignal?: AbortSignal,
    ): Promise<HolResponse> {
        return this.simpleExecute("HEAD", target, queryParams, undefined, abortSignal)
    }

    post(
        target: RequestTarget,
        queryParams?: QueryParams,
        body?: BodyEncoder,
        abortSignal?: AbortSignal,
    ): Promise<HolResponse> {
        return this.simpleExecute("POST", target, queryParams, body, abortSignal)
    }

    put(
        target: RequestTarget,
        queryParams?: QueryParams,
        body?: BodyEncoder,
        abortSignal?: AbortSignal,
    ): Promise<HolResponse> {
        return this.simpleExecute("PUT", target, queryParams, body, abortSignal)
    }

    patch(
        target: RequestTarget,
        queryParams?: QueryParams,
        body?: BodyEncoder,
        abortSignal?: AbortSignal,
    ): Promise<HolResponse> {
        return this.simpleExecute("PATCH", target, queryParams, body, abortSignal)
    }

    query(
        target: RequestTarget,
        queryParams?: QueryParams,
        body?: BodyEncoder,
        abortSignal?: AbortSignal,
    ): Promise<HolResponse> {
        return this.simpleExecute("QUERY", target, queryParams, body, abortSignal)
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
