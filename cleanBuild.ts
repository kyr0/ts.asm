import rimraf from 'rimraf'
import { execSync } from 'child_process'
import { existsSync } from 'fs'

if (existsSync('./dist/src')) {
  execSync(`cp -rp ./dist/src/* ./dist`, { stdio: 'inherit' })
}

rimraf.sync('./dist/__tests__')
rimraf.sync('./dist/dist')
rimraf.sync('./dist/backend/__tests__')
rimraf.sync('./dist/src')
