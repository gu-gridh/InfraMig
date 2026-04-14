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

    //set filter state to 'all' by default
    const country = ref('all')

    function setCountry(newCountry) {
        country.value = newCountry
    }
    
    function resetCountry() {
        country.value = 'all'
    }

    const branch = ref('all')
    function setBranch(newBranch) {
        branch.value = newBranch
    }

    function resetBranch() {
        branch.value = 'all'
    }

    const year = ref('all')
    function setYear(newYear) {
        year.value = newYear
    }

    function resetYear() {
        year.value = 'all'
    }


    return { company, setCompany, country, setCountry, resetCountry, branch, setBranch, resetBranch, year, setYear, resetYear }


})