import { dataHolderHook } from "../hook"
import { useEffect } from "react"
import { DataHoler, JsonValue } from "../../data_holer"

export function useDataHoler<I extends JsonValue, O>(
    dataHoler: DataHoler<I, O>,
    input: I,
): O {
    return dataHolderHook(useEffect, dataHoler, input)
}
