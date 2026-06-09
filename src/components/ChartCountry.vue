<template>
  <div class="statistics">
    <h3>Average stay by country</h3>
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

const filteredGeojson = computed(() => {
  if (!store.geojson) return null

  return {
    ...store.geojson,
    features: store.geojson.features.filter(feature => {
      const worker = feature.properties

      const matchesBranch =
        !store.branch || worker.sni_code === store.branch

      const matchesYear =
        !store.year ||
        (
          new Date(worker.startdate).getFullYear() <= store.year &&
          new Date(worker.enddate).getFullYear() >= store.year
        )

      return matchesBranch && matchesYear
    })
  }
})

const chartData = computed(() => {
  if (!filteredGeojson.value) return []
  return getCountryDurationAverages(filteredGeojson.value)
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
  window.addEventListener('resize', chart.resize)
})

watch(
  () => [store.geojson, store.year, store.branch],
  renderChart,
  { 
    deep: true 
  }
)

onBeforeUnmount(() => {
  window.removeEventListener('resize', chart?.resize)
  chart?.dispose()
  chart = null
})


</script>

<style scoped>
.chart {
  width: 100%;
  height: 600px;
}
</style>