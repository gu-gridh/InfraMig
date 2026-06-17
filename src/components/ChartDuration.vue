<template>
  <div class="statistics">
    <div v-if="!store.year">
    <h3>
      Duration of stay
      <span v-if="store.year">({{ store.year }})</span><span v-else>2023-2026</span>
      <span v-if="store.branch" class="brackets"> ({{ store.branchFullName }})</span><span v-else class="brackets"> (all industries)</span>
    </h3>

    <div ref="histogramEl" class="chart"></div>
    </div>
    <h3 class="chart-title">Activity of work <span v-if="store.year">({{ store.year }})</span><span v-else>2023-2026</span></h3>
    <div ref="timelineEl" class="chart"></div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import * as echarts from 'echarts'
import { useStore } from '@/stores/company'

const store = useStore()

const histogramEl = ref(null)
const timelineEl = ref(null)

let histogramChart = null
let timelineChart = null

const bins = [
  { label: '0-3', min: 0, max: 3 },
  { label: '3-6', min: 3, max: 6 },
  { label: '6-12', min: 6, max: 12 },
  { label: '12-18', min: 12, max: 18 },
  { label: '18-24', min: 18, max: 24 },
  { label: '24+', min: 24, max: Infinity }
]

const workers = computed(() => {
  const features = store.geojson?.features ?? []

  return features
    .map(feature => feature.properties)
    .filter(worker => worker?.startdate)
    .filter(worker => {
      const matchesCountry =
        !store.country || worker.country_code === store.country

      const matchesBranch =
        !store.branch || worker.sni_code === store.branch

      return matchesCountry && matchesBranch
    })
})

const histogramCounts = computed(() => {
  const durations = workers.value.map(worker => {
    const start = new Date(worker.startdate)
    const end = new Date(worker.enddate)

    return (end - start) / (1000 * 60 * 60 * 24 * 30.44)
  })

  return bins.map(bin =>
    durations.filter(d => d >= bin.min && d < bin.max).length
  )
})

const timelineData = computed(() => {
  const labels = []
  const values = []

  const startYear = store.year ?? 2023
  const endYear = store.year ?? 2026

  for (let year = startYear; year <= endYear; year++) {
    for (let month = 0; month < 12; month++) {
      const current = new Date(year, month, 1)
      const label = `${year}-${String(month + 1).padStart(2, '0')}`

      const activeCount = workers.value.filter(worker => {
        const start = new Date(worker.startdate)
        const end = new Date(worker.enddate)

        return start <= current && end >= current
      }).length

      labels.push(label)
      values.push(activeCount)
    }
  }

  return { labels, values }
})

function buildHistogramOption() {
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    grid: {
      left: '8%',
      right: '4%',
      top: '10%',
      bottom: '12%'
    },
    xAxis: {
      type: 'category',
      data: bins.map(bin => bin.label),
      name: 'Months',
      nameLocation: 'middle',
      nameGap: 30
    },
    yAxis: {
      type: 'value',
      name: 'Workers'
    },
    series: [
      {
        type: 'bar',
        data: histogramCounts.value,
        barWidth: '60%',
        itemStyle: {
          color: '#14B8A6',
          borderRadius: [4, 4, 0, 0]
        },
        label: {
          show: true,
          position: 'top'
        }
      }
    ]
  }
}

function buildTimelineOption() {
  return {
    tooltip: {
      trigger: 'axis'
    },
    grid: {
      left: '10%',
      right: '4%',
      top: '10%',
      bottom: '18%'
    },
    xAxis: {
      type: 'category',
      data: timelineData.value.labels,
      axisLabel: {
        rotate: 45,
        interval: 2
      }
    },
    yAxis: {
      type: 'value',
      name: 'Workers'
    },
    series: [
      {
        type: 'line',
        data: timelineData.value.values,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          width: 3,
          color: '#14B8A6'
        },
        itemStyle: {
          color: '#14B8A6'
        },
        areaStyle: {
          color: '#14B8A6',
        }
      }
    ]
  }
}

function updateCharts() {
   if (!store.year) {
    histogramChart?.setOption(buildHistogramOption(), true)
  }
  timelineChart?.setOption(buildTimelineOption(), true)
}

function resizeCharts() {
  histogramChart?.resize()
  timelineChart?.resize()
}

watch(
  () => [store.geojson, store.country, store.branch, store.year],
  () => {
    updateCharts()
  },
  { deep: true }
)

// redraw timeline when store changes
watch(
  () => store.year,
  async (year) => {
    if (year) {
      histogramChart?.dispose()
      histogramChart = null
      return
    }
    await nextTick()
    if (histogramEl.value && !histogramChart) {
      histogramChart = echarts.init(histogramEl.value)
    }
    updateCharts()
  }
)

onMounted(async () => {
  await nextTick()
  if (!store.geojson && !store.loadingGeojson) {
    await store.loadGeojson()
  }
  if (histogramEl.value) {
    histogramChart = echarts.init(histogramEl.value)
  }
  if (timelineEl.value) {
    timelineChart = echarts.init(timelineEl.value)
  }
  updateCharts()
  window.addEventListener('resize', resizeCharts)
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCharts)

  histogramChart?.dispose()
  timelineChart?.dispose()

  histogramChart = null
  timelineChart = null
})


</script>

<style scoped>
.statistics {
  width: 100%;
}

.chart {
  width: 100%;
  height: 320px;
  margin-bottom: 24px;
}

.chart-title {
  margin-top: 12px;
}

.brackets {
  font-size: 14px;
  color: #666;
}
</style>