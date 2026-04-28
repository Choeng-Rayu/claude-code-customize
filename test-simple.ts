console.error('HELLO FROM SIMPLE SCRIPT')
setTimeout(() => {
  console.error('TIMEOUT FIRED')
  process.exit(0)
}, 2000)
