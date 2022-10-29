import {
  HolFilter,
  HolMetadataKey,
  HolRequest,
  HolResponse,
} from './model.js'

export type Authorization = [string, string]

export type AuthProvider = (request: HolRequest) => Promise<Authorization | null>

export const AuthenticatedKey = new HolMetadataKey<boolean>("whether the request was authenticated")

export function auth(authProvider: AuthProvider): HolFilter {
  return async function AuthFilter(request, execute): Promise<HolResponse> {
    const authorization = await authProvider(request)
    let authenticatedRequest: HolRequest
    if (authorization) {
      const [type, value] = authorization
      authenticatedRequest = {
        ...request,
        init: {
          ...request.init,
          headers: {
            ...request.init?.headers,
            Authorization: `${type} ${value}`,
          }
        }
      }
      authenticatedRequest.metadata.put(AuthenticatedKey, true)
    } else {
      authenticatedRequest = request
      authenticatedRequest.metadata.put(AuthenticatedKey, false)
    }
    return await execute(authenticatedRequest)
  }
}