import {
  Hol,
  HolFilter,
  HolRequest,
  HolResponse,
} from './model.js'
import { noop } from './noop.js'

export function composeFilters(filters: ReadonlyArray<HolFilter>): HolFilter {
  if (filters.length == 0) {
    return noop
  }
  if (filters.length == 1) {
    return filters[0]
  }

  const filtersCopy = [...filters]

  function applyFilter(request: HolRequest, execute: Hol, i: number): Promise<HolResponse> {
    if (i >= filtersCopy.length) {
      return execute(request)
    }
    return filtersCopy[i](request, (filteredRequest) => {
      return applyFilter(filteredRequest, execute, i + 1)
    })
  }

  return function ComposedFilters(request, execute) {
    return applyFilter(request, execute, 0)
  }
}

export class AbstractFilterChain<T> {
  private readonly filters: Array<T> = []
  private composedFilter: HolFilter = noop
  private readonly compose: (filters: Array<T>) => HolFilter
  readonly filter: HolFilter = (request, execute) => this.composedFilter(request, execute)

  constructor(compose: (filters: Array<T>) => HolFilter) {
    this.compose = compose
  }

  private updateFilter() {
    this.composedFilter = this.compose(this.filters)
  }

  prependFilter(filter: T): AbstractFilterChain<T> {
    this.filters.unshift(filter)
    this.updateFilter()
    return this
  }

  appendFilter(filter: T): AbstractFilterChain<T> {
    this.filters.push(filter)
    this.updateFilter()
    return this
  }

  removeFilter(filter: T): AbstractFilterChain<T> {
    const index = this.filters.indexOf(filter)
    if (index !== -1) {
      this.filters.splice(index, 1)
      this.updateFilter()
    }
    return this
  }
}

export class FilterChain extends AbstractFilterChain<HolFilter> {
  constructor() {
    super(composeFilters)
  }
}

type HolRequestFilter = (request: HolRequest) => Promise<HolRequest>

function composeRequestFilters(filters: Array<HolRequestFilter>): HolFilter {
  if (filters.length == 0) {
    return noop
  } else {
    const copiedFilters = [...filters]
    return async function RequestFilters(request, execute) {
      for (const f of copiedFilters) {
        request = await f(request)
      }
      return execute(request)
    }
  }
}

export class RequestFilterChain extends AbstractFilterChain<HolRequestFilter> {
  constructor() {
    super(composeRequestFilters)
  }
}

type HolResponseFilter = (response: HolResponse) => Promise<HolResponse>

function composeResponseFilters(filters: Array<HolResponseFilter>): HolFilter {
  if (filters.length == 0) {
    return noop
  } else {
    const copiedFilters = [...filters]
    return async function RequestFilters(request, execute) {
      let response = await execute(request)
      for (const f of copiedFilters) {
        response = await f(response)
      }
      return response
    }
  }
}

export class ResponseFilterChain extends AbstractFilterChain<HolResponseFilter> {
  constructor() {
    super(composeResponseFilters)
  }
}