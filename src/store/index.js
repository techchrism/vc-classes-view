import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

export default new Vuex.Store({
    state: {
        saved: [],
        classes: [],
        offlineMeta: []
    },
    mutations: {
        removeOfflineMeta(state, id)
        {
            state.offlineMeta = state.offlineMeta.filter((item) =>
            {
                return item.id !== id;
            });
        },
        setClasses(state, classes)
        {
            state.classes = classes;
        }
    },
    actions: {},
    modules: {}
});
