import rimraf from 'rimraf'
import { execSync } from 'child_process'
import { existsSync, mkdirSync } from 'fs'

if (existsSync('./dist/src')) {
  execSync(`cp -rp ./dist/src/* ./dist`, { stdio: 'inherit' })
}

rimraf.sync('./dist/__tests__')
rimraf.sync('./dist/dist')
rimraf.sync('./dist/backend/__tests__')

// copy ./dist into ./src so that frontend tests
// can test the actual built and bundled files
// without TypeScript stumbling over multi-root imports
if (existsSync('./dist')) {
  if (!existsSync('./src/dist')) {
    mkdirSync('./src/dist')
  }
  execSync(`cp -rp ./dist/* ./src/dist`, { stdio: 'inherit' })
}
