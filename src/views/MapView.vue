<template>
  <div id="map"></div>
</template>

<script setup>
import { onMounted, nextTick } from 'vue'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'

onMounted(async () => {
    await nextTick()

  const map = L.map('map').setView([51.505, -0.09], 3)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map)

  const res = await fetch('/geojson/countries.geojson')
  const geojson = await res.json()

  L.geoJSON(geojson).addTo(map)

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
</style>