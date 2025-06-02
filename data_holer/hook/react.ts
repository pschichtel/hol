import { dataHolderHook } from "../hook"
import { useEffect } from "react"
import { DataHoler, JsonSerializable } from "../../data_holer"

export function useDataHoler<I extends JsonSerializable, O>(
    dataHoler: DataHoler<I, O>,
    input: I,
): O {
    return dataHolderHook(useEffect, dataHoler, input)
}
