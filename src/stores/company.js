import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

export const useStore = defineStore('company', () => {
  // state should be either 'ssab' or 'stegra', geojson file loaded here based on this
    const company = ref('stegra')
    const country = ref()
    const fullName = ref('')
    const branchFullName = ref('')
    const branch = ref()
    const year = ref(null)
    const coordinates = ref([30, 3])
    const zoom = ref(3)
    const geojson = ref(null)
    const workers = ref(null)
    const loadingGeojson = ref(false)

    const cleanCode = (code) => {
        return String(code || '').trim().toUpperCase()
    }

    const getCountryCode = (props = {}) => {
        return cleanCode(
            props.country_code ||
            props.ADM0_A3 ||
            props.country_a3 ||
            props.ISO_A3 ||
            props.iso_a3
        )
    }

    const getFilteredFeatures = (sourceGeojson = geojson.value) => {
        if (!sourceGeojson?.features) return []

        const filtered = sourceGeojson.features.filter(feature => {
            const props = feature.properties || {}

            const matchesCountry =
            !country.value ||
            getCountryCode(props) === cleanCode(country.value)

            const matchesBranch =
            !branch.value ||
            String(props.sni_code || '').toUpperCase() ===
            String(branch.value).toUpperCase()

            let matchesYear = true

            if (year.value) {
            if (!props.startdate) {
                matchesYear = false
            } else {
                const start = new Date(props.startdate)
                const end = props.enddate
                ? new Date(props.enddate)
                : new Date()

                const yearStart = new Date(year.value, 0, 1)
                const yearEnd = new Date(year.value, 11, 31, 23, 59, 59)

                matchesYear =
                start <= yearEnd &&
                end >= yearStart
            }
            }

            return matchesCountry && matchesBranch && matchesYear
        })

        // Count workers per country after filters
        const countryCounts = new Map()

        for (const feature of filtered) {
            const code = getCountryCode(feature.properties || {})

            if (!code) continue

            countryCounts.set(
            code,
            (countryCounts.get(code) || 0) + 1
            )
        }

        // Keep only countries with 10+ workers
        return filtered.filter(feature => {
            const code = getCountryCode(feature.properties || {})
            return (countryCounts.get(code) || 0) >= 10
        })
        }

    const getFilteredWorkers = () => {
        const features = getFilteredFeatures()

        return features.map(feature => feature.properties)
    }


    const setCompany = (newCompany) => {
        company.value = newCompany
    }

    const loadGeojson = async (selectedCompany = company.value) => {
        if (!selectedCompany) return

        let url = ''

        if (selectedCompany === 'stegra') {
            url = '/geojson/stegra/stegraOver10.geojson'
        } else if (selectedCompany === 'ssab') {
            url = '/geojson/ssab/ssabOver10.geojson'
        } else {
            console.warn('Unknown company:', selectedCompany)
            return
        }
        loadingGeojson.value = true
        try {
            const res = await fetch(url)

            if (!res.ok) {
            throw new Error(`Failed to load ${url}`)
            }
            geojson.value = await res.json()
        } catch (error) {
            console.error('Error loading GeoJSON:', error)
            geojson.value = null
        } finally {
            loadingGeojson.value = false
        }
    }

    const resetBranch = () => {
        branch.value = null
        branchFullName.value = ''
    }

    const resetYear = () => {
        year.value = null
    }

    //get country data from geojson based on country code
    watch([country, geojson], ([newCountry, newGeojson]) => {
        if (!newCountry || !newGeojson) {
            workers.value = null
            return
        }

        const features = newGeojson.features.filter(
            f => cleanCode(f.properties.country_code) === cleanCode(newCountry)
        )

        workers.value = features.length
            ? features.map(f => f.properties)
            : null
    })

    watch(company, async (newCompany) => {
        resetBranch()
        resetYear()
        country.value = null
        workers.value = null
        await loadGeojson(newCompany)
        }, 
        { 
            immediate: true 
    })


    return { 
        company,
        country, 
        branch, 
        year, 
        geojson, 
        loadingGeojson, 
        loadGeojson, 
        coordinates,
        zoom,
        fullName,
        workers,
        setCompany,
        resetBranch,
        branchFullName,
        resetYear,
        getFilteredWorkers,
        getFilteredFeatures,
        
    }
})