<template>
  <div id="map" style="height: 100vh;"></div>
</template>

<script setup>
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
const map = L.map('map').setView([51.505, -0.09], 13)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map)
L.marker([51.5, -0.09]).addTo(map)
  .bindPopup('A pretty CSS3 popup.<br> Easily customizable.')
  .openPopup()  


</script>
<style scoped>

</style>