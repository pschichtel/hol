import { useEffect } from 'react';
import {
  DataHoler,
  JsonSerializable,
} from '../data_holer'

function useDataHoler<I extends JsonSerializable, O>(dataHoler: DataHoler<I, O>, input: I): O {
  const key = dataHoler.internal.key(input)
  try {
    const output = dataHoler.internal.holWithKey(key, input)
    useEffect(() => {
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