<template>
  <div class="filters">
    <h3>Filters</h3>

    <v-form>
      <div class="filter-group">
        <v-select
          v-model="selectedCountry"
          :items="countries"
          label="Select country"
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
    </v-form>
    <div class="expand">
        <v-icon v-if="!expanded" size="32" color="#888" @click="toggleExpand">mdi-chevron-double-down</v-icon>
        <v-icon v-else size="32" color="#888" @click="toggleExpand">mdi-chevron-double-up</v-icon>
        <v-icon size="32" color="#888">mdi-chart-bar</v-icon>
        <div class="statistics" v-if="expanded">
          <p>Additional statistics and charts would go here.</p>   
          <Statistics/> 
        </div>
    </div> 
  </div>
</template>

<script setup>
import { ref } from 'vue'
import Statistics from './Statistics.vue'

const countries = ref(['USA', 'Canada', 'Mexico'])
const years = ref([2023, 2024, 2025, 2026])

const selectedCountry = ref(null)
const selectedYear = ref(null)
const expanded = ref(false)

const toggleExpand = () => {
  expanded.value = !expanded.value
}

</script>

<style>
.filters {
  background: rgba(255, 255, 255, 0.8);
  padding: 10px;
  border-radius: 5px;
  box-shadow: 0 0 15px rgba(0,0,0,0.2);
  min-width: 400px;
  border: 2px solid #14B8A6;
}

.filter-group {
  margin-bottom: 10px;
  width: 80%;
}

.v-field--center-affix .v-label.v-field-label {
  padding-left: 5px !important;
}

</style>