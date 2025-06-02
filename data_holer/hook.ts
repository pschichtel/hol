import {
  DependencyList,
  EffectCallback,
} from 'react'
import {
  DataHoler,
  JsonSerializable,
} from '../data_holer'

export function dataHolderHook<I extends JsonSerializable, O>(hook: (effectCallback: EffectCallback, dependencies: DependencyList) => void, dataHoler: DataHoler<I, O>, input: I): O {
  const key = dataHoler.internal.key(input)
  try {
    const output = dataHoler.internal.holWithKey(key, input)
    hook(() => {
      return () => {
        dataHoler.internal.forgetWithKey(key, "unmount")
      }
    }, [key, dataHoler])
    return output
  } catch (e) {
    dataHoler.internal.forgetWithKey(key, "error")
    throw e
  }
}