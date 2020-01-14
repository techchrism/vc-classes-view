<template>
    <v-container fill-height>
        <v-col cols="12">
            <v-row align="center" justify="center">
                <v-card class="pa-4" v-if="hasOptions">
                    <v-card-text class="text-center">
                        <v-select label="Campus" :items="campusNames"/>
                        <v-select label="Semester" :items="semesterNames" :value="semesterNames[0]"/>
                        <v-btn color="success">Go</v-btn>
                    </v-card-text>
                </v-card>
                <v-card class="pa-4" v-else>
                    <v-card-title>Loading Options...</v-card-title>
                    <v-card-text class="text-center">
                        <v-progress-circular indeterminate/>
                    </v-card-text>
                </v-card>
            </v-row>
        </v-col>
    </v-container>
</template>

<script>
    export default {
        name: 'Classes',
        data: () => ({

        }),
        computed: {
            hasOptions()
            {
                return this.$store.state.locations.length !== 0;
            },
            campusNames()
            {
                return this.$store.state.locations.map(l => l.name);
            },
            semesterNames()
            {
                return this.$store.state.semesters.map(s => s.name);
            }
        },
        created()
        {
            // Load the options in the store if it hasn't been done already
            // Might be a good idea to automatically generate this data based on the date
            if(!this.hasOptions)
            {
                this.$store.dispatch('fetchOptions');
            }
        }
    };
</script>

<style scoped>

</style>
