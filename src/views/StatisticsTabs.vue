<template>
    <div class="tabs">
        <v-sheet elevation="0">
            <v-tabs v-model="tab" color="primary">
                <v-tab value="one">Duration</v-tab>
                <v-tab value="two">Workforce</v-tab>
                <v-tab value="three" v-if="!store.country">By country</v-tab>
            </v-tabs>

            <v-divider></v-divider>

            <v-tabs-window v-model="tab">
                <v-tabs-window-item value="one">
                <v-sheet class="pa-5"><ChartDuration /></v-sheet>
                </v-tabs-window-item>
                <v-tabs-window-item value="two">
                <v-sheet class="pa-5"><ChartYearly /></v-sheet>
                </v-tabs-window-item>
                <v-tabs-window-item value="three" v-if="!store.country">
                <v-sheet class="pa-5"><ChartCountry /></v-sheet>
                </v-tabs-window-item>
            </v-tabs-window>
        </v-sheet>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import ChartYearly from '@/components/ChartYearly.vue';
import ChartDuration from '@/components/ChartDuration.vue';
import ChartCountry from '@/components/ChartCountry.vue';
import { useStore } from '@/stores/company'

const tab = ref('one')

const store = useStore()
</script>

<style scoped>
.tabs {
  max-width: 100%;
  margin: 0 auto;
}
</style>