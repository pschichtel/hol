export type JsonSerializable = null | boolean | string | number | Array<JsonSerializable> | { [key: string]: JsonSerializable }

/**
 * A data fetcher for use with React-style frameworks.
 */
export class DataHoler {
  private readonly keyMapping: { [key: string]: string } = {}
  private readonly values: { [key: string]: any } = {}
  private readonly errors: { [key: string]: any } = {}
  private readonly pendingPromises: { [key: string]: [Promise<any>, AbortController] } = {}

  private makeFullKey(key: string, input: JsonSerializable) {
    return `${key}-${JSON.stringify(input)}`
  }

  private holIt<I extends JsonSerializable, O>(key: string, fullKey: string, input: I, f: (params: I, signal: AbortSignal) => Promise<O>): Promise<O> {
    this.forget(key, "superseded")
    this.keyMapping[key] = fullKey
    const abortController = new AbortController()
    const promise = f(input, abortController.signal).then((value) => {
      delete this.pendingPromises[fullKey]
      this.values[fullKey] = value
      return value;
    }, (error) => {
      delete this.pendingPromises[fullKey]
      this.errors[fullKey] = error
      throw error
    })
    this.pendingPromises[fullKey] = [promise, abortController]
    return promise
  }

  /**
   * Pre-fetches data asynchronously and provides a promise for it.
   *
   * @param key a key identifying the kind of request uniquely
   * @param input the inputs into the fetching function, these should be `JSON.stringify` compatible
   * @param f the function doing the actual fetching which will run once per unique pair of key and input
   * @return a Promise for the value
   */
  preHol<I extends JsonSerializable, O>(key: string, input: I, f: (params: I, signal: AbortSignal) => Promise<O>): Promise<O> {
    const fullKey = this.makeFullKey(key, input)
    const existingValue = this.values[fullKey]
    if (existingValue !== undefined) {
      return Promise.resolve(existingValue)
    }
    const existingError = this.errors[fullKey]
    if (existingError !== undefined) {
      return Promise.reject(existingError)
    }
    const existingPromise = this.pendingPromises[fullKey]
    if (existingPromise !== undefined) {
      const [promise] = existingPromise
      return promise as Promise<O>
    }

    return this.holIt(key, fullKey, input, f)
  }

  /**
   * Fetches data asynchronously.
   *
   * @param key a key identifying the kind of request uniquely
   * @param input the inputs into the fetching function, these should be `JSON.stringify` compatible
   * @param f the function doing the actual fetching which will run once per unique pair of key and input
   * @return the value once it is available
   * @throws either a Promise while it is still pending or the value the Promise was rejected with
   */
  hol<I extends JsonSerializable, O>(key: string, input: I, f: (params: I, signal: AbortSignal) => Promise<O>): O {
    const fullKey = this.makeFullKey(key, input)
    const existingValue = this.values[fullKey]
    if (existingValue !== undefined) {
      return existingValue
    }
    const existingError = this.errors[fullKey]
    if (existingError !== undefined) {
      throw existingError
    }
    const existingPromise = this.pendingPromises[fullKey]
    if (existingPromise !== undefined) {
      const [promise] = existingPromise
      throw promise
    }

    throw this.holIt(key, fullKey, input, f)
  }

  /**
   * Forgets cached data for a given key.
   *
   * @param key a key identifying the kind of request uniquely
   * @param reason the reason for the removal, this will be used as the abortion reason
   */
  forget(key: string, reason?: string) {
    const mappedKey = this.keyMapping[key]
    if (mappedKey !== undefined) {
      delete this.keyMapping[key]
      const pendingPromise = this.pendingPromises[mappedKey]
      if (pendingPromise !== undefined) {
        const [, abortController] = pendingPromise
        abortController.abort(`request was forgotten: ${reason}`)
        delete this.pendingPromises[mappedKey]
      }
      delete this.errors[mappedKey]
      delete this.values[mappedKey]
      delete this.values[mappedKey]
    }
  }
}