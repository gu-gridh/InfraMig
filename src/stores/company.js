import { ref } from 'vue'
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

    const setCompany = async (newCompany) => {
        company.value = newCompany
        await loadGeojson(newCompany)
    }
    

    function setCountry(newCountry) {
        country.value = newCountry
    }
    
    function resetCountry() {
        country.value = null
    }

    
    function setBranch(newBranch) {
        branch.value = newBranch
    }

    function resetBranch() {
        branch.value = null
    }

    
    function setYear(newYear) {
        year.value = newYear
    }

    function resetYear() {
        year.value = null
    }

    return { 
        company,
        setCompany,
        country, 
        setCountry, 
        resetCountry, 
        branch, 
        setBranch, 
        resetBranch, 
        year, 
        setYear, 
        resetYear, 
        geojson, 
        loadingGeojson, 
        loadGeojson, 
        coordinates,
        zoom,
        fullName
    }
})