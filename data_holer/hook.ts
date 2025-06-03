import { DependencyList, EffectCallback } from "react"
import { DataHoler, JsonValue, Result } from "../data_holer"

export function internalDataHolderHook<I extends JsonValue, InternalO, O>(
    hook: (effectCallback: EffectCallback, dependencies: DependencyList) => void,
    dataHoler: DataHoler<I, InternalO>,
    input: I,
    success: (internal: InternalO) => O,
    error: (e: unknown) => O,
): O {
    const key = dataHoler.internal.key(input)
    try {
        const output = dataHoler.internal.holWithKey(key, input)
        hook(() => {
            return () => {
                dataHoler.internal.forgetWithKey(key, "unmount")
            }
        }, [key, dataHoler])
        return success(output)
    } catch (e) {
        dataHoler.internal.rethrowPromiseWithKey(key, e)
        dataHoler.internal.forgetWithKey(key, "error")
        return error(e)
    }
}

export function dataHolderHook<I extends JsonValue, O>(
    hook: (effectCallback: EffectCallback, dependencies: DependencyList) => void,
    dataHoler: DataHoler<I, O>,
    input: I,
): O {
    return internalDataHolderHook<I, O, O>(
        hook,
        dataHoler,
        input,
        o => o,
        e => {
            throw e
        },
    )
}

export function dataHolderHookResult<I extends JsonValue, O>(
    hook: (effectCallback: EffectCallback, dependencies: DependencyList) => void,
    dataHoler: DataHoler<I, O>,
    input: I,
): Result<O> {
    return internalDataHolderHook<I, O, Result<O>>(
        hook,
        dataHoler,
        input,
        o => ({
            type: "success",
            value: o,
        }),
        e => ({
            type: "error",
            error: e,
        }),
    )
}
