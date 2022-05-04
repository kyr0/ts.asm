import GlobalsPolyfills from '@esbuild-plugins/node-globals-polyfill'
import { build } from 'esbuild'
;(async () => {
  await build({
    entryPoints: ['./src/index.ts'],
    outfile: './dist/index.js',
    format: 'esm',
    sourcemap: true,
    minify: false,
    bundle: true,
    plugins: [
      // @ts-ignore
      GlobalsPolyfills.default({
        process: true,
        buffer: true,
        define: { 'process.env.var': '"hello"' }, // inject will override define, to keep env vars you must also pass define here https://github.com/evanw/esbuild/issues/660
      }),
    ],
  })
})()
