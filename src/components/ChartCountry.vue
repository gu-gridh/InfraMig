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

const DAY = 1000 * 60 * 60 * 24

function parseDate(value) {
  if (!value) return null

  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? null
    : date
}

function mergeIntervals(intervals) {
  if (!intervals.length) return []

  const sorted = [...intervals]
    .sort((a, b) => a[0] - b[0])

  const merged = [[...sorted[0]]]

  for (const [start, end] of sorted.slice(1)) {
    const last = merged[merged.length - 1]

    const dayAfterLast = new Date(last[1])
    dayAfterLast.setDate(
      dayAfterLast.getDate() + 1
    )

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

function countDays(intervals) {
  return intervals.reduce(
    (sum, [start, end]) =>
      sum +
      Math.floor((end - start) / DAY) +
      1,
    0
  )
}

const chartData = computed(() => {
  const features = store.geojson?.features ?? []

  const selectedYear = store.year
    ? Number(store.year)
    : null

  const periodStart = selectedYear
    ? new Date(selectedYear, 0, 1)
    : new Date(2023, 0, 1)

  const periodEnd = selectedYear
    ? new Date(
        selectedYear,
        11,
        31,
        23,
        59,
        59
      )
    : new Date(
        2025,
        11,
        31,
        23,
        59,
        59
      )

  /*
   country →
      worker_id →
         [[start, end], ...]
  */

  const countries = new Map()

  for (const feature of features) {
    const worker = feature.properties || {}

    // COUNTRY FILTER
    const matchesCountry =
      !store.country ||
      String(worker.country_code || '')
        .trim()
        .toUpperCase() ===
      String(store.country || '')
        .trim()
        .toUpperCase()

    if (!matchesCountry) continue

    // BRANCH FILTER
    const matchesBranch =
      !store.branch ||
      (
        store.branch === 'OTHER'
          ? worker.sni_code == null
          : String(worker.sni_code || '')
              .toUpperCase() ===
            String(store.branch)
              .toUpperCase()
      )

    if (!matchesBranch) continue

    const workerId =
      String(worker.worker_id ?? '').trim()

    if (!workerId) continue

    let start =
      parseDate(worker.startdate)

    let end =
      parseDate(worker.enddate) ||
      periodEnd

    if (!start || !end) continue

    // No overlap with selected period
    if (
      start > periodEnd ||
      end < periodStart
    ) {
      continue
    }

    // Clip to selected period
    if (start < periodStart) {
      start = new Date(periodStart)
    }

    if (end > periodEnd) {
      end = new Date(periodEnd)
    }

    const country =
      worker.country_en ||
      worker.country_code ||
      'Unknown'

    if (!countries.has(country)) {
      countries.set(country, new Map())
    }

    const countryWorkers =
      countries.get(country)

    if (!countryWorkers.has(workerId)) {
      countryWorkers.set(workerId, [])
    }

    countryWorkers
      .get(workerId)
      .push([start, end])
  }

  const result = []

  for (
    const [country, workers]
    of countries.entries()
  ) {
    const durations = []

    for (
      const intervals
      of workers.values()
    ) {
      const merged =
        mergeIntervals(intervals)

      const days =
        countDays(merged)

      if (days > 0) {
        durations.push(days)
      }
    }

    if (!durations.length) continue

    const average =
      durations.reduce(
        (sum, days) => sum + days,
        0
      ) / durations.length

    result.push({
      country,
      workers: durations.length,
      avgDuration: average
    })
  }

  return result.sort(
    (a, b) =>
      b.avgDuration - a.avgDuration
  )
})

const option = computed(() => ({
  //title: { text: 'Average stay by country' },
  tooltip: {
  trigger: 'axis',
  axisPointer: {
    type: 'shadow'
  },

  formatter: params => {
    const row =
      chartData.value[
        params?.[0]?.dataIndex
      ]

    if (!row) return ''

    return `
      <strong>${row.country}</strong><br>
      Average stay: ${Math.round(row.avgDuration)} days<br>
      Unique workers: ${row.workers.toLocaleString()}
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