import { HolResponse } from "./model"

export type HolResult = HolResponseResult | HolErrorResult

export type HolResponseResult = {
    type: "response"
    response: HolResponse
}

export type HolErrorResult = {
    type: "error"
    error: any
}
