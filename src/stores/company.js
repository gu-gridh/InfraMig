import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useStore = defineStore('company', () => {
  // state should be either 'ssab' or 'stegra', geojson file loaded here based on this
    const company = ref('ssab')
    const country = ref()
    const branch = ref()
    const year = ref(null)
    const geojson = ref(null)
    const loadingGeojson = ref(false)

    const loadGeojson = async (company) => {
        if (!company) return
        let url = ''
        if (company === 'stegra') {
        url = '/geojson/stegra/stegra.geojson'
      } else if (company === 'ssab') {
        url = '/geojson/ssab/ssab.geojson'
      } else {
        console.warn('Unknown company:', company)
        return
      }

        loadingGeojson.value = true
        try {
            const res = await fetch(url)
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

    return { company, setCompany, country, setCountry, resetCountry, branch, setBranch, resetBranch, year, setYear, resetYear, geojson, loadingGeojson, loadGeojson, setCompany }
})