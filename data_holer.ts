export interface JsonEncodable {
    toJSON(): NativeJsonValue
}

/**
 * This class can be used to JSON-encode foreign values.
 */
export class Jsonify<T> implements JsonEncodable {
    readonly value: T
    readonly encoder: (value: T) => NativeJsonValue

    constructor(value: T, encoder: (value: T) => NativeJsonValue) {
        this.value = value
        this.encoder = encoder
    }

    toString(): string {
        // this coerces the values into a string, whether there is a toString or not.
        return `${this.value}`
    }

    toJSON(): NativeJsonValue {
        return this.encoder(this.value)
    }
}

/**
 * This type represents all values that produce useful and predictable results with `JSON.stringify()` without the use
 * of a toJSON method. This type is returned by toJSON, because it does not support values that themselves require
 * immediately calling toJSON again.
 */
export type NativeJsonValue =
    | null
    | boolean
    | Boolean
    | string
    | String
    | number
    | Number
    | ReadonlyArray<JsonValue>
    | { [key: string]: JsonValue }

/**
 * This type represents all values that produce useful and predictable results with `JSON.stringify()`.
 */
export type JsonValue = NativeJsonValue | JsonEncodable

export type AsyncHoler<I extends JsonValue, O> = (params: I, signal: AbortSignal) => Promise<O>

export function transformUnary<T extends (...args: any) => any>(
    f: T,
): (params: Parameters<T>) => ReturnType<T> {
    return (params: Parameters<T>): ReturnType<T> => {
        return f.apply(null, params)
    }
}

type State<O> = PendingValue<O> | AvailableValue<O> | ErrorValue

interface PendingValue<O> {
    type: "pending"
    promise: Promise<O>
    abortController: AbortController
}

interface AvailableValue<O> {
    type: "available"
    value: O
}

interface ErrorValue {
    type: "error"
    error: unknown
}

export type Result<T> = SuccessResult<T> | ErrorResult

export interface ErrorResult {
    type: "error"
    error: unknown
}

export interface SuccessResult<T> {
    type: "success"
    value: T
}

/**
 * Internal use only, not stable API
 */
class InternalDataHoler<I extends JsonValue, O> {
    private readonly values: { [key: string]: State<O> } = {}
    private readonly holer: AsyncHoler<I, O>

    /**
     * Constructs a new instance using an async operation.
     *
     * @param holer an asynchronous operation
     */
    constructor(holer: AsyncHoler<I, O>) {
        if (typeof holer !== "function") {
            throw new Error("holer must be a function")
        }
        this.holer = holer
    }

    key(input: I): string {
        return JSON.stringify(input)
    }

    private holIt(key: string, input: I): Promise<O> {
        const abortController = new AbortController()
        const promise = this.holer(input, abortController.signal).then(
            value => {
                this.values[key] = {
                    type: "available",
                    value,
                }
                return value
            },
            error => {
                this.values[key] = {
                    type: "error",
                    error,
                }
                throw error
            },
        )
        this.values[key] = {
            type: "pending",
            promise,
            abortController,
        }
        return promise
    }

    preHolWithKey(key: string, input: I): Promise<O> {
        const state = this.values[key]
        if (state === undefined) {
            return this.holIt(key, input)
        }
        switch (state.type) {
            case "available":
                return Promise.resolve(state.value)
            case "error":
                return Promise.reject<O>(state.error)
            case "pending":
                return state.promise
        }
    }

    holWithKey(key: string, input: I): O {
        const state = this.values[key]
        if (state === undefined) {
            throw this.holIt(key, input)
        }
        switch (state.type) {
            case "available":
                return state.value
            case "error":
                throw state.error
            case "pending":
                throw state.promise
        }
    }

    forgetWithKey(key: string, reason?: string): void {
        const state = this.values[key]
        if (state !== undefined) {
            delete this.values[key]
            if (state.type === "pending") {
                state.abortController.abort(reason)
            }
        }
    }

    forgetAll(reason?: string): void {
        for (const key in this.values) {
            this.forgetWithKey(key, reason)
        }
    }

    rethrowPromiseWithKey(key: string, throwable: unknown): void {
        const state = this.values[key]
        if (state.type === "pending" && state.promise === throwable) {
            throw throwable
        }
    }
}

/**
 * A data fetcher for use with React-style frameworks.
 */
export class DataHoler<I extends JsonValue, O> {
    /**
     * Unstable API, don't use!
     */
    readonly internal: InternalDataHoler<I, O>

    /**
     * Constructs a new instance using an async operation.
     *
     * @param holer an asynchronous operation
     */
    constructor(holer: AsyncHoler<I, O>) {
        this.internal = new InternalDataHoler(holer)
    }

    /**
     * Fetches data asynchronously.
     *
     * @param input the inputs into the fetching function
     * @return the value once it is available
     * @throws either a Promise while it is still pending or the value the Promise was rejected with
     */
    hol(input: I): O {
        const key = this.internal.key(input)
        return this.internal.holWithKey(key, input)
    }

    /**
     * Fetches data asynchronously. This variant does not throw errors, but instead returns
     * a `Result<O>`.
     *
     * @param input the inputs into the fetching function
     * @return the value once it is available
     * @throws either a Promise while it is still pending or the value the Promise was rejected with
     */
    holResult(input: I): Result<O> {
        const key = this.internal.key(input)
        try {
            return {
                type: "success",
                value: this.internal.holWithKey(key, input),
            }
        } catch (e) {
            this.internal.rethrowPromiseWithKey(key, e)
            return {
                type: "error",
                error: e,
            }
        }
    }

    /**
     * Pre-fetches data asynchronously and provides a promise for it.
     *
     * @param input the inputs into the fetching function
     * @return a Promise for the value
     */
    preHol(input: I): Promise<O> {
        const key = this.internal.key(input)
        return this.internal.preHolWithKey(key, input)
    }

    /**
     * Forgets cached data for a given key.
     *
     * @param input the inputs into the fetching function
     * @param reason the reason for the removal, this will be used as the abortion reason
     */
    forget(input: I, reason?: string): void {
        const key = this.internal.key(input)
        this.internal.forgetWithKey(key, reason)
    }

    /**
     * Forgets all cached data.
     *
     * @param reason the reason for the removal, this will be used as the abortion reason
     */
    forgetAll(reason?: string): void {
        this.internal.forgetAll(reason)
    }

    /**
     * This function allows rethrowing the promise matching the input to simplify error handling
     *
     * @param input the inputs into the fetching function
     * @param throwable the thrown value
     */
    rethrowPromise(input: I, throwable: unknown): void {
        const key = this.internal.key(input)
        this.internal.rethrowPromiseWithKey(key, throwable)
    }
}
