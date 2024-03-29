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
    VERSION: JSON.stringify(process.env.VERSION || ''),
    API_BASE: JSON.stringify(process.env.API_BASE || ''),
    WEBSOCKET_BASE: JSON.stringify(process.env.WEBSOCKET_BASE || ''),
  },
  plugins: [sassPlugin({ type: 'style' })],
}

await esbuild.build(options)
