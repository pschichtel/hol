import {
  Hol,
  HolError,
  HolFilter,
  HolMetadataKey,
  HolRequest,
  HolResponse,
} from './model'

export const TimeoutKey = new HolMetadataKey<number>('the maximum request duration in millis')
export const TimeoutHappenedKey = new HolMetadataKey<boolean>('whether the request timeout out or not')

export function timeout(millis: number): HolFilter {
  return function TimeoutFilter(request: HolRequest, execute: Hol): Promise<HolResponse> {
    request.metadata.put(TimeoutKey, millis)
    const abort = new AbortController()
    const signal = abort.signal

    const parentAbortReason = 'parent'
    const timeoutAbortReason = 'timeout'

    const existingSignal = request.init.signal
    if (existingSignal) {
      if (existingSignal.aborted) {
        abort.abort(parentAbortReason)
      } else {
        existingSignal.addEventListener('abort', () => abort.abort(parentAbortReason))
      }
    }
    request.init.signal = abort.signal

    let timer: number | undefined = undefined
    timer = window.setTimeout(() => {
      abort.abort(timeoutAbortReason)
      timer = undefined
    }, millis)

    return execute(request).then(
      (response) => {
        if (timer) {
          window.clearTimeout(timer)
        }
        return response
      },
      (error) => {
        if (timer) {
          window.clearTimeout(timer)
        }
        const metadata = request.metadata.clone()
        const holError = new HolError(error, metadata)
        if (error == timeoutAbortReason || error?.code && error.code === 'ERR_CANCELLED') {
          metadata.put(TimeoutHappenedKey, signal.aborted && signal.reason === timeoutAbortReason)
        }
        throw holError
      },
    )
  }
}
