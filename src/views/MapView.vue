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
import { onMounted, nextTick, ref, watch } from 'vue'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Filters from '@/components/Filters.vue'
import { useStore } from '@/stores/company'


const store = useStore()
const company = ref(store.company || 'ssab')

onMounted(async () => {

  await nextTick()

  const map = L.map('map', {
    zoomSnap: 0.5,
    worldCopyJump: true
  }).setView([20, 10], 3)

  // Quiet basemap
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(map)

  // Country polygons with English names
  const res = await fetch('/geojson/countries.geojson')
  const countries = await res.json()

  const countryLayer = L.geoJSON(countries, {
    style: () => ({
      color: '#888',
      weight: 1,
      fillColor: '#ffffff',
      fillOpacity: 0.08
    }),
    onEachFeature: (feature, layer) => {
      const name =
        feature.properties.name_en ||
        feature.properties.ADMIN ||
        feature.properties.NAME_EN ||
        feature.properties.name ||
        'Unknown'

      layer.bindTooltip(name, {
        permanent: true,
        direction: 'center',
        className: 'country-label'
      })

      layer.on({
        mouseover: () => {
          layer.setStyle({
            weight: 2,
            color: '#444',
            fillOpacity: 0.15
          })
        },
        mouseout: () => {
          countryLayer.resetStyle(layer)
        }
      })
    }
  }).addTo(map)

  setTimeout(() => {
    map.invalidateSize()
  }, 100)
})

watch(
  () => store.company,
  (val) => {
    console.log('Company changed:', val)
    // update map here
  }
)
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
  background: rgba(255,255,255,0.7);
  border: none;
  box-shadow: none;
  padding: 2px 4px;
  font-size: 11px;
  font-weight: 600;
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