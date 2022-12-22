import {
  HolFilter,
  HolRequest,
  HolResponse,
} from './model'

export const consoleLogger = logger({
  before(request: HolRequest) {
    console.log('input', request)
  },
  fulfilled(request: HolRequest, response: HolResponse) {
    console.log('fulfilled', response)
  },
  failed(request: HolRequest, error: any) {
    console.log('failed', error)
  },
})

export interface RequestLogger {
  before(request: HolRequest): void

  fulfilled(request: HolRequest, response: HolResponse): void

  failed(request: HolRequest, error: any): void
}

export function logger(logger: RequestLogger): HolFilter {
  return function LoggingFilter(request, execute) {
    logger.before(request)
    return execute(request).then(
      (response) => {
        logger.fulfilled(request, response)
        return response
      },
      (error) => {
        logger.failed(request, error)
        console.log('reject', error)
        throw error
      },
    )
  }
}
