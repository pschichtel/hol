import {
  Hol,
  HolError,
  HolMetadata,
  HolMetadataKey,
  HolRequest,
  HolResponse,
} from './model.js'

export const PerfRequestDurationKey = new HolMetadataKey<number>('request duration')

export function perf(request: HolRequest, execute: Hol): Promise<HolResponse> {
  const start = performance.now()
  return execute(request).then(
    (response) => {
      const end = performance.now()
      response.metadata.put(PerfRequestDurationKey, end - start)
      return response
    },
    (error) => {
      const end = performance.now()
      const metadata = new HolMetadata()
      metadata.put(PerfRequestDurationKey, end - start)
      HolError.rethrowWithMetadata(error, metadata)
    },
  )
}
