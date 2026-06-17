<template>
  <div class="filters">
    <!-- <h3>Filters</h3> -->

    <v-form>
      <div class="filter-group">
        <v-autocomplete
          v-model="selectedCountry"
          v-model:search="countrySearch"
          :items="countries"
          item-title="countries_eng"
          item-value="country_code"
          label="Select country"
          clearable
          variant="outlined"
          density="compact"
          color="primary"
        />
      </div>
      <div v-if="!store.country">
      <div class="filter-group">
        <v-select
          v-model="selectedBranch"
          :items="branches"
          item-title="name"
          item-value="code"
          label="Select branch"
          clearable
          variant="outlined"
          density="compact"
          color="primary"
        />
      </div>

      <div class="filter-group">
        <v-select
          v-model="selectedYear"
          :items="years"
          label="Select year"
          clearable
          variant="outlined"
          density="compact"
        />
      </div>
      </div>
    </v-form>

    <div class="expand">
      <div class="expand-header">
        <v-icon size="28" color="primary" class="left">mdi-chart-bar</v-icon>

        <v-icon
          v-if="!expanded"
          size="32"
          color="primary"
          @click="toggleExpand"
          class="right"
        >
          mdi-chevron-double-down
        </v-icon>

        <v-icon
          v-else
          size="32"
          color="primary"
          @click="toggleExpand"
          class="right"
        >
          mdi-chevron-double-up
        </v-icon>
      </div>

      <div class="statistics" v-if="expanded">
        <StatisticsTabs />
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch, nextTick, computed } from 'vue'
import StatisticsTabs from '@/views/StatisticsTabs.vue'
import { useStore } from '@/stores/company'
import { branchFullNames } from '@/assets/statsFunctions.js'

const countries = ref([''])
const branches = ref([''])
const years = ref([2023, 2024, 2025, 2026])

const selectedCountry = ref(null)
const selectedYear = ref(null)
const selectedBranch = ref(null)
const expanded = ref(false)
const countrySearch = ref('')

const filtersEl = ref(null)

const store = useStore()
const companyState = computed(() => store.company)

const toggleExpand = () => {
  expanded.value = !expanded.value
}

const fetchCountries = async () => {
  const countriesJson =
    companyState.value === 'ssab'
      ? '/json/countries_ssab.json'
      : '/json/countries_stegra.json'

  const res = await fetch(countriesJson)
  const data = await res.json()

  countries.value = data
    .map((d) => ({
      country_code: d.country_code,
      countries_eng: d.countries_eng
    }))
    .sort((a, b) =>
      a.countries_eng.localeCompare(b.countries_eng, undefined, {
        sensitivity: 'base'
      })
    )
}

onMounted(async () => {
  await nextTick()
  //scrollable filters panel, disable map interactions when hovering over it
  if (filtersEl.value) {
    L.DomEvent.disableScrollPropagation(filtersEl.value)
    L.DomEvent.disableClickPropagation(filtersEl.value)
  }
  //fetch json from public folder depending on company state
  fetchCountries()
    // fetch branches from json
    fetch('/json/branches.json')
      .then((res) => res.json())
      .then((data) => {
        branches.value = data.map((d) => (  {
          code: d.sni_letter,
          name: d.english_label
        }))
        .sort((a, b) =>
          a.name.localeCompare(b.name, undefined, {
            sensitivity: 'base'
          })
        )
      })
})

watch(selectedCountry, (country) => {
  store.country = country ?? null
  store.fullName = countries.value.find(c => c.country_code === country)?.countries_eng || ''
})

watch(selectedYear, (year) => {
  if (year == null) {
    store.resetYear()
  } else {
    store.year = year
  }
})

watch(selectedBranch, (branch) => {
  if (branch == null) {
    store.resetBranch()
  } else {
    store.branch = branch
    store.branchFullName = branchFullNames(branch)
  }
})

watch(companyState, async () => {
  selectedCountry.value = null
  store.country = null
  store.fullName = ''
  await fetchCountries()
})

</script>

<style>
.filters {
  background: rgba(255, 255, 255, 0.9);
  padding: 10px;
  border-radius: 5px;
  box-shadow: 0 0 15px rgba(0,0,0,0.2);
  width: 400px;
  max-width: 100%;
  border: 2px solid #14B8A6;
  max-height: 90vh;
  overflow-y: auto;
}

.filter-group {
  margin-bottom: 10px;
  width: 100%;
}

.filter-group .v-input {
  width: 100%;
}

.v-overlay__content {
  max-width: 400px;
}

.v-field--center-affix .v-label.v-field-label {
  padding-left: 5px !important;
}

.v-list-item-title {
  white-space: normal !important;
  word-break: break-word;
  font-size: 14px;
}

.v-list-item {
  white-space: normal !important;
}

.v-overlay__content {
  max-width: 300px !important;
}

.expand {
  margin-top: 8px;
}

.expand-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.right {
  cursor: pointer;
}

.statistics {
  margin-top: 10px;
}

.v-select .v-field__input {
  white-space: nowrap !important;
  overflow: hidden;
  text-overflow: ellipsis;
}

.v-field {
  margin-bottom: 0 !important;
}

.v-field__field {
  padding-top: 2px;
  padding-bottom: 2px;
}

</style>