import {
  HolFilter,
  HolResponse,
} from './model'
import { HolResult } from './result'

export function retry(predicate: (result: HolResult, attempt: number) => Promise<boolean>): HolFilter {
  return async function RetryFilter(request, execute): Promise<HolResponse> {
    let attempt = 1
    while (true) {
      try {
        const response = await execute(request)
        const retryResult = await predicate({ type: 'response', response: response }, attempt)
        if (retryResult) {
          return response
        }
      } catch (e) {
        const retryResult = await predicate({ type: 'error', error: e }, attempt)
        if (retryResult) {
          throw e
        }
      }
      attempt++
    }
  }
}