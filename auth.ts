import { HolFilter, HolMetadataKey, HolRequest, HolResponse } from "./model"

export type Authorization = [string, string]

export type AuthProvider = (request: HolRequest) => Promise<Authorization | null>

export const AuthenticatedKey = new HolMetadataKey<boolean>("whether the request was authenticated")

export function auth(authProvider: AuthProvider): HolFilter {
    return async function AuthFilter(request, execute): Promise<HolResponse> {
        const authorization = await authProvider(request)
        if (authorization) {
            const [type, value] = authorization
            request.headers.append("Authorization", `${type} ${value}`)
        }
        request.metadata.put(AuthenticatedKey, !!authorization)
        return await execute(request)
    }
}
