<template>
  <div class="statistics">
    <h3>Average stay by country <span v-if="store.year">({{ store.year }})</span><span v-else>2023-2025</span><span v-if="store.branch" class="brackets"> ({{ store.branchFullName }})</span><span v-else class="brackets"> (all industries)</span></h3>
    <div ref="chartEl" class="chart"></div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import { useStore } from '@/stores/company'
import { getCountryDurationAverages } from '@/assets/statsFunctions.js'

const store = useStore()
const chartEl = ref(null)
let chart = null

const props = defineProps({
  active: Boolean
})

function resizeChart() {
  chart?.resize()
}

function forceResizeChart() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      renderChart()
      resizeChart()
    })
  })
}

watch(
  () => props.active,
  active => {
    if (active) {
      forceResizeChart()
    }
  }
)

const avgField = computed(() => {
  return store.year ? `avg${store.year}` : 'duration_avg'
})

const chartData = computed(() => {
  if (!filteredGeojson.value) return []

  const data = getCountryDurationAverages(
    filteredGeojson.value,
    avgField.value
  )

  // Count currently filtered workers per country
  const countryCounts = new Map()

  for (const feature of filteredGeojson.value.features) {
    const props = feature.properties || {}

    const countryCode =
      props.ADM0_A3 ||
      props.country_a3 ||
      props.country_code ||
      props.ISO_A3 ||
      null

    const country =
      props.country_en ||
      props.country ||
      props.name_en ||
      props.ADMIN ||
      props.name ||
      'Unknown'

    const key = countryCode
      ? String(countryCode).trim().toUpperCase()
      : country.toLowerCase()

    countryCounts.set(
      key,
      (countryCounts.get(key) || 0) + 1
    )
  }

  // Only show countries with at least 10 workers
  const filteredData = data.filter(row => {
    const key = row.countryCode
      ? String(row.countryCode).trim().toUpperCase()
      : row.country.toLowerCase()

    return (countryCounts.get(key) || 0) >= 10
  })

  // Cap yearly averages at 365 days
  if (!store.year) return filteredData

  return filteredData.map(row => ({
    ...row,
    avgDuration: Math.min(row.avgDuration, 365)
  }))
})

const filteredGeojson = computed(() => {
  if (!store.geojson) return null

  const periodStart = new Date(2023, 0, 1)
  const periodEnd = new Date(2025, 11, 31, 23, 59, 59)

  return {
    ...store.geojson,
    features: store.geojson.features.filter(feature => {
      const worker = feature.properties || {}

      const matchesBranch =
        !store.branch ||
        String(worker.sni_code || '').toUpperCase() ===
        String(store.branch).toUpperCase()

      if (!worker.startdate) return false

      const start = new Date(worker.startdate)
      const end = worker.enddate
        ? new Date(worker.enddate)
        : new Date()

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return false
      }

      // When a specific year is selected:
      // only workers active during that year
      if (store.year) {
        const yearStart = new Date(store.year, 0, 1)
        const yearEnd = new Date(store.year, 11, 31, 23, 59, 59)

        return (
          matchesBranch &&
          start <= yearEnd &&
          end >= yearStart
        )
      }

      // No year selected:
      // only workers who were active at some point during 2023–2025
      const overlaps2023to2025 =
        start <= periodEnd &&
        end >= periodStart

      return matchesBranch && overlaps2023to2025
    })
  }
})

const option = computed(() => ({
  //title: { text: 'Average stay by country' },
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    formatter: params => {
      const row = chartData.value[params?.[0]?.dataIndex]
      if (!row) return ''
      return `
        <strong>${row.country}</strong><br>
        Average stay: ${Math.round(row.avgDuration)} days<br>
        Workers: ${row.workers}
      `
    }
  },
  grid: { left: 0, right: 20, top: 50, bottom: 40 },
  xAxis: { type: 'value', name: 'Days' },
  yAxis: {
    type: 'category',
    inverse: true,
    data: chartData.value.map(d => d.country)
  },
  series: [
    {
      type: 'bar',
      data: chartData.value.map(d => d.avgDuration),
      barMaxWidth: 30,
      itemStyle: {
      color: '#14B8A6'
    },
      label: {
        show: true,
        position: 'right',
        formatter: value => Math.round(value.value)
      },
      
    },
  ]
}))

function renderChart() {
  if (!chart) return
  chart.setOption(option.value, true)
}

onMounted(async () => {
  await nextTick()
  chart = echarts.init(chartEl.value)
  renderChart()
  forceResizeChart()
  window.addEventListener('resize', resizeChart)
})

watch(
  () => [store.geojson, store.year, store.branch, store.country],
  () => {
    renderChart()
    if (props.active) {
      forceResizeChart()
    }
  },
  { deep: true }
)

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeChart)
  chart?.dispose()
  chart = null
})


</script>

<style scoped>
.chart {
  width: 100%;
  height: 600px;
}

.brackets {
  font-size: 14px;
  color: #666;
}
</style>