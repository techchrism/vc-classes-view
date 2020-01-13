import Vue from 'vue';
import VueRouter from 'vue-router';
import About from '../views/About.vue';

Vue.use(VueRouter);

const routes = [
    {
        path: '/',
        name: 'about',
        component: About
    },
    {
        path: '/classes',
        name: 'classes',
        component: About
    },
    {
        path: '/saved',
        name: 'saved',
        component: About
    },
    {
        path: '/api',
        name: 'api',
        component: About
    }
];

const router = new VueRouter({
    mode: 'history',
    routes
});

export default router;
