import { dataHolderHook, dataHolderHookResult } from "../hook"
import { useEffect } from "react"
import { DataHoler, JsonValue, Result } from "../../data_holer"

export function useDataHoler<I extends JsonValue, O>(dataHoler: DataHoler<I, O>, input: I): O {
    return dataHolderHook(useEffect, dataHoler, input)
}

export function useDataHolerResult<I extends JsonValue, O>(
    dataHoler: DataHoler<I, O>,
    input: I,
): Result<O> {
    return dataHolderHookResult(useEffect, dataHoler, input)
}
