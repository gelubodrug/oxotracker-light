let topWorkers: string[] = []

export function setTopWorkers(workers: string[]) {
  topWorkers = workers
  localStorage.setItem("topWorkers", JSON.stringify(workers))
}

export function getTopWorkers(): string[] {
  if (topWorkers.length === 0 && typeof window !== "undefined") {
    const storedWorkers = localStorage.getItem("topWorkers")
    if (storedWorkers) {
      topWorkers = JSON.parse(storedWorkers)
    }
  }
  return topWorkers
}
