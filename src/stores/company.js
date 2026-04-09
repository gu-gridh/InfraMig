import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useStore = defineStore('company', () => {
  // state should be either 'ssab' or 'stegra'
    const company = ref('ssab')

    function setCompany(newCompany) {
        if (newCompany === 'ssab' || newCompany === 'stegra') {
            company.value = newCompany
        } else {
            console.warn('Invalid company. Use "ssab" or "stegra".')
        }
    }

    //set country state or default 'all'
    const country = ref('all')
    const isAll = computed(() => country.value === 'all')

    function setCountry(newCountry) {
        country.value = newCountry
    }

    return { company, setCompany, country, isAll, setCountry }


})