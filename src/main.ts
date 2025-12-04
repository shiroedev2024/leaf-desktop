import { createApp } from 'vue';
import App from './App.vue';
import { createPinia } from 'pinia';
import router from './router';
import '@fontsource/roboto/400.css';
import '@mdi/font/css/materialdesignicons.css';
import './assets/css/tailwind.css';
import './assets/styles.css';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');
