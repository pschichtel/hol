import {
  Hol,
  HolFilter,
  HolRequest,
  HolResponse,
} from './model'

export function delay(millis: number): HolFilter {
  return function DelayFilter(request: HolRequest, execute: Hol): Promise<HolResponse> {
    return new Promise((fulfill, reject) => {
      const timer = setTimeout(() => {
        execute(request).then(fulfill, reject)
      }, millis)

      const signal = request.init?.signal
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
