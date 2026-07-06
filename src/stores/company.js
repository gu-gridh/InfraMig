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


    const setCompany = (newCompany) => {
        company.value = newCompany
    }

    const loadGeojson = async (selectedCompany = company.value) => {
        if (!selectedCompany) return

        let url = ''

        if (selectedCompany === 'stegra') {
            url = '/geojson/stegra/stegra.geojson'
        } else if (selectedCompany === 'ssab') {
            url = '/geojson/ssab/ssab.geojson'
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
        resetYear
    }
})