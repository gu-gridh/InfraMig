import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useStore = defineStore('company', () => {
  // state should be either 'ssab' or 'stegra'
    const company = ref('ssab')

    function setCompany(newCompany) {
        if (newCompany === 'ssab' || newCompany === 'stegra') {
            company.value = newCompany
        } 
    }

    //set filter state to null by default
    const country = ref()

    function setCountry(newCountry) {
        country.value = newCountry
    }
    
    function resetCountry() {
        country.value = null
    }

    const branch = ref()
    function setBranch(newBranch) {
        branch.value = newBranch
    }

    function resetBranch() {
        branch.value = null
    }

    const year = ref(null)
    function setYear(newYear) {
        year.value = newYear
    }

    function resetYear() {
        year.value = null
    }


    return { company, setCompany, country, setCountry, resetCountry, branch, setBranch, resetBranch, year, setYear, resetYear }


})