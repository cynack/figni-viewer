import fs from 'fs'
import esbuild from 'esbuild'
import { sassPlugin } from 'esbuild-sass-plugin'

const options = {
  entryPoints: ['src/index.js'],
  outfile: 'dist/figni-viewer.min.js',
  bundle: true,
  minify: true,
  loader: {
    '.yml': 'text',
    '.json': 'text',
  },
  define: {
    VERSION: JSON.stringify('development'),
    API_BASE: JSON.stringify('https://api.stg.figni.io/api'),
    WEBSOCKET_BASE: JSON.stringify('wss://api.stg.figni.io/ws'),
  },
  plugins: [sassPlugin({ type: 'style' })],
  metafile: true,
}

const result = await esbuild.build(options)

if (result.metafile) {
  fs.writeFileSync('metadata.json', JSON.stringify(result.metafile))
}
