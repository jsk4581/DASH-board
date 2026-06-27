<script>
  // Lightweight inline icon set (lucide-style, 24x24 stroke).
  let { name, size = 18, fill = false, strokeWidth = 2 } = $props()

  // Each entry is an array of <path d>; 'grip' is special (dots).
  const PATHS = {
    plus: ['M5 12h14', 'M12 5v14'],
    check: ['M20 6 9 17l-5-5'],
    star: ['M12 2.5l2.9 5.88 6.49.95-4.7 4.58 1.11 6.46L12 17.3l-5.8 3.07 1.1-6.46-4.69-4.58 6.49-.95L12 2.5z'],
    calendar: ['M8 2v3', 'M16 2v3', 'M3.5 8.5h17', 'M4 4.5h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1z'],
    trash: ['M3 6h18', 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2', 'M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6'],
    x: ['M18 6 6 18', 'M6 6l12 12'],
    sun: ['M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z', 'M12 1v2', 'M12 21v2', 'M4.2 4.2l1.4 1.4', 'M18.4 18.4l1.4 1.4', 'M1 12h2', 'M21 12h2', 'M4.2 19.8l1.4-1.4', 'M18.4 5.6l1.4-1.4'],
    moon: ['M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z'],
    download: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3'],
    upload: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M17 8l-5-5-5 5', 'M12 3v12'],
    eye: ['M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'],
    pencil: ['M12 20h9', 'M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z'],
    gantt: ['M4 6h9', 'M8 12h12', 'M4 18h7'],
    undo: ['M9 14 4 9l5-5', 'M4 9h11a4.5 4.5 0 0 1 0 9h-4'],
    redo: ['M15 14l5-5-5-5', 'M20 9H9a4.5 4.5 0 0 0 0 9h4'],
    grid: ['M4 4.5h16a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1z', 'M3 9.5h18', 'M9 9.5v10'],
    chevron: ['M9 6l6 6-6 6'],
    globe: ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M2 12h20', 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z'],
    cloud: ['M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z'],
    refresh: ['M21 12a9 9 0 1 1-2.64-6.36', 'M21 3v5h-5'],
  }

  const dots = [
    [9, 6], [9, 12], [9, 18],
    [15, 6], [15, 12], [15, 18],
  ]
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill={fill && name === 'star' ? 'currentColor' : 'none'}
  stroke="currentColor"
  stroke-width={strokeWidth}
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  {#if name === 'grip'}
    {#each dots as [cx, cy]}
      <circle {cx} {cy} r="1.3" fill="currentColor" stroke="none" />
    {/each}
  {:else}
    {#each PATHS[name] ?? [] as d}
      <path {d} />
    {/each}
  {/if}
</svg>

<style>
  svg {
    display: block;
    flex: none;
  }
</style>
