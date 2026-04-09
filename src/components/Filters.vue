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
          v-model="selectedBranch"
          :items="branches"
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
    </v-form>

    <div class="expand">
      <div class="expand-header">
        <v-icon size="28" color="#888" class="left">mdi-chart-bar</v-icon>

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
import { ref } from 'vue'
import StatisticsTabs from '@/views/StatisticsTabs.vue'

const countries = ref(['USA', 'Canada', 'Mexico'])
const branches = ref(['Branch 1', 'Branch 2', 'Branch 3'])
const years = ref([2023, 2024, 2025, 2026])

const selectedCountry = ref(null)
const selectedYear = ref(null)
const selectedBranch = ref(null)
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

</style>