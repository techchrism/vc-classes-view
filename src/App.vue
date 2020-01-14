<template>
    <v-app>
        <v-navigation-drawer
                v-model="drawer"
                :clipped="$vuetify.breakpoint.lgAndUp"
                app
        >
            <v-list nav>
                <v-list-item link :to="{name: 'about'}" exact>
                    <v-list-item-icon>
                        <v-icon>mdi-help-box</v-icon>
                    </v-list-item-icon>
                    <v-list-item-content>
                        <v-list-item-title>About</v-list-item-title>
                    </v-list-item-content>
                </v-list-item>

                <v-list-item :to="{name: 'classes'}" exact>
                    <v-list-item-icon>
                        <v-icon>mdi-view-list</v-icon>
                    </v-list-item-icon>
                    <v-list-item-content>
                        <v-list-item-title>Classes</v-list-item-title>
                    </v-list-item-content>
                </v-list-item>

                <v-list-item :to="{name: 'saved'}" exact>
                    <v-list-item-icon>
                        <v-icon>mdi-file-star</v-icon>
                    </v-list-item-icon>
                    <v-list-item-content>
                        <v-list-item-title>Saved</v-list-item-title>
                    </v-list-item-content>
                </v-list-item>

                <v-list-item :to="{name: 'api'}" exact>
                    <v-list-item-icon>
                        <v-icon>mdi-cloud-braces</v-icon>
                    </v-list-item-icon>
                    <v-list-item-content>
                        <v-list-item-title>API</v-list-item-title>
                    </v-list-item-content>
                </v-list-item>

                <v-list-item link href="https://github.com/TheTechdoodle/vc-classes-view" target="_blank">
                    <v-list-item-icon>
                        <v-icon>mdi-github-circle</v-icon>
                    </v-list-item-icon>
                    <v-list-item-content>
                        <v-list-item-title>Source</v-list-item-title>
                    </v-list-item-content>
                </v-list-item>
            </v-list>

            <template v-slot:append>
                <v-row justify="center" class="pb-4">
                    <dark-switch/>
                </v-row>
            </template>
        </v-navigation-drawer>

        <v-app-bar
                app
                :clipped-left="$vuetify.breakpoint.lgAndUp"
                color="primary"
        >
            <v-app-bar-nav-icon @click.stop="drawer = !drawer"></v-app-bar-nav-icon>

            <div class="d-flex align-center">
                <v-toolbar-title>
                    VC Classes View
                </v-toolbar-title>
            </div>
        </v-app-bar>

        <v-content>
            <router-view/>
        </v-content>
    </v-app>
</template>

<script>
    import DarkSwitch from './components/DarkSwitch';

    export default {
        name: 'App',
        components: {
            DarkSwitch
        },
        data: () => ({
            drawer: null
        })
    };
</script>
