import { mount } from 'svelte'
import './app.css'
import { hydrate } from './lib/platform.js'

// In the store app the board lives in a file; pull it into localStorage before
// the store module (which reads localStorage synchronously) is first imported.
hydrate()
  .then(() => import('./App.svelte'))
  .then(({ default: App }) => mount(App, { target: document.getElementById('app') }))
