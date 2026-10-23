import {defineConfig,devices} from '@playwright/test';
export default defineConfig({testDir:'./e2e',reporter:'list',use:{baseURL:'http://127.0.0.1:4200',trace:'retain-on-failure'},projects:[{name:'chromium',use:{...devices['Desktop Chrome']}}],webServer:{command:'npm start',url:'http://127.0.0.1:4200',reuseExistingServer:!process.env.CI,timeout:120000}});
