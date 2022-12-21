import {
  HolFilter,
  HolRequest,
  HolResponse,
} from './model'
import { noop } from './noop'

export function composeFilters(filters: ReadonlyArray<HolFilter>): HolFilter {
  if (filters.length == 0) {
    return noop
  }
  if (filters.length == 1) {
    return filters[0]
  }

  function compose(currentFilter: HolFilter, i: number): HolFilter {
    if (i < 0) {
      return currentFilter
    }

    const filter = filters[i]
    const newFilter: HolFilter = function ComposedFilter(request, execute) {
      return filter(request, (filteredRequest) => currentFilter(filteredRequest, execute))
    }

    return compose(newFilter, i - 1)
  }

  return compose(filters[filters.length - 1], filters.length - 2)
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

class FilterChain extends AbstractFilterChain<HolFilter> {
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

class RequestFilterChain extends AbstractFilterChain<HolRequestFilter> {
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

class ResponseFilterChain extends AbstractFilterChain<HolResponseFilter> {
  constructor() {
    super(composeResponseFilters)
  }
}