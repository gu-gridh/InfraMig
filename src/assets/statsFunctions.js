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

// calc average duration of migration for each country in the geojson, return sorted by duration descending

export function getCountryDurationAverages(geojson) {
  const features = geojson?.features ?? []

  const seen = new Set()

  return features
    .map(feature => {
      const props = feature.properties ?? {}

      return {
        country: props.country_en || props.country || props.name_en || props.ADMIN || props.name || 'Unknown',
        countryCode: props.ADM0_A3 || props.country_a3 || props.country_code || props.ISO_A3 || null,
        avgDuration: Number(props.duration_avg),
        workers: Number(props.country_count) || 1
      }
    })
    .filter(row => Number.isFinite(row.avgDuration))
    .filter(row => {
      const key = row.countryCode || row.country.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
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

