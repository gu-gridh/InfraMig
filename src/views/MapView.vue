<template>
  <div class="map-wrapper">
    <div id="map"></div>
    <div class="map-top-center">
      <v-btn-toggle rounded="small" mandatory border v-model="store.company" class="toggle-group" color="primary">
        <v-btn value="ssab">SSAB</v-btn>
        <v-btn value="stegra">Stegra</v-btn>
      </v-btn-toggle>
    </div>
    <div class="map-panel">
      <Filters />
    </div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Filters from '@/components/Filters.vue'
import { useStore } from '@/stores/company'

const store = useStore()

let map = null
let countriesData = null

let factoryPoint = null
let companyGeoJsonLayer = null
let countriesLayer = null
let countryLabelsLayer = null
let activeCompanyRequest = null

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

function buildPresentCountryLookup(pointsData) {
  const codes = new Set()
  const names = new Set()

  for (const feature of pointsData.features ?? []) {
    const props = feature.properties || {}
    const code = extractCountryCode(props)
    const name = extractCountryName(props)

    if (code) codes.add(String(code).toUpperCase())
    if (name) names.add(normalizeName(name))
  }

  return { codes, names }
}

function isCountryPresent(countryLookup, countryProps = {}) {
  const code = extractCountryCode(countryProps)
  const name = extractCountryName(countryProps)

  return (
    (code && countryLookup.codes.has(String(code).toUpperCase())) ||
    (name && countryLookup.names.has(normalizeName(name)))
  )
}

function updateFactoryPoint(company) {
  if (!factoryPoint) return
  factoryPoint.setLatLng(getCompanyConfig(company).factoryLatLng)
}

async function fetchJson(url, signal) {
  const res = await fetch(url, signal ? { signal } : undefined)
  if (!res.ok) {
    throw new Error(`Failed to load ${url}`)
  }
  return res.json()
}

function renderCountries(countryLookup) {
  countriesLayer?.remove()
  countryLabelsLayer?.remove()

  countryLabelsLayer = L.layerGroup().addTo(map)

  const addedOverrideLabels = new Set()

  countriesLayer = L.geoJSON(countriesData, {
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

      const override = code ? COUNTRY_LABEL_OVERRIDES[code] : null

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
          }).addTo(countryLabelsLayer)
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
  }).addTo(map)
}

function buildCompanyLayer(pointsData) {
  const seenCountries = new Set()

  const uniqueCountryFeatures = (pointsData.features ?? []).filter((feature) => {
    const props = feature.properties || {}
    const key = extractCountryCode(props) || normalizeName(extractCountryName(props))

    if (!key || seenCountries.has(key)) return false
    seenCountries.add(key)
    return true
  })

  const counts = uniqueCountryFeatures.map(
    (feature) => Number(feature.properties?.country_count) || 1
  )
  const maxCount = Math.max(...counts, 1)

  function getRadius(count) {
    const n = Number(count) || 1
    const minRadius = 4
    const maxRadius = 14

    return minRadius + (Math.sqrt(n) / Math.sqrt(maxCount)) * (maxRadius - minRadius)
  }

  return L.geoJSON(
    {
      ...pointsData,
      features: uniqueCountryFeatures
    },
    {
      pane: 'pointsPane',
      pointToLayer: (feature, latlng) => {
        const count = feature.properties?.country_count ?? 1

        return L.circleMarker(latlng, {
          radius: getRadius(count),
          fillColor: '#2563EB',
          color: '#ffffff',
          weight: 1,
          opacity: 1,
          fillOpacity: 0.65
        })
      },
      onEachFeature: (feature, layer) => {
        const props = feature.properties || {}
        const country = extractCountryName(props) || 'Unknown country'
        const count = props.country_count || 1

        layer.bindPopup(`
          <strong>${country}</strong><br>
          Count: ${count}
        `)
      }
    }
  )
}

async function refreshCompany(company) {
  if (!map || !countriesData || !factoryPoint) return

  activeCompanyRequest?.abort()
  const controller = new AbortController()
  activeCompanyRequest = controller

  updateFactoryPoint(company)

  try {
    const { file } = getCompanyConfig(company)
    const pointsData = await fetchJson(file, controller.signal)

    if (activeCompanyRequest !== controller) return

    const countryLookup = buildPresentCountryLookup(pointsData)

    renderCountries(countryLookup)

    companyGeoJsonLayer?.remove()
    companyGeoJsonLayer = buildCompanyLayer(pointsData).addTo(map)
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('Failed to load company GeoJSON:', error)
    }
  }
}

watch(
  () => store.company,
  (company) => {
    refreshCompany(company)
  }
)

onMounted(async () => {
  await nextTick()

  map = L.map('map', {
    zoomSnap: 0.5,
    worldCopyJump: true,
    minZoom: 1,
    maxBounds: [
      [-90, -180],
      [90, 180]
    ],
    maxBoundsViscosity: 1.0
  }).setView([30, 3], 3)

  map.createPane('countriesPane')
  map.getPane('countriesPane').style.zIndex = 200

  map.createPane('countryLabelsPane')
  map.getPane('countryLabelsPane').style.zIndex = 300

  map.createPane('pointsPane')
  map.getPane('pointsPane').style.zIndex = 400

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 20,
    noWrap: true
  }).addTo(map)

  countriesData = await fetchJson('/geojson/countries.geojson')

  factoryPoint = L.circleMarker(getCompanyConfig(store.company).factoryLatLng, {
    pane: 'pointsPane',
    radius: 6,
    fillColor: '#14B8A6',
    color: '#14B8A6',
    weight: 2,
    opacity: 1,
    fillOpacity: 0.9
  }).addTo(map)

  await refreshCompany(store.company)

  setTimeout(() => {
    map.invalidateSize()
  }, 100)
})

onBeforeUnmount(() => {
  activeCompanyRequest?.abort()
  companyGeoJsonLayer?.remove()
  countriesLayer?.remove()
  countryLabelsLayer?.remove()
  factoryPoint?.remove()
  map?.remove()
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

</style>