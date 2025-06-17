import { DataHoler } from "./data_holer"

function testPromise<T>(): [Promise<T>, (value: T) => void, (error: any) => void] {
    let resolveF: ((value: T) => void) | undefined = undefined
    let rejectF: ((error: any) => void) | undefined = undefined
    const promise = new Promise<T>((resolve, reject) => {
        resolveF = resolve
        rejectF = reject
    })
    return [promise, v => resolveF!(v), e => rejectF!(e)]
}

test("promise is thrown and completes", () => {
    const [promise, resolve] = testPromise<string>()

    const holer = new DataHoler<string, string>(() => promise)

    let thrownPromise: Promise<string> | undefined = undefined
    try {
        holer.hol("a")
    } catch (e) {
        expect(e).toStrictEqual(promise)
        thrownPromise = e as Promise<string>
    }

    thrownPromise!.then(() => {
        expect(holer.hol("a")).toBe("test")
    })

    resolve("test")
})

test("promise can be rethrown", () => {
    const [promise] = testPromise<string>()

    const holer = new DataHoler<string, string>(() => promise)

    try {
        try {
            holer.hol("a")
        } catch (e) {
            holer.rethrowPromise("a", e)
            fail("the promise was not rethrown")
        }
    } catch (e) {
        expect(e).toStrictEqual(promise)
    }
})

test("other error is not rethrown", () => {
    const [promise, , reject] = testPromise<string>()

    const holer = new DataHoler<string, string>(() => promise)

    let error = new Error("some error")
    holer.preHol("a").then(undefined, () => {
        try {
            try {
                holer.hol("a")
            } catch (e) {
                holer.rethrowPromise("a", e)
                expect(e).toStrictEqual(error)
            }
        } catch (e) {
            fail("the error should not have been rethrown")
        }
    })

    reject(error)
})

test("testing forget", async () => {
    let [promise, resolve] = testPromise<string>()
    const holer = new DataHoler<string, string>(() => promise)
    const input = "cacheKey"

    let firstPromise: Promise<string> | undefined = undefined

    try {
        holer.hol(input)
    } catch (e) {
        expect(e).toStrictEqual(promise)
        firstPromise = e as Promise<string>
    }

    resolve("cached data")

    await firstPromise!

    expect(holer.hol(input)).toBe("cached data")

    holer.forget(input)

    let secondPromise: Promise<string> | undefined
    ;[promise, resolve] = testPromise<string>()
    try {
        holer.hol(input)
    } catch (e) {
        expect(e).toStrictEqual(promise)
        secondPromise = e as Promise<string>
    }
    resolve("new data")

    await secondPromise!

    expect(holer.hol(input)).toBe("new data")
})
