import esbuild from 'esbuild'
import { sassPlugin } from 'esbuild-sass-plugin'

const options = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  minify: true,
  outfile: 'dist/figni-viewer.min.js',
  define: {
    VERSION: JSON.stringify(process.env.VERSION || ''),
    API_BASE: JSON.stringify('https://api.figni.io/api'),
    WEBSOCKET_BASE: JSON.stringify('wss://api.figni.io/ws'),
  },
  plugins: [sassPlugin({ type: 'style' })],
}

await esbuild.build(options)
