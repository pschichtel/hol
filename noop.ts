import {
  Hol,
  HolRequest,
  HolResponse,
} from './model.js'

export function noop(request: HolRequest, execute: Hol): Promise<HolResponse> {
  return execute(request)
}