# hol

The library is named after the german word for `fetch` as it internally uses `fetch` and exposes its data
structures as part of its interface.

At its core it wraps the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) with a filter pipeline
that has full control over how, when and if the actual request executes.
