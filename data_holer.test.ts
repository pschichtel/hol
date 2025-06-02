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

test("bla", () => {
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
