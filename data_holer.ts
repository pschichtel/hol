/**
 * A data fetcher for use with React-style frameworks.
 */
class DataHoler {
  private readonly keyMapping: { [key: string]: string } = {}
  private readonly values: { [key: string]: any } = {}
  private readonly errors: { [key: string]: any } = {}
  private readonly pendingPromises: { [key: string]: [Promise<any>, AbortController] } = {}

  /**
   * Fetches data asynchronously.
   *
   * @param key a key identifying the kind of request uniquely
   * @param input the inputs into the fetching function, these should be `JSON.stringify` compatible
   * @param f the function doing the actual fetching which will run once per unique pair of key and input
   */
  hol<I, O>(key: string, input: I, f: (params: I, signal: AbortSignal) => Promise<O>): O {
    const fullKey = `${key}-${JSON.stringify(input)}`
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
      throw existingPromise
    }

    this.forget(key, "superseded")
    this.keyMapping[key] = fullKey
    const abortController = new AbortController()
    const promise = f(input, abortController.signal).then((value) => {
      delete this.pendingPromises[fullKey]
      this.values[fullKey] = value
    }, (error) => {
      delete this.pendingPromises[fullKey]
      this.errors[fullKey] = error
    })
    this.pendingPromises[fullKey] = [promise, abortController]

    throw promise
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