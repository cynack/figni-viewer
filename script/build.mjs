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
    API_BASE: JSON.stringify('https://api.figni.io/api'),
    WEBSOCKET_BASE: JSON.stringify('wss://api.figni.io/ws'),
  },
  plugins: [sassPlugin({ type: 'style' })],
}

await esbuild.build(options)
