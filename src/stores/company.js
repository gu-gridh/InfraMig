import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useStore = defineStore('company', () => {
  // state should be either 'ssab' or 'stegra'
    const company = ref('ssab')
    const isSsab = computed(() => company.value === 'ssab')
    const isStegra = computed(() => company.value === 'stegra')

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

    return { company, isSsab, isStegra, setCompany, country, isAll, setCountry }


})