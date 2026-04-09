<template>
  <div class="statistics">
    <h3>Workforce per month & year</h3>
    <div ref="chartEl" class="chart"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'

const chartEl = ref(null)
let myChart = null

const months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

const years = ['2023', '2024', '2025', '2026']

// Format: [yearIndex, monthIndex, value]
const data = [
  [0, 0, 5], [0, 1, 8], [0, 2, 3], [0, 3, 6], [0, 4, 4], [0, 5, 7],
  [0, 6, 2], [0, 7, 9], [0, 8, 5], [0, 9, 4], [0, 10, 6], [0, 11, 3],

  [1, 0, 4], [1, 1, 6], [1, 2, 2], [1, 3, 7], [1, 4, 5], [1, 5, 8],
  [1, 6, 3], [1, 7, 6], [1, 8, 4], [1, 9, 7], [1, 10, 5], [1, 11, 2],

  [2, 0, 6], [2, 1, 5], [2, 2, 7], [2, 3, 4], [2, 4, 8], [2, 5, 3],
  [2, 6, 5], [2, 7, 7], [2, 8, 6], [2, 9, 4], [2, 10, 8], [2, 11, 5],

  [3, 0, 3], [3, 1, 4], [3, 2, 6], [3, 3, 5], [3, 4, 7], [3, 5, 2],
  [3, 6, 4], [3, 7, 8], [3, 8, 5], [3, 9, 6], [3, 10, 3], [3, 11, 7]
]

function resizeChart() {
  if (myChart) myChart.resize()
}

onMounted(async () => {
  await nextTick()

  myChart = echarts.init(chartEl.value)

  const title = []
  const singleAxis = []
  const series = []

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
        return dataItem[1] * 4
      }
    })
  })

  data.forEach((dataItem) => {
    series[dataItem[0]].data.push([dataItem[1], dataItem[2]])
  })

  const option = {
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
  }

  myChart.setOption(option)

  window.addEventListener('resize', resizeChart)
  resizeChart()
})

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