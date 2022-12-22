import {
  HolError,
  HolFilter,
  HolMetadata,
  HolMetadataKey,
  HolResponse,
} from './model.js'
import { HolResult } from './result.js'

export const RetryAttemptKey = new HolMetadataKey<number>("The attempt that got accepted")

export function retry(predicate: (result: HolResult, attempt: number) => Promise<boolean>): HolFilter {
  return async function RetryFilter(request, execute): Promise<HolResponse> {
    let attempt = 1
    const originalRequest = request.clone(false)
    while (true) {
      try {
        const response = await execute(originalRequest)
        const retryResult = await predicate({ type: 'response', response: response }, attempt)
        if (retryResult) {
          response.metadata.put(RetryAttemptKey, attempt)
          return response
        }
      } catch (e) {
        const retryResult = await predicate({ type: 'error', error: e }, attempt)
        if (retryResult) {
          const metadata = new HolMetadata()
          metadata.put(RetryAttemptKey, attempt)
          throw HolError.rethrowWithMetadata(e, metadata)
        }
      }
      attempt++
    }
  }
}