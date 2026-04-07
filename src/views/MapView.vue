<template>
  <div class="map-wrapper">
    <div id="map"></div>
    <div class="map-panel">
      <Filters />
    </div>
  </div>
</template>

<script setup>
import { onMounted, nextTick, h, render } from 'vue'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Filters from '@/components/Filters.vue'

onMounted(async () => {
  await nextTick()

  const map = L.map('map', {
    zoomSnap: 0.5,
    worldCopyJump: true
  }).setView([20, 10], 2.5)

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
</script>

<style>
html, body, #app {
  margin: 0;
  height: 100%;
}

#map {
  height: 100vh;
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
</style>