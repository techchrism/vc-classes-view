import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

export default new Vuex.Store({
    state: {
        saved: [],
        semesters: [],
        locations: [],
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
        },
        setSemesters(state, semesters)
        {
            state.semesters = semesters;
        },
        setLocations(state, locations)
        {
            state.locations = locations;
        }
    },
    actions: {
        fetchOptions({commit})
        {
            fetch('api/v1/options').then((response) =>
            {
                response.json().then((resData) =>
                {
                    commit('setSemesters', resData.terms);
                    commit('setLocations', resData.locations);
                });
            });
        }
    },
    modules: {}
});
