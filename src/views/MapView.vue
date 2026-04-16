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

let point;

onMounted(async () => {

  await nextTick()

  const map = L.map('map', {
    zoomSnap: 0.5,
    worldCopyJump: true,
    minZoom: 2,
    maxBounds: [
      [-90, -180],
      [90, 180]
    ],
    maxBoundsViscosity: 1.0
  }).setView([30, 3], 3)

  // Create panes with explicit z-index
  
  // Polygons
  map.createPane('countriesPane');
  map.getPane('countriesPane').style.zIndex = 200;
  // Country labels
  map.createPane('countryLabelsPane');
  map.getPane('countryLabelsPane').style.zIndex = 300;
  // Points
  map.createPane('pointsPane');
  map.getPane('pointsPane').style.zIndex = 400;

  //basemap
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 20,
    noWrap: true
  }).addTo(map)

  //countries avaliable in the data below
  const presentCountries = new Set([
  "FIN","NLD","GBR","USA","CZE","LTU","DEU","POL","ZAF","HKG",
  "ESP","ROU","IRL","LVA","ITA","CYP","SVK","EST","DNK","IND",
  "NOR","SGP","CHE","BEL","CAN","HUN","PRT","FRA","HRV","SVN",
  "AUT","LUX"
]);

const res = await fetch('/geojson/countries.geojson');
const countries = await res.json();

const countryLayer = L.geoJSON(countries, {
  pane: 'countriesPane',
  style: () => ({
    color: '#888',
    weight: 1,
    fillColor: '#ffffff',
    fillOpacity: 0.08
  }),

  onEachFeature: (feature, layer) => {
    const props = feature.properties || {};

    const countryCode =
      props.ADM0_A3_US ||
      props.ISO_A3 ||
      props.ADM0_A3 ||
      props.gu_a3 ||
      props.GU_A3;

    const name =
      props.name_en ||
      props.ADMIN ||
      props.NAME_EN ||
      props.name ||
      'Unknown';

    const center = layer.getBounds().getCenter();

    if (presentCountries.has(countryCode)) {
  // Special case for France
  if (countryCode === 'FRA') {
    L.marker([46.5, 2.5], {
      pane: 'countryLabelsPane',
      interactive: false,
      icon: L.divIcon({
        className: 'country-label-marker',
        html: `<div class="country-label">France</div>`
      })
    }).addTo(map);
  } else {
    layer.bindTooltip(name, {
      permanent: true,
      direction: 'center',
      className: 'country-label',
      pane: 'countryLabelsPane'
    });
  }
}
  }
}).addTo(map);

 
  point = L.circleMarker(company.value === 'ssab' ? [65.56347, 22.19981] : [65.805389, 21.75914], {
    pane: 'pointsPane',
    radius: 6,
    fillColor: '#14B8A6',
    color: '#14B8A6',
    weight: 2,
    opacity: 1,
    fillOpacity: 0.9
  }).addTo(map)

  setTimeout(() => {
    map.invalidateSize()
  }, 100)

  //add geojson point layer
  const pointRes = await fetch('/geojson/stegra/stegra.geojson');
const pointsData = await pointRes.json();

// keep only one feature per country
const seenCountries = new Set();
const uniqueCountryFeatures = pointsData.features.filter((feature) => {
  const country = feature.properties?.country_en;
  if (!country || seenCountries.has(country)) return false;
  seenCountries.add(country);
  return true;
});

// find max country_count
const counts = uniqueCountryFeatures.map(f => Number(f.properties?.country_count) || 1);
const maxCount = Math.max(...counts, 1);

// radius scaling between minRadius and maxRadius
function getRadius(count) {
  const n = Number(count) || 1;
  const minRadius = 4;
  const maxRadius = 14;

  return minRadius + (Math.sqrt(n) / Math.sqrt(maxCount)) * (maxRadius - minRadius);
}

L.geoJSON(
  {
    ...pointsData,
    features: uniqueCountryFeatures
  },
  {
    pane: 'pointsPane',
    pointToLayer: (feature, latlng) => {
      const count = feature.properties?.country_count ?? 1;

      return L.circleMarker(latlng, {
        radius: getRadius(count),
        fillColor: '#2563EB',
        color: '#ffffff',
        weight: 1,
        opacity: 1,
        fillOpacity: 0.65
      });
    },
    onEachFeature: (feature, layer) => {
      const props = feature.properties || {};
      const country = props.country_en || 'Unknown country';
      const count = props.country_count || 1;

      layer.bindPopup(`
        <strong>${country}</strong><br>
        Count: ${count}
      `);
    }
  }
).addTo(map);
})



watch(
  () => store.company,
  (val) => {
    if (!point) return
    // update factory location
    point.setLatLng(val === 'ssab' ? [65.56347, 22.19981] : [65.805389, 21.75914])
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