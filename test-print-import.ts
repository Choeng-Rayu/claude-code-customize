console.error('Test: starting import of print.ts')
try {
  const m = await import('./src/cli/print.js')
  console.error('Test: import succeeded', Object.keys(m))
} catch (e) {
  console.error('Test: import error:', e)
}
