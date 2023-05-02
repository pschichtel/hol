import {
  Hol,
  HolFilter,
  HolRequest,
  HolResponse,
} from './model'
import { fetchToHolRequest } from './index'

export type CacheLookup = (cache: Cache, request: HolRequest) => Promise<HolResponse | undefined>
export type FetchCacheLookup = (cache: Cache, request: Request) => Promise<Response | undefined>

export function fetchLookup(f: FetchCacheLookup): CacheLookup {
  return async function HolLookup(cache: Cache, request: HolRequest): Promise<HolResponse | undefined> {
    const response = await f(cache, request.toFetchRequest())
    if (response === undefined) {
      return undefined
    }
    return fetchToHolRequest(response, request.metadata.clone())
  }
}

export async function caching(cache: Cache, request: HolRequest, cacheOptions?: CacheQueryOptions): Promise<HolResponse | undefined> {
  let response = await cache.match(request.toFetchRequest(), cacheOptions)
  if (response === undefined) {
    return undefined
  }
  return fetchToHolRequest(response, request.metadata.clone())
}

function noCaching(): Promise<HolResponse | undefined> {
  return Promise.resolve(undefined)
}

export function cache(cacheName: string, lookup?: CacheLookup): HolFilter {
  const lookupFunction = lookup ?? noCaching
  const cachePromise = caches.open(cacheName)
  return async function CacheFilter(request: HolRequest, execute: Hol): Promise<HolResponse> {
    const cache = await cachePromise
    const cachedResponse = await lookupFunction(cache, request)
    if (cachedResponse !== undefined) {
      return cachedResponse
    }

    const response = await execute(request)
    await cache.put(request.toFetchRequest(), response.response)
    return response
  }
}