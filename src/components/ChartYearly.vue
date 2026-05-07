<template>
  <div class="statistics">
    <h3>Total foreign workers at <span>{{ store.company.charAt(0).toUpperCase() + store.company.slice(1)}}</span></h3>
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

function resizeChart() {
  if (myChart) myChart.resize()
}

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

function updateChart(geojson) {
  if (!myChart || !geojson?.features) return
  const data = getMonthlyDataFromGeoJSON(geojson.features)
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
      left: 10,
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
  }, true)

  resizeChart()
}

onMounted(async () => {
  await nextTick()

  myChart = echarts.init(chartEl.value)

  if (!store.geojson) {
    await store.loadGeojson()
  } else {
    updateChart(store.geojson)
  }

  window.addEventListener('resize', resizeChart)
  resizeChart()
})

watch(
  () => store.geojson,
  (geojson) => {
    updateChart(geojson)
  },
  { immediate: true }
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
</style>