<template>
    <v-app>
        <v-app-bar
                app
                color="primary"
                dark
        >
            <div class="d-flex align-center">
                <v-toolbar-title>VC Classes View</v-toolbar-title>
            </div>

            <v-spacer/>

            <dark-switch/>
        </v-app-bar>

        <v-content>
            <HelloWorld/>
        </v-content>
    </v-app>
</template>

<script>
    import HelloWorld from './components/HelloWorld';
    import DarkSwitch from './components/DarkSwitch';

    export default {
        name: 'App',

        components: {
            DarkSwitch,
            HelloWorld
        },

        data: () => ({
            //
        })
    };
</script>
