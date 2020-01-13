<template>
    <v-switch v-model="$vuetify.theme.dark" :append-icon="icon" hide-details label="Dark Mode"/>
</template>

<script>
    export default {
        name: 'DarkSwitch',
        computed: {
            icon()
            {
                return 'mdi-' + (this.$vuetify.theme.dark ? 'weather-night' : 'white-balance-sunny');
            }
        },
        watch: {
            '$vuetify.theme.dark': function(dark)
            {
                //TODO save dark mode
            }
        }
    };
</script>

<style scoped>

</style>
