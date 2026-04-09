<template>
  <div class="statistics">
    <h3>
      Duration of stay at
      <span>{{ store.company.charAt(0).toUpperCase() + store.company.slice(1) }}</span>
    </h3>

    <div ref="histogramEl" class="chart"></div>

    <h3 class="chart-title">Active workers over time</h3>
    <div ref="timelineEl" class="chart"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { useStore } from '@/stores/company'

const store = useStore()

const histogramEl = ref(null)
const timelineEl = ref(null)

let histogramChart = null
let timelineChart = null

function generateMockData(n = 200) {
  const countries = ['Sweden', 'Germany', 'India', 'China']
  const branches = ['IT', 'Logistics', 'HR']

  const data = []

  for (let i = 0; i < n; i++) {
    const start = new Date(
      2022 + Math.floor(Math.random() * 5), // 2022-2026
      Math.floor(Math.random() * 12),
      1
    )

    const durationMonths = Math.floor(Math.random() * 24) + 1

    const end = new Date(start)
    end.setMonth(end.getMonth() + durationMonths)

    data.push({
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      country: countries[Math.floor(Math.random() * countries.length)],
      branch: branches[Math.floor(Math.random() * branches.length)]
    })
  }

  return data
}

const mockWorkers = generateMockData(300)

const durations = mockWorkers.map(d => {
  const start = new Date(d.start_date)
  const end = new Date(d.end_date)
  return (end - start) / (1000 * 60 * 60 * 24 * 30)
})

const bins = [
  { label: '0-3', min: 0, max: 3 },
  { label: '3-6', min: 3, max: 6 },
  { label: '6-12', min: 6, max: 12 },
  { label: '12-24', min: 12, max: 24 },
  { label: '24+', min: 24, max: Infinity }
]

const counts = bins.map(bin =>
  durations.filter(d => d >= bin.min && d < bin.max).length
)

function getMonthlyTimeline(workers, startYear = 2023, endYear = 2026) {
  const labels = []
  const values = []

  for (let year = startYear; year <= endYear; year++) {
    for (let month = 0; month < 12; month++) {
      const current = new Date(year, month, 1)
      const label = `${year}-${String(month + 1).padStart(2, '0')}`

      const activeCount = workers.filter(worker => {
        const start = new Date(worker.start_date)
        const end = new Date(worker.end_date)
        return start <= current && end >= current
      }).length

      labels.push(label)
      values.push(activeCount)
    }
  }

  return { labels, values }
}

const timelineData = getMonthlyTimeline(mockWorkers, 2023, 2026)

function buildHistogramOption() {
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
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
        data: counts,
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
      left: '10',
      right: '4%',
      top: '10%',
      bottom: '18%'
    },
    xAxis: {
      type: 'category',
      data: timelineData.labels,
      axisLabel: {
        rotate: 45,
        interval: 2
      }
    },
    yAxis: {
      type: 'value',
      name: 'Active workers'
    },
    series: [
      {
        type: 'line',
        data: timelineData.values,
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
          color: 'rgba(20, 184, 166, 0.15)'
        }
      }
    ]
  }
}

function resizeCharts() {
  if (histogramChart) histogramChart.resize()
  if (timelineChart) timelineChart.resize()
}

onMounted(async () => {
  await nextTick()

  if (histogramEl.value) {
    histogramChart = echarts.init(histogramEl.value)
    histogramChart.setOption(buildHistogramOption())
  }

  if (timelineEl.value) {
    timelineChart = echarts.init(timelineEl.value)
    timelineChart.setOption(buildTimelineOption())
  }

  window.addEventListener('resize', resizeCharts)
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCharts)

  if (histogramChart) {
    histogramChart.dispose()
    histogramChart = null
  }

  if (timelineChart) {
    timelineChart.dispose()
    timelineChart = null
  }
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
</style>