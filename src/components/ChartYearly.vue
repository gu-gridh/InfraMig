<template>
  <div class="statistics">

    <!-- WORKFORCE OVER TIME -->
    <h3>
      Workforce over time
      <span v-if="store.year">({{ store.year }})</span>
      <span v-else>(2023–2025)</span>

      <span v-if="store.branch" class="brackets">
        ({{ store.branchFullName }})
      </span>
      <span v-else class="brackets">
        (all industries)
      </span>
    </h3>

    <div
      ref="timelineEl"
      class="chart"
    ></div>


    <!-- WORKERS BY COUNTRY -->
    <h3 class="chart-title">
      Workers by company country
      <span v-if="store.year">
        ({{ store.year }})
      </span>

      <span v-if="store.branch" class="brackets">
        ({{ store.branchFullName }})
      </span>
      <span v-else class="brackets">
        (all industries)
      </span>
    </h3>

    <div
      ref="countryEl"
      class="chart country-chart"
    ></div>

  </div>
</template>


<script setup>
import {
  ref,
  computed,
  onMounted,
  onUnmounted,
  nextTick,
  watch
} from 'vue'

import * as echarts from 'echarts'
import { useStore } from '@/stores/company'

const store = useStore()

const timelineEl = ref(null)
const countryEl = ref(null)

let timelineChart = null
let countryChart = null


const props = defineProps({
  active: Boolean
})


/* ---------------------------------------
   DATE
--------------------------------------- */

function parseDate(value) {
  if (!value) return null

  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? null
    : date
}


/* ---------------------------------------
   BASE FEATURES

   Apply country + branch here.

   Year is handled separately because
   the timeline needs month-level filtering.
--------------------------------------- */

const baseFeatures = computed(() => {
  const features = store.geojson?.features ?? []

  return features.filter(feature => {
    const worker = feature.properties || {}

    const matchesCountry =
      !store.country ||
      String(worker.country_code || '')
        .trim()
        .toUpperCase() ===
      String(store.country || '')
        .trim()
        .toUpperCase()

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

    return matchesCountry && matchesBranch
  })
})


/* ---------------------------------------
   WORKFORCE OVER TIME
--------------------------------------- */

const timelineData = computed(() => {

  const labels = []
  const values = []

  const selectedYear = store.year
    ? Number(store.year)
    : null

  const startYear = selectedYear ?? 2023
  const endYear = selectedYear ?? 2025


  for (
    let year = startYear;
    year <= endYear;
    year++
  ) {

    for (let month = 0; month < 12; month++) {

      const monthStart = new Date(year, month, 1)
      const monthEnd = new Date(year, month + 1, 0, 23, 59, 59)
      const workerIds = new Set()


      for (const feature of baseFeatures.value) {

        const worker =
          feature.properties || {}

        const start =
          parseDate(worker.startdate)

        const end =
          parseDate(worker.enddate) ||
          new Date(2025, 11, 31)

        if (!start || !end) continue


        /*
         Worker must be active on
         the first day of this month.
        */

        if (
          start <= monthEnd &&
          end >= monthStart
        ) {

          const workerId =
            String(
              worker.worker_id ?? ''
            ).trim()

          if (workerId) {
            workerIds.add(workerId)
          }
        }
      }


      labels.push(
        `${year}-${String(month + 1)
          .padStart(2, '0')}`
      )

      values.push(workerIds.size)
    }
  }


  return {
    labels,
    values
  }
})


/* ---------------------------------------
   COUNTRY DATA
--------------------------------------- */

const countryData = computed(() => {

  const selectedYear = store.year
    ? Number(store.year)
    : null

  const yearStart = selectedYear
    ? new Date(selectedYear, 0, 1)
    : new Date(2023, 0, 1)

  const yearEnd = selectedYear
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
   Map:

   country →
   Set(worker_id)
  */

  const countries = new Map()


  for (const feature of baseFeatures.value) {

    const worker =
      feature.properties || {}

    const start =
      parseDate(worker.startdate)

    const end =
      parseDate(worker.enddate) ||
      yearEnd

    if (!start || !end) continue


    /*
     Worker must overlap selected period.
    */

    if (
      start > yearEnd ||
      end < yearStart
    ) {
      continue
    }


    const country =
      worker.country_en ||
      worker.country_code ||
      'Unknown'


    const workerId =
      String(
        worker.worker_id ?? ''
      ).trim()

    if (!workerId) continue


    if (!countries.has(country)) {
      countries.set(
        country,
        new Set()
      )
    }


    countries
      .get(country)
      .add(workerId)
  }


  return [...countries.entries()]
    .map(([country, workerIds]) => ({
      country,
      workers: workerIds.size
    }))
    .sort(
      (a, b) =>
        b.workers - a.workers
    )
})


/* ---------------------------------------
   TIMELINE OPTION
--------------------------------------- */

function buildTimelineOption() {

  return {

    tooltip: {
      trigger: 'axis',

      formatter(params) {

        const item = params?.[0]

        if (!item) return ''

        return `
          <strong>${item.axisValue}</strong><br>
          Workers: ${item.value.toLocaleString()}
        `
      }
    },


    grid: {
      left: 55,
      right: 20,
      top: 30,
      bottom: 60
    },


    xAxis: {
      type: 'category',

      data:
        timelineData.value.labels,

      boundaryGap: false,

      axisLabel: {
        rotate: 45,

        interval:
          store.year
            ? 0
            : 2
      }
    },


    yAxis: {
      type: 'value',
      name: 'Workers',
      minInterval: 1
    },


    series: [
      {
        type: 'line',

        data:
          timelineData.value.values,

        smooth: true,

        symbol: 'circle',

        symbolSize:
          store.year
            ? 7
            : 5,

        lineStyle: {
          width: 3,
          color: '#14B8A6'
        },

        itemStyle: {
          color: '#14B8A6'
        },

        areaStyle: {
          opacity: 0.12,
          color: '#14B8A6'
        }
      }
    ]
  }
}


/* ---------------------------------------
   COUNTRY OPTION
--------------------------------------- */

function buildCountryOption() {

  const data =
    countryData.value


  return {

    tooltip: {
      trigger: 'axis',

      axisPointer: {
        type: 'shadow'
      },

      formatter(params) {

        const item = params?.[0]

        if (!item) return ''

        return `
          <strong>${item.name}</strong><br>
          Workers: ${item.value.toLocaleString()}
        `
      }
    },


    grid: {
      left: 100,
      right: 55,
      top: 15,
      bottom: 30
    },


    xAxis: {
      type: 'value',
      name: 'Workers',
      minInterval: 1
    },


    yAxis: {
      type: 'category',

      inverse: true,

      data:
        data.map(
          row => row.country
        ),

      axisLabel: {
        width: 90,
        overflow: 'truncate'
      }
    },


    series: [
      {
        type: 'bar',

        data:
          data.map(
            row => row.workers
          ),

        barMaxWidth: 24,

        itemStyle: {
          color: '#14B8A6',
          borderRadius: [0, 4, 4, 0]
        },

        label: {
          show: true,

          position: 'right',

          formatter(params) {
            return params.value.toLocaleString()
          }
        }
      }
    ]
  }
}


/* ---------------------------------------
   UPDATE
--------------------------------------- */

function updateCharts() {

  timelineChart?.setOption(
    buildTimelineOption(),
    true
  )

  countryChart?.setOption(
    buildCountryOption(),
    true
  )
}


function resizeCharts() {
  timelineChart?.resize()
  countryChart?.resize()
}


function forceResizeCharts() {

  requestAnimationFrame(() => {

    requestAnimationFrame(() => {

      updateCharts()
      resizeCharts()

    })

  })
}


/* ---------------------------------------
   WATCH
--------------------------------------- */

watch(
  () => props.active,

  active => {

    if (active) {
      forceResizeCharts()
    }

  }
)


watch(
  [
    () => store.geojson,
    () => store.country,
    () => store.branch,
    () => store.year
  ],

  async () => {

    await nextTick()

    updateCharts()

    if (props.active) {
      resizeCharts()
    }

  }
)


/* ---------------------------------------
   MOUNT
--------------------------------------- */

onMounted(async () => {

  await nextTick()


  if (
    !store.geojson &&
    !store.loadingGeojson
  ) {
    await store.loadGeojson()
  }


  if (timelineEl.value) {

    timelineChart =
      echarts.init(
        timelineEl.value
      )

  }


  if (countryEl.value) {

    countryChart =
      echarts.init(
        countryEl.value
      )

  }


  updateCharts()

  window.addEventListener(
    'resize',
    resizeCharts
  )
})


onUnmounted(() => {

  window.removeEventListener(
    'resize',
    resizeCharts
  )

  timelineChart?.dispose()
  countryChart?.dispose()

  timelineChart = null
  countryChart = null
})

</script>


<style scoped>

.statistics {
  width: 100%;
}


.chart {
  width: 100%;
  height: 330px;
}


.country-chart {
  height: 480px;
}


.chart-title {
  margin-top: 28px;
}


.brackets {
  font-size: 14px;
  color: #666;
}

</style>