import { perf, PerfRequestDurationKey } from "../perf"
import { consoleLogger } from "../logging"
import { TimeoutKey } from "../timeout"
import { auth } from "../auth"
import { client } from "../client/global"

client.setFilters([consoleLogger, perf, auth(() => Promise.resolve(["Basic", "123"]))])

document.addEventListener("DOMContentLoaded", () => {
    client.get("https://api.github.com", [["a", "b with spaces"]]).then(
        response => {
            console.log(response.response.statusText)
            console.log("request duration", response.metadata.get(PerfRequestDurationKey))
        },
        error => {
            console.log("request duration", error.metadata.get(PerfRequestDurationKey))
            console.log("timed out after", error.metadata.get(TimeoutKey))
        },
    )
})
