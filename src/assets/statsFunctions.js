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

