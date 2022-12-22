import {
  Hol,
  HolRequest,
  HolResponse,
} from './model'

export function noop(request: HolRequest, execute: Hol): Promise<HolResponse> {
  return execute(request)
}