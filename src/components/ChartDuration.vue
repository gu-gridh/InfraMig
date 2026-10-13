<template>
  <div class="statistics">

    <h3>
      Duration of stay
      <span v-if="store.year">({{ store.year }})</span><span v-else>2023-2025</span>
      <span v-if="store.branch" class="brackets"> ({{ store.branchFullName }})</span><span v-else class="brackets"> (all industries)</span>
    </h3>
    <div ref="histogramEl" class="chart"></div>
    <h3 class="chart-title">Activity of work 2023-2025</h3>
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

const DAY = 1000 * 60 * 60 * 24

function countDays(intervals) {
  return intervals.reduce((sum, [start, end]) => {
    return sum + Math.floor((end - start) / DAY) + 1
  }, 0)
}

const props = defineProps({
  active: Boolean
})

function forceResizeChart() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      histogramChart?.resize()
      timelineChart?.resize()
      updateCharts()
    })
  })
}

//for the filtering
function matchesBaseFilters(worker) {
  const matchesCountry =
    !store.country ||
    String(worker.country_code || '').trim().toUpperCase() ===
    String(store.country || '').trim().toUpperCase()

  const matchesBranch =
    !store.branch ||
    (
      store.branch === 'OTHER'
        ? worker.sni_code == null
        : String(worker.sni_code || '').toUpperCase() ===
          String(store.branch).toUpperCase()
    )

  return matchesCountry && matchesBranch
}

// for contracts overlapping
function mergeIntervals(intervals) {
  if (!intervals.length) return []

  const sorted = [...intervals]
    .sort((a, b) => a[0] - b[0])

  const merged = [[...sorted[0]]]

  for (const [start, end] of sorted.slice(1)) {
    const last = merged[merged.length - 1]

    // Overlapping or adjacent
    const dayAfterLast = new Date(last[1])
    dayAfterLast.setDate(dayAfterLast.getDate() + 1)

    if (start <= dayAfterLast) {
      if (end > last[1]) {
        last[1] = end
      }
    } else {
      merged.push([start, end])
    }
  }

  return merged
}

//duration per unique worker
const workerDurations = computed(() => {
  const features = store.geojson?.features ?? []

  const selectedYear = store.year
    ? Number(store.year)
    : null

  const periodStart = selectedYear
    ? new Date(selectedYear, 0, 1)
    : new Date(2023, 0, 1)

  const periodEnd = selectedYear
    ? new Date(selectedYear, 11, 31)
    : new Date(2025, 11, 31)

  const workers = new Map()

  for (const feature of features) {
    const worker = feature.properties || {}

    if (!matchesBaseFilters(worker)) continue

    const workerId = String(worker.worker_id ?? '').trim()

    if (!workerId || !worker.startdate) continue

    let start = new Date(worker.startdate)

    let end = worker.enddate
      ? new Date(worker.enddate)
      : periodEnd

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      continue
    }

    // No overlap with selected period
    if (start > periodEnd || end < periodStart) {
      continue
    }

    // Clip contract to selected period
    if (start < periodStart) start = new Date(periodStart)
    if (end > periodEnd) end = new Date(periodEnd)

    if (!workers.has(workerId)) {
      workers.set(workerId, [])
    }

    workers.get(workerId).push([start, end])
  }

  const durations = []

  for (const intervals of workers.values()) {
    const merged = mergeIntervals(intervals)
    const days = countDays(merged)

    durations.push(days / 30.44)
  }

  return durations
})

const histogramCounts = computed(() => {
  return bins.map(bin =>
    workerDurations.value.filter(
      months =>
        months >= bin.min &&
        months < bin.max
    ).length
  )
})

const activityWorkers = computed(() => {
  const features = store.geojson?.features ?? []

  return features
    .map(feature => feature.properties || {})
    .filter(worker => worker.startdate)
    .filter(matchesBaseFilters)
})

const timelineData = computed(() => {
  const labels = []
  const values = []

  for (let year = 2023; year <= 2025; year++) {
    for (let month = 0; month < 12; month++) {
      const current = new Date(year, month, 1)

      const label =
        `${year}-${String(month + 1).padStart(2, '0')}`

      const activeWorkerIds = new Set()

      for (const worker of activityWorkers.value) {
        const start = new Date(worker.startdate)

        const end = worker.enddate
          ? new Date(worker.enddate)
          : new Date(2025, 11, 31)

        if (
          Number.isNaN(start.getTime()) ||
          Number.isNaN(end.getTime())
        ) {
          continue
        }

        if (start <= current && end >= current) {
          const workerId =
            String(worker.worker_id ?? '').trim()

          if (workerId) {
            activeWorkerIds.add(workerId)
          }
        }
      }

      labels.push(label)
      values.push(activeWorkerIds.size)
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
  histogramChart?.setOption(
    buildHistogramOption(),
    true
  )

  timelineChart?.setOption(
    buildTimelineOption(),
    true
  )
}

function resizeCharts() {
  histogramChart?.resize()
  timelineChart?.resize()
}

watch(
  () => props.active,
  active => {
    if (active) {
      forceResizeChart()
    }
  }
)

watch(
  [
    () => store.geojson,
    () => store.year,
    () => store.branch,
    () => store.country
  ],
  async () => {
    await nextTick()

    console.log('FILTER CHANGED', {
      year: store.year,
      branch: store.branch,
      country: store.country,
      durations: workerDurations.value.length,
      histogram: histogramCounts.value
    })

    if (!histogramChart && histogramEl.value) {
      histogramChart = echarts.init(histogramEl.value)
    }

    if (!timelineChart && timelineEl.value) {
      timelineChart = echarts.init(timelineEl.value)
    }

    updateCharts()
    resizeCharts()
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