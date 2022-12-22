import {
  HolResponse,
} from './model.js'

export type HolResult = HolResponseResult | HolErrorResult

export type HolResponseResult = {
  type: 'response'
  response: HolResponse
}

export type HolErrorResult = {
  type: 'error'
  error: any
}
