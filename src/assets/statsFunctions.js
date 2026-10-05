export const calcSNI = (workers) => {
    if (!workers || workers.length === 0) return null

    const totalWorkers = workers.length
    console.log('Total workers:', totalWorkers)
    //all workers belong to either C, F, H, N, O branches, count how many belong to each
    const branchCounts = {
        C: 0,
        F: 0,
        H: 0,
        N: 0,
        O: 0
    }

    workers.forEach(worker => {
        const branch = worker.sni_code ? worker.sni_code.charAt(0) : null
        if (branchCounts.hasOwnProperty(branch)) {
            branchCounts[branch]++
        }
    })
    //count percentage of workers in each branch
    for (const branch in branchCounts) {
        const count = branchCounts[branch]
        const percentage = ((count / totalWorkers) * 100).toFixed(0)
        branchCounts[branch] = { count, percentage }
    }
    console.log('Branch counts:', branchCounts)
    //sort branches by percentage descending
    const sortedBranchCounts = Object.entries(branchCounts)
        .sort((a, b) => b[1].percentage - a[1].percentage)
        .reduce((acc, [branch, data]) => {
            acc[branch] = data
            return acc
        }, {})
    return sortedBranchCounts
}

// Calculate average migration duration for each country.
// When avgField is duration_avg, use the existing overall average.
// When avgField is a year (e.g. avg2006), calculate the average
// number of days each worker was present during that year.

export function getCountryDurationAverages(geojson, avgField = 'duration_avg') {
  const features = geojson?.features ?? []
  const countries = new Map()

  const isYearField = /^avg\d{4}$/.test(avgField)
  const year = isYearField
    ? Number(avgField.replace('avg', ''))
    : null

  function getDaysInYear(props, year) {
    const start = new Date(props.startdate)
    const end = props.enddate
      ? new Date(props.enddate)
      : new Date(year, 11, 31, 23, 59, 59)

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return 0
    }

    const yearStart = new Date(year, 0, 1)
    const yearEnd = new Date(year, 11, 31, 23, 59, 59)

    // Worker was not present during this year
    if (start > yearEnd || end < yearStart) {
      return 0
    }

    const effectiveStart = start > yearStart
      ? start
      : yearStart

    const effectiveEnd = end < yearEnd
      ? end
      : yearEnd

    const millisecondsPerDay = 1000 * 60 * 60 * 24

    return (effectiveEnd - effectiveStart) / millisecondsPerDay
  }

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
      props.ADM0_A3 ||
      props.country_a3 ||
      props.country_code ||
      props.ISO_A3 ||
      null

    const key = countryCode || country.toLowerCase()

    if (!countries.has(key)) {
      countries.set(key, {
        country,
        countryCode,
        totalDays: 0,
        workers: 0,
        overallAverage: null
      })
    }

    const data = countries.get(key)

    data.workers += 1

    if (year) {
      data.totalDays += getDaysInYear(props, year)
    } else {
      const value = Number(props[avgField])

      if (Number.isFinite(value)) {
        data.overallAverage = value
      }
    }
  }

  return [...countries.values()]
    .map(data => ({
      country: data.country,
      countryCode: data.countryCode,

      avgDuration: year
        ? Math.min(data.totalDays / data.workers, 365)
        : data.overallAverage,

      workers: data.workers
    }))
    .filter(row => Number.isFinite(row.avgDuration))
    .sort((a, b) => b.avgDuration - a.avgDuration)
}

export const branchFullNames = (letter) => {
    const mapping = {
        C: 'Manufacturing',
        F: 'Construction',
        H: 'Transportation/Storage',
        N: 'Professional, Scientific & Technical',
        O: 'Administrative & Support Service '
    }
    return mapping[letter]
} 

