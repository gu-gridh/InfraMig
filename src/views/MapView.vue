<template>
  <div class="map-wrapper">
    <div id="map"></div>
    <div class="map-top-center">
      <v-btn-toggle
        rounded="small"
        mandatory
        border
        :model-value="store.company"
        @update:model-value="company => store.setCompany(company)"
        class="toggle-group"
        color="primary"
      >
        <v-btn value="stegra">Stegra</v-btn>
        <v-btn value="ssab">SSAB</v-btn>
      </v-btn-toggle>
    </div>
    <div class="map-panel">
      <Filters />
    </div>
  </div>
</template>

<script setup>
import { ref, shallowRef, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Filters from '@/components/Filters.vue'
import { useStore } from '@/stores/company'
import * as statsFunctions from '@/assets/statsFunctions.js'
import { getCountryDurationAverages, branchFullNames } from '@/assets/statsFunctions.js'
import { useRouter } from 'vue-router'

const router = useRouter()

const store = useStore()

const map = shallowRef(null)
const factoryPoint = shallowRef(null)
const companyGeoJsonLayer = shallowRef(null)
const countriesLayer = shallowRef(null)
const countryLabelsLayer = shallowRef(null)
const durationLegend = shallowRef(null)
const countryLegend = shallowRef(null)
const sizeLegend = shallowRef(null)
const SNI_stats = ref(null)

const countriesData = ref(null)
const mapReady = ref(false)

const COMPANY_CONFIG = {
  ssab: {
    file: '/geojson/ssab/ssab.geojson',
    factoryLatLng: [65.56347, 22.19981]
  },
  stegra: {
    file: '/geojson/stegra/stegra.geojson',
    factoryLatLng: [65.805389, 21.75914]
  }
}

function getCompanyConfig(company) {
  return COMPANY_CONFIG[company] ?? COMPANY_CONFIG.ssab
}

function normalizeName(value) {
  return String(value ?? '').trim().toLowerCase()
}

//since there can be a space before country code in the data...
function cleanCode(value) {
  return String(value ?? '').trim().toUpperCase()
}

function featureMatchesCountry(feature, country) {
  const props = feature.properties || {}
  return (
    cleanCode(extractCountryCode(props)) === cleanCode(country) ||
    normalizeName(extractCountryName(props)) === normalizeName(country)
  )
}

function getCircleRadius(count, maxCount) {
  const n = Number(count) || 1
  const minRadius = 6
  const maxRadius = 20

  return minRadius + (Math.sqrt(n) / Math.sqrt(maxCount)) * (maxRadius - minRadius)
}

function renderSizeLegend(maxCount) {
  sizeLegend.value?.remove()

  const values = [
    50,
    Math.round(2000/ 4),
    Math.round(2000 / 2),
    2000
  ].filter((v, i, arr) => v > 0 && arr.indexOf(v) === i)

  sizeLegend.value = L.control({ position: 'bottomleft' })

  sizeLegend.value.onAdd = () => {
    const div = L.DomUtil.create('div', 'size-legend')

    div.innerHTML = `
      <div class="legend-title">Workers</div>

      ${values.map(value => `
        <div class="size-legend-row">
          <span
            class="size-legend-circle"
            style="
              width:${getCircleRadius(value, 2000) * 2}px;
              height:${getCircleRadius(value, 2000) * 2}px;
            "
          ></span>
          <span>${value}</span>
        </div>
      `).join('')}
    `

    return div
  }

  sizeLegend.value.addTo(map.value)
}

function buildPieIcon(stats) {
  const entries = Object.entries(stats || {})
    .map(([code, data]) => [
      code,
      Number(data?.percentage || 0)
    ])
    .filter(([, value]) => value > 0)

  const total = entries.reduce((sum, [, value]) => sum + value, 0)

  if (!total) {
    return L.divIcon({
      className: 'sni-pie-marker',
      html: `<div class="sni-pie empty"></div>`,
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    })
  }

  let current = 0

  const gradient = entries.map(([code, percentage]) => {
    const start = current
    const end = current + percentage
    current = end

    return `${BRANCH_COLORS[code] || '#999'} ${start}% ${end}%`
  }).join(', ')

  return L.divIcon({
    className: 'sni-pie-marker',
    html: `
      <div
        class="sni-pie"
        style="background: conic-gradient(${gradient})"
      ></div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22]
  })
}

//Since country label can be misread
const COUNTRY_LABEL_OVERRIDES = {
  FRA: { name: 'France', latlng: [46.5, 2.5] },
  NOR: { name: 'Norway', latlng: [64.5, 11] },
  SGP: { name: 'Singapore', latlng: [1.35, 103.82] },
  HKG: { name: 'Hong Kong', latlng: [22.32, 114.17] }
}

function extractCountryCode(props = {}) {
  return (
    props.ADM0_A3 ||
    props.country_a3 ||
    props.country_code ||
    props.ISO_A3 ||
    props.iso_a3 ||
    props.ADM0_A3_US ||
    props.gu_a3 ||
    props.GU_A3 ||
    props.SOV_A3 ||
    props.sov_a3 ||
    null
  )
}

function extractCountryName(props = {}) {
  return (
    props.country_en ||
    props.country ||
    props.name_en ||
    props.ADMIN ||
    props.NAME_EN ||
    props.name ||
    null
  )
}

const DURATION_COLORS = [
  '#d73027',
  '#fc8d59',
  '#fee08b',
  '#d9ef8b',
  '#91cf60',
  '#66c2a5',
  '#3288bd',
  '#5e4fa2'
]

function getDurationColor(days) {
  if (days < 50) return '#5e4fa2'
  if (days < 100) return '#3288bd'
  if (days < 150) return '#66c2a5'
  if (days < 200) return '#91cf60'
  if (days < 300) return '#d9ef8b'
  if (days < 500) return '#fee08b'
  if (days < 1000) return '#fc8d59'
  return '#d73027'
}

function renderDurationLegend(min, max) {
  durationLegend.value?.remove()

  const ranges = [
    [1, 50],
    [50, 100],
    [100, 150],
    [150, 200],
    [200, 300],
    [300, 500],
    [500, 1000],
    [1000, 1500],
  ]

  durationLegend.value = L.control({ position: 'bottomleft' })

  durationLegend.value.onAdd = () => {
    const div = L.DomUtil.create('div', 'duration-legend')

    div.innerHTML = `
      <div class="legend-title">
        Average stay (days) ${store.year ?? '2023–2026'}
      </div>

      ${ranges.map(([from, to]) => {
        const mid = (from + to) / 2
        return `
          <div class="legend-row">
            <span
              class="legend-point"
              style="background:${getDurationColor(mid, min, max)}"
            ></span>

            <span>${from}–${Math.round(to)}</span>
          </div>
        `
      }).join('')}
    `
    return div
  }
  durationLegend.value.addTo(map.value)
}

//branch legend colors
const BRANCH_COLORS = {
  'C': '#f87171',
  'F': '#60a5fa',
  'H': '#34d399',
  'N': '#d4d4d8',
  'O': '#fbbf24',
}

function renderCountryLegend(workers) {
  countryLegend.value?.remove()

  const sniStats = statsFunctions.calcSNI(workers)

  countryLegend.value = L.control({ position: 'bottomleft' })

  countryLegend.value.onAdd = () => {
    const div = L.DomUtil.create('div', 'duration-legend')

    const sortedBranches = Object.entries(sniStats ?? {})
      .sort(([, a], [, b]) => Number(b.percentage) - Number(a.percentage))

    div.innerHTML = `
      <div class="legend-title">${store.fullName}</div>

      ${sortedBranches.map(([code, data]) => `
        <div class="legend-row">
          <span class="legend-point" style="background:${BRANCH_COLORS[code]};"></span>
          <span><strong>${branchFullNames(code)}</strong> (${data.percentage}%)</span>
        </div>
      `).join('')}
    `

    return div
  }

  countryLegend.value.addTo(map.value)
}

function buildPresentCountryLookup(pointsData) {
  const codes = new Set()
  const names = new Set()

  for (const feature of pointsData.features ?? []) {
    const props = feature.properties || {}
    const code = extractCountryCode(props)
    const name = extractCountryName(props)

    if (code){
      codes.add(cleanCode(code))
    } 
    if (name) names.add(normalizeName(name))
  }

  return { codes, names }
}

function isCountryPresent(countryLookup, countryProps = {}) {
  const code = extractCountryCode(countryProps)
  const name = extractCountryName(countryProps)

  return (
    (code && countryLookup.codes.has(cleanCode(code))) ||
    (name && countryLookup.names.has(normalizeName(name)))
  )
}

function updateFactoryPoint(company) {
  if (!factoryPoint.value) return
  factoryPoint.value.setLatLng(getCompanyConfig(company).factoryLatLng)
}

async function fetchJson(url, signal) {
  const res = await fetch(url, signal ? { signal } : undefined)
  if (!res.ok) {
    throw new Error(`Failed to load ${url}`)
  }
  return res.json()
}

function renderCountries(countryLookup) {
  countriesLayer.value?.remove()
  countryLabelsLayer.value?.remove()

  countryLabelsLayer.value = L.layerGroup().addTo(map.value)

  const addedOverrideLabels = new Set()

  countriesLayer.value = L.geoJSON(countriesData.value, {
    pane: 'countriesPane',
    style: (feature) => {
      const present = isCountryPresent(countryLookup, feature.properties)

      return {
        color: '#888',
        weight: 1,
        fillColor: '#ffffff',
        fillOpacity: present ? 0.08 : 0.02
      }
    },
    onEachFeature: (feature, layer) => {
      const props = feature.properties || {}
      const present = isCountryPresent(countryLookup, props)
      if (!present) return

      const code = extractCountryCode(props)
      const name = extractCountryName(props) || 'Unknown'

      const override = code ? COUNTRY_LABEL_OVERRIDES[cleanCode(code)] : null

      if (override) {
        if (!addedOverrideLabels.has(code)) {
          addedOverrideLabels.add(code)

          L.marker(override.latlng, {
            pane: 'countryLabelsPane',
            interactive: false,
            icon: L.divIcon({
              className: 'country-label-marker',
              html: `<div class="country-label">${override.name}</div>`
            })
          }).addTo(countryLabelsLayer.value)
        }
        return
      }

      layer.bindTooltip(name, {
        permanent: true,
        direction: 'center',
        className: 'country-label',
        pane: 'countryLabelsPane'
      })
    }
  }).addTo(map.value)
}

  function buildCompanyLayer(pointsData) {
    function featureMatchesBranch(feature, branch) {
      if (!branch) return true

      const props = feature.properties || {}

      return String(props.sni_code || '').toUpperCase()
        === String(branch).toUpperCase()
    }

    let features = pointsData.features ?? []

    //check store and filter out features
    if (store.country) {
      features = features.filter(feature =>
        featureMatchesCountry(feature, store.country)
      )
    }
    if (store.branch) {
      features = features.filter(feature =>
        featureMatchesBranch(feature, store.branch)
      )
    }
    if (store.year) {
      features = features.filter(feature =>
        featureMatchesYear(feature, store.year)
      )
    }

  const seenCountries = new Set()

  const uniqueCountryFeatures = features.filter((feature) => {
    const props = feature.properties || {}
    const key = cleanCode(extractCountryCode(props)) || normalizeName(extractCountryName(props))

    if (!key || seenCountries.has(key)) return false

    seenCountries.add(key)
    return true
  })

  const counts = uniqueCountryFeatures.map(
    (feature) => Number(feature.properties?.country_count) || 1
    )
    const maxCount = Math.max(...counts, 1)

      if (!store.country) {
        renderSizeLegend(maxCount)
      } else {
        sizeLegend.value?.remove()
        sizeLegend.value = null
      }

    // function getRadius(count) {
    //   const n = Number(count) || 1
    //   const minRadius = 6
    //   const maxRadius = 20
    //   return minRadius + (Math.sqrt(n) / Math.sqrt(maxCount)) * (maxRadius - minRadius)
    // }

  const durationData = getCountryDurationAverages({
    ...pointsData,
    features: uniqueCountryFeatures
  })
  
  const durations = durationData.map(d => d.avgDuration)
  const minDuration = Math.min(...durations)
  const maxDuration = Math.max(...durations)

  if (!store.country) {
    renderDurationLegend(minDuration, maxDuration)
  } else {
    durationLegend.value?.remove()
    durationLegend.value = null
  }

  return L.geoJSON(
    {
      ...pointsData,
      features: uniqueCountryFeatures
    },
    {
      pane: 'pointsPane',
      pointToLayer: (feature, latlng) => {

  if (store.country) {
    const sniStats = statsFunctions.calcSNI(
    features.map(f => f.properties)
    )
    return L.marker(latlng, {
      pane: 'pointsPane',
      icon: buildPieIcon(sniStats)
    })
  }

  const count = feature.properties?.country_count ?? 1

  const durationAvg = feature.properties?.duration_avg
    return L.circleMarker(latlng, {
      radius: getCircleRadius(count, maxCount),
      fillColor: getDurationColor(
        durationAvg,
        minDuration,
        maxDuration
      ),
      color: '#ffffff',
      weight: 1,
      opacity: 1,
      fillOpacity: 0.9
    })
  },
      onEachFeature: (feature, layer) => {
        const props = feature.properties || {}
        const country = extractCountryName(props) || 'Unknown country'
        const count = props.country_count || 1

        layer.bindPopup(`
          <strong>${country}</strong><br>
          Workers: ${count}<br>
          Average: ${props.duration_avg ? props.duration_avg + ' days' : 'N/A'}
        `)
      }
    }
  )
}

function refreshCompany(pointsData) {
  if (!map.value || !countriesData.value || !pointsData) return

  //updateFactoryPoint(store.company)
  const filteredData = filterMapFeatures(pointsData)
  const countryLookup = buildPresentCountryLookup(filteredData)
  renderCountries(countryLookup)
  companyGeoJsonLayer.value?.remove()
  companyGeoJsonLayer.value = buildCompanyLayer(filteredData).addTo(map.value)
}

//update store.coordinates when country changes
const DEFAULT_CENTER = [30, 3]
const DEFAULT_ZOOM = 3

watch(
  () => store.country,
  (country) => {
    if (!map.value) return
    if (store.geojson) {
      refreshCompany(store.geojson)
    }

    if (country) {
      durationLegend.value?.remove()
      durationLegend.value = null
      const filteredData = filterMapFeatures(store.geojson)
      const workers = filteredData.features.map(f => f.properties)
      SNI_stats.value = statsFunctions.calcSNI(workers)
      renderCountryLegend(workers)
    } else {
      countryLegend.value?.remove()
      countryLegend.value = null
      map.value.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, {
        duration: 0.5
      })
      return
    }

    const feature = countriesData.value?.features?.find(f => {
      const props = f.properties || {}

      return (
        String(extractCountryCode(props)).toUpperCase() === String(country).toUpperCase() ||
        normalizeName(extractCountryName(props)) === normalizeName(country)
      )
    })

    if (!feature) return

    const bounds = L.geoJSON(feature).getBounds()

    if (bounds.isValid()) {
      map.value.flyToBounds(bounds, {
        padding: [40, 40],
        maxZoom: 6,
        duration: 0.8
      })
    }
  }
)

function featureMatchesYear(feature, year) {
  if (!year) return true

  const props = feature.properties || {}
  if (!props.startdate) return false

  const start = new Date(props.startdate)
  const end = props.enddate ? new Date(props.enddate) : new Date()

  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year, 11, 31, 23, 59, 59)

  return start <= yearEnd && end >= yearStart
}

function filterMapFeatures(pointsData) {
  return {
    ...pointsData,
    features: (pointsData.features ?? []).filter(feature => {
      return (
        (!store.country || featureMatchesCountry(feature, store.country)) &&
        (!store.branch || String(feature.properties?.sni_code || '').toUpperCase() === String(store.branch).toUpperCase()) &&
        featureMatchesYear(feature, store.year)
      )
    })
  }
}

watch(
  [() => store.geojson, mapReady, () => store.branch, () => store.year],
  ([geojson, ready]) => {
    if (!ready || !geojson) return
    refreshCompany(geojson)
  },
  { immediate: true }
)

onMounted(async () => {
  await nextTick()

  map.value = L.map('map', {
    zoomSnap: 0.5,
    worldCopyJump: true,
    minZoom: 1,
    maxBounds: [
      [-90, -180],
      [90, 180]
    ],
    maxBoundsViscosity: 1.0
  }).setView(store.coordinates, store.zoom)

  const pane = map.value.createPane('countriesPane')
  pane.style.zIndex = 200

  const labelsPane = map.value.createPane('countryLabelsPane')
  labelsPane.style.zIndex = 300

  const pointsPane = map.value.createPane('pointsPane')
  pointsPane.style.zIndex = 400

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 20,
    noWrap: true
  }).addTo(map.value)

  countriesData.value = await fetchJson('/geojson/countries.geojson')

  // factoryPoint.value = L.circleMarker(getCompanyConfig(store.company).factoryLatLng, {
  //   pane: 'pointsPane',
  //   radius: 6,
  //   fillColor: '#14B8A6',
  //   color: '#14B8A6',
  //   weight: 2,
  //   opacity: 1,
  //   fillOpacity: 0.9
  // }).addTo(map.value)
  
  map.value.zoomControl.setPosition('bottomright')

  const BackControl = L.Control.extend({
    options: {
      position: 'topleft'
    },
    onAdd() {
      const container = L.DomUtil.create('div', 'leaflet-bar')
      const button = L.DomUtil.create('a', 'back-button', container)
      button.href = '#'
      //button.title = 'Back'
      button.innerHTML = '<i class="mdi mdi-home"></i>'
      //button.classList.add('material-icons')
      L.DomEvent.disableClickPropagation(container)
      L.DomEvent.on(button, 'click', (e) => {
        L.DomEvent.preventDefault(e)
        router.push('/')
      })
      return container
    }
  })
  new BackControl().addTo(map.value)

  mapReady.value = true

  if (!store.geojson) {
    await store.loadGeojson()
  }
  if (store.geojson) {
    refreshCompany(store.geojson)
  } else {
    console.warn('No geojson available after load')
  }

  setTimeout(() => {
    map.value.invalidateSize()
  }, 100)
})

onBeforeUnmount(() => {
  companyGeoJsonLayer.value?.remove()
  countriesLayer.value?.remove()
  countryLabelsLayer.value?.remove()
  factoryPoint.value?.remove()
  map.value?.remove()

  companyGeoJsonLayer.value = null
  countriesLayer.value = null
  countryLabelsLayer.value = null
  factoryPoint.value = null
  map.value = null
  mapReady.value = false
  durationLegend.value?.remove()
  durationLegend.value = null
  sizeLegend.value?.remove()
  sizeLegend.value = null
})
</script>

<style>
html, body, #app {
  margin: 0;
  height: 100%;
}

.map-wrapper {
  position: relative;
  height: 100vh;
}

#map {
  height: 100%;
  width: 100%;
}

.info {
  padding: 12px;
  border-radius: 8px;
  min-width: 320px;
}

.country-label {
  background: rgba(255,255,255,0.0);
  border: none;
  box-shadow: none;
  padding: 2px 4px;
  font-size: 8px;
  font-weight: 400;
  color: #333;
  pointer-events: none;
}

.map-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 1000;
}

.map-top-center {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2000; 
}

.toggle-group .v-btn__content {
  font-weight: 800;
}

.duration-legend {
  background: rgba(255,255,255,0.92);
  padding: 10px 12px;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  min-width: 170px;
  max-width: 170px;
}

.legend-title {
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 8px;
  color: #333;
}

.legend-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  font-size: 11px;
  color: #444;
}

.legend-point {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  display: inline-block;
  border: 1px solid rgba(255,255,255,0.9);
  flex-shrink: 0;
}

.sni-pie-marker {
  background: transparent;
  border: none;
}

.sni-pie {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.25);
}

.sni-pie.empty {
  background: #d4d4d8;
}

.leaflet-bar .mdi {
  font-size: 18px;
  line-height: 26px;
  color: #14B8A6;
}

.size-legend {
  background: rgba(255,255,255,0.92);
  padding: 10px 12px;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  min-width: 170px;
  max-width: 170px;
}

.size-legend-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  font-size: 11px;
  color: #444;
}

.size-legend-circle {
  display: inline-block;
  border-radius: 50%;
  background: #bebcbc;
  border: 1px solid white;
  opacity: 0.75;
  flex-shrink: 0;
}
</style>