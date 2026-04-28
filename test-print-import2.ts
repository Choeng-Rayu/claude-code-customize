console.error('Test2: starting import of src/cli/print.js')
try {
  const m = await import('src/cli/print.js')
  console.error('Test2: import succeeded', Object.keys(m))
} catch (e) {
  console.error('Test2: import error:', e)
}
setTimeout(() => process.exit(0), 1000)
