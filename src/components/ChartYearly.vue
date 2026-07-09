<template>
  <div class="statistics">
    <h3>Total workers per year <span v-if="store.branch" class="brackets">({{ store.branchFullName }})</span><span v-else class="brackets">(All industries)</span></h3>
    <div ref="chartEl" class="chart"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import * as echarts from 'echarts'
import { useStore } from '@/stores/company'

const store = useStore()
const chartEl = ref(null)
let myChart = null

const months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

const years = ['2023', '2024', '2025', '2026']

const yearColors = {
  2023: '#5470c6',
  2024: '#91cc75',
  2025: '#facc15', 
  2026: '#ee6666'
}

const props = defineProps({
  active: Boolean
})

function resizeChart() {
  if (myChart) myChart.resize()
}

function forceResizeChart() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      updateChart(store.geojson)
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

function parseDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return Number.isNaN(d.getTime()) ? null : d
}



function getMonthlyDataFromGeoJSON(features) {
  const yearToIndex = Object.fromEntries(years.map((y, i) => [Number(y), i]))
  const counts = {}
  years.forEach((year, yearIndex) => {
    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
      counts[`${yearIndex}-${monthIndex}`] = 0
    }
  })

  for (const feature of features) {
    const props = feature.properties || {}
    const start = parseDate(props.startdate)
    const end = parseDate(props.enddate) || new Date()
    if (!start || !end) continue
    if (start > end) continue
    const current = new Date(start.getFullYear(), start.getMonth(), 1)
    const last = new Date(end.getFullYear(), end.getMonth(), 1)
    while (current <= last) {
      const year = current.getFullYear()
      const month = current.getMonth()
      const yearIndex = yearToIndex[year]
      if (yearIndex !== undefined) {
        counts[`${yearIndex}-${month}`] += 1
      }
      current.setMonth(current.getMonth() + 1)
    }
  }

  const result = []

  years.forEach((year, yearIndex) => {
    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
      result.push([yearIndex, monthIndex, counts[`${yearIndex}-${monthIndex}`]])
    }
  })
  return result
}

function getFilteredFeatures(features) {
  return features.filter(feature => {
    const props = feature.properties || {}
    const matchesCountry =
      !store.country || props.country_code === store.country
    const matchesBranch =
      !store.branch || props.sni_code === store.branch
    return matchesCountry && matchesBranch
  })
}

function updateChart(geojson) {
  if (!myChart || !geojson?.features) return

  const filteredFeatures = getFilteredFeatures(geojson.features)
  const data = getMonthlyDataFromGeoJSON(filteredFeatures)
  const title = []
  const singleAxis = []
  const series = []

  const maxValue = Math.max(...data.map(d => d[2]), 1)
  years.forEach((year, idx) => {
    title.push({
      textBaseline: 'middle',
      top: ((idx + 0.5) * 100) / years.length + '%',
      text: year
    })

    singleAxis.push({
      left: 15,
      right: 20,
      type: 'category',
      boundaryGap: false,
      data: months,
      top: (idx * 100) / years.length + 5 + '%',
      height: 100 / years.length - 10 + '%',
      axisLabel: {
        interval: 0
      }
    })

    series.push({
      singleAxisIndex: idx,
      coordinateSystem: 'singleAxis',
      type: 'scatter',
      data: [],
      itemStyle: {
        color: yearColors[year]
      },
      symbolSize(dataItem) {
        const value = dataItem[1]
        if (value === 0) return 0

        const minSize = 5
        const maxSize = 30

        return minSize + (Math.sqrt(value) / Math.sqrt(maxValue)) * (maxSize - minSize)
      }
    })

  })

  data.forEach((dataItem) => {
    series[dataItem[0]].data.push([dataItem[1], dataItem[2]])
  })

  myChart.clear()

  myChart.setOption({
    tooltip: {
      position: 'top',
      formatter(params) {
        const year = years[params.seriesIndex]
        const month = months[params.data[0]]
        const value = params.data[1]
        return `${year}<br>${month}: ${value}`
      }
    },
    title,
    singleAxis,
    series
  })

  resizeChart()
}

onMounted(async () => {
  await nextTick()
  myChart = echarts.init(chartEl.value)

  if (!store.geojson && !store.loadingGeojson) {
    await store.loadGeojson()
  }
  updateChart(store.geojson)
  forceResizeChart()
  window.addEventListener('resize', resizeChart)
})

watch(
  () => [store.geojson, store.country, store.branch, store.year],
  () => {
    updateChart(store.geojson)
    if (props.active) {
      forceResizeChart()
    }
  },
  { immediate: true, deep: true }
)

onUnmounted(() => {
  window.removeEventListener('resize', resizeChart)
  if (myChart) {
    myChart.dispose()
    myChart = null
  }
})

</script>

<style scoped>
.statistics {
  width: 100%;
}

.chart {
  width: 100%;
  height: 400px;
}

.brackets {
  font-size: 14px;
  color: #666;
}
</style>