import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// GitHub Pages serves the repo at /<repo-name>/. In dev we use '/'.
const base = process.env.GITHUB_PAGES ? '/DASH-board/' : '/'

export default defineConfig({
  base,
  plugins: [svelte()],
  server: {
    host: '127.0.0.1',
    port: 5180,
  },
})
