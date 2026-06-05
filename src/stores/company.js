import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

export const useStore = defineStore('company', () => {
  // state should be either 'ssab' or 'stegra', geojson file loaded here based on this
    const company = ref('stegra')
    const country = ref()
    const fullName = ref('')
    const branch = ref()
    const year = ref(null)
    const coordinates = ref([30, 3])
    const zoom = ref(3)
    const geojson = ref(null)
    const workers = ref(null)
    const loadingGeojson = ref(false)

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

    //get country data from geojson based on country code
    watch(country, (newCountry, oldCountry) => {
        if (newCountry && geojson.value) {
            //find ALL features in geojson with matching country code
            const features = geojson.value.features.filter(f => f.properties.country_code === newCountry)
            if (features.length > 0) {
                //add each feature.properties to workers ref
                workers.value = features.map(f => f.properties)
            }
        }
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
        workers
    }
})