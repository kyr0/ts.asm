import * as fg from 'fast-glob'
import { writeFileSync } from 'fs'

// ts-node --esm genIndex.ts

// __generated
let importStmts = ''

// @ts-ignore
fg.default.sync('./src/backend/plugins/x64/__generated/*.ts').forEach((file) => {
  const moduleName = file.replace(/\.ts$/, '').replace('src/backend/plugins/x64/__generated/', '')
  const exportName = moduleName.replace('./', '')
  importStmts += `export * as ${exportName} from '${moduleName}'\n`
})

writeFileSync('./src/backend/plugins/x64/__generated/index.ts', importStmts)

// mnemonics
importStmts = ''
// @ts-ignore
fg.default.sync('./src/backend/plugins/x64/mnemonics/*.ts').forEach((file) => {
  const moduleName = file.replace(/\.ts$/, '').replace('src/backend/plugins/x64/mnemonics/', '')
  const exportName = moduleName.replace('./', '')
  importStmts += `export * as ${exportName} from '${moduleName}'\n`
})

writeFileSync('./src/backend/plugins/x64/mnemonics/index.ts', importStmts)
