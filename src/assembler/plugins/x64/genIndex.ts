import * as fg from 'fast-glob'
import { writeFileSync } from 'fs'

// ts-node --esm genIndex.ts

// __generated
let importStmts = ''
fg.default.sync('./__generated/*.ts').forEach((file) => {
  const moduleName = file.replace(/\.ts$/, '').replace('__generated/', '')
  const exportName = moduleName.replace('./', '')
  importStmts += `export * as ${exportName} from '${moduleName}'\n`
})

writeFileSync('./__generated/index.ts', importStmts)

// mnemonics
importStmts = ''
fg.default.sync('./mnemonics/*.ts').forEach((file) => {
  const moduleName = file.replace(/\.ts$/, '').replace('mnemonics/', '')
  const exportName = moduleName.replace('./', '')
  importStmts += `export * as ${exportName} from '${moduleName}'\n`
})

writeFileSync('./mnemonics/index.ts', importStmts)
