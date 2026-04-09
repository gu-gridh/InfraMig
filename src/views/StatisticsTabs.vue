<template>
    <div class="tabs">
        <v-sheet elevation="0">
            <v-tabs v-model="tab" color="primary">
                <v-tab value="one">Workforce</v-tab>
                <v-tab value="two">Item Two</v-tab>
                <v-tab value="three">Item Three</v-tab>
            </v-tabs>

            <v-divider></v-divider>

            <v-tabs-window v-model="tab">
                <v-tabs-window-item value="one">
                <v-sheet class="pa-5"><ChartYearly /></v-sheet>
                </v-tabs-window-item>
                <v-tabs-window-item value="two">
                <v-sheet class="pa-5">Two</v-sheet>
                </v-tabs-window-item>
                <v-tabs-window-item value="three">
                <v-sheet class="pa-5">Three</v-sheet>
                </v-tabs-window-item>
            </v-tabs-window>
        </v-sheet>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import ChartYearly from '@/components/ChartYearly.vue';

const tab = ref('one')
</script>

<style scoped>
.tabs {
  max-width: 100%;
  margin: 0 auto;
}
</style>