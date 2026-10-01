import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./tests',workers:1,timeout:45000,
  use:{baseURL:'http://127.0.0.1:4173',browserName:'chromium',viewport:{width:1440,height:1000},reducedMotion:'reduce',trace:'retain-on-failure'},
  webServer:[{command:'node tools/serve.mjs',url:'http://127.0.0.1:4173',reuseExistingServer:true},{command:'node tools/serve.mjs --port 4174 --base-path RYOPO-project-page',url:'http://127.0.0.1:4174/RYOPO-project-page/',reuseExistingServer:true}],
  reporter:'list'
});
