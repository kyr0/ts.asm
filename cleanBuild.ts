import rimraf from 'rimraf'

console.log('rimraf', rimraf.sync)

rimraf.sync('./dist/__tests__')
