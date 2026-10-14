export const calcSNI = (workers) => {
  if (!workers || workers.length === 0) return null

  const branchWorkers = {
    C: new Set(),
    F: new Set(),
    H: new Set(),
    N: new Set(),
    O: new Set(),
    OTHER: new Set()
  }

  workers.forEach(worker => {
    const workerId = worker.worker_id

    if (!workerId) return

    const branch = worker.sni_code

    if (branch && branchWorkers[branch]) {
      branchWorkers[branch].add(workerId)
    } else {
      branchWorkers.OTHER.add(workerId)
    }
  })

  const branchCounts = {}

  for (const branch in branchWorkers) {
    branchCounts[branch] = branchWorkers[branch].size
  }

  // Unique workers across ALL branches
  const uniqueWorkers = new Set(
    workers
      .map(worker => worker.worker_id)
      .filter(Boolean)
  )

  const totalWorkers = uniqueWorkers.size

  console.log('Unique workers:', totalWorkers)

  const result = {}

  for (const branch in branchCounts) {
    result[branch] = {
      count: branchCounts[branch],
      percentage: totalWorkers
        ? ((branchCounts[branch] / totalWorkers) * 100).toFixed(1)
        : 0
    }
  }

  return result
}

export function getCountryDurationAverages(
  geojson,
  avgField = 'duration_avg'
) {
  const features = geojson?.features ?? []
  const countries = new Map()

  for (const feature of features) {
    const props = feature.properties ?? {}

    const country =
      props.country_en ||
      props.country ||
      props.name_en ||
      props.ADMIN ||
      props.name ||
      'Unknown'

    const countryCode =
      props.country_code ||
      props.ADM0_A3 ||
      props.country_a3 ||
      props.ISO_A3 ||
      null

    const key =
      countryCode ||
      country.toLowerCase()

    if (countries.has(key)) continue

    const avgDuration = Number(props[avgField])

    countries.set(key, {
      country,
      countryCode,

      avgDuration:
        Number.isFinite(avgDuration)
          ? avgDuration
          : null,

      countryCount:
        Number(props.country_count) || 0
    })
  }

  return [...countries.values()]
    .filter(row => row.avgDuration != null)
    .sort((a, b) => b.avgDuration - a.avgDuration)
}

export const branchFullNames = (letter) => {
    const mapping = {
        C: 'Manufacturing',
        F: 'Construction',
        H: 'Transportation/Storage',
        N: 'Professional, Scientific & Technical',
        O: 'Administrative & Support Service ',
        OTHER: 'Other / Unknown'
    }
    return mapping[letter]
} 

//some workers come back
export function getUniqueWorkers(features = []) {
  const workers = new Map()

  for (const feature of features) {
    const props = feature.properties || {}
    const workerId = String(props.worker_id ?? '').trim()

    if (!workerId) continue

    if (!workers.has(workerId)) {
      workers.set(workerId, feature)
    }
  }

  return [...workers.values()]
}

export function calculateCountryContractDurations(features = []) {
  const DAY = 1000 * 60 * 60 * 24

  const countries = new Map()

  function parseDate(value) {
    if (!value) return null

    const date = new Date(value)

    return Number.isNaN(date.getTime()) ? null : date
  }

  function mergeIntervals(intervals) {
    if (!intervals.length) return []

    const sorted = [...intervals].sort((a, b) => a[0] - b[0])
    const merged = [[...sorted[0]]]

    for (const [start, end] of sorted.slice(1)) {
      const last = merged[merged.length - 1]

      const nextDay = new Date(last[1])
      nextDay.setDate(nextDay.getDate() + 1)

      if (start <= nextDay) {
        last[1] = new Date(Math.max(last[1], end))
      } else {
        merged.push([start, end])
      }
    }

    return merged
  }

  // Group contract periods by country and worker_id
  for (const feature of features) {
    const props = feature.properties || {}

    const workerId = String(props.worker_id ?? '').trim()
    const countryCode = String(props.country_code ?? '').trim().toUpperCase()

    const start = parseDate(props.startdate)
    const end = parseDate(props.enddate)

    if (!workerId || !countryCode || !start || !end || start > end) {
      continue
    }

    if (!countries.has(countryCode)) {
      countries.set(countryCode, {
        country: props.country_en || countryCode,
        workers: new Map()
      })
    }

    const country = countries.get(countryCode)

    if (!country.workers.has(workerId)) {
      country.workers.set(workerId, [])
    }

    country.workers.get(workerId).push([start, end])
  }

  const results = new Map()

  for (const [countryCode, country] of countries) {
    const durations = []

    for (const intervals of country.workers.values()) {
      const merged = mergeIntervals(intervals)

      const days = merged.reduce(
        (sum, [start, end]) =>
          sum + Math.round((end - start) / DAY) + 1,
        0
      )

      if (days > 0) durations.push(days)
    }

    if (!durations.length) continue

    const average =
      durations.reduce((sum, days) => sum + days, 0) /
      durations.length

    results.set(countryCode, {
      country: country.country,
      countryCode,
      workers: durations.length,
      avgDuration: average
    })
  }

  return results
}

