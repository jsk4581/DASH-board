import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// GitHub Pages serves the repo at /<repo-name>/. In CI, GITHUB_REPOSITORY is
// "owner/repo", so the base auto-matches any fork — no config edit needed.
// In dev (and non-Pages builds) we use '/'.
const repo = process.env.GITHUB_REPOSITORY?.split('/')[1]
const base = process.env.GITHUB_PAGES ? `/${repo ?? 'DASH-board'}/` : '/'

export default defineConfig({
  base,
  plugins: [svelte()],
  server: {
    host: '127.0.0.1',
    port: 5180,
  },
})
