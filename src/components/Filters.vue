<template>
    <div class="filters">
        <h3>Filters</h3>
        <div class="filter-group">
            <label for="country">Country:</label>
            <select id="country" v-model="selectedCountry">
                <option value="">All</option>
                <option v-for="country in countries" :key="country" :value="country">{{ country }}</option>
            </select>
        </div>
        <div class="filter-group">
            <label for="year">Year:</label>
            <select id="year" v-model="selectedYear">
                <option value="">All</option>
                <option v-for="year in years" :key="year" :value="year">{{ year }}</option>
            </select>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'

const countries = ref(['USA', 'Canada', 'Mexico'])
const years = ref([2020, 2021, 2022])

const selectedCountry = ref('')
const selectedYear = ref('')
</script>

<style scoped>
.filters {
  background: rgba(255, 255, 255, 0.8);
  padding: 10px;
  border-radius: 5px;
  box-shadow: 0 0 15px rgba(0,0,0,0.2);
  min-width: 400px;
}

.filter-group {
  margin-bottom: 10px;
}
</style>