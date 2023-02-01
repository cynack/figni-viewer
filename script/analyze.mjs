import fs from 'fs'
import esbuild from 'esbuild'
import { sassPlugin } from 'esbuild-sass-plugin'

const options = {
  entryPoints: {
    'figni-viewer.min': 'src/index.js',
  },
  bundle: true,
  minify: true,
  outdir: 'dist',
  loader: {
    '.yml': 'file',
  },
  assetNames: 'assets/[name]-[hash]',
  define: {
    VERSION: JSON.stringify(process.env.VERSION || ''),
    API_BASE: JSON.stringify('https://api.figni.io/api'),
    WEBSOCKET_BASE: JSON.stringify('wss://api.figni.io/ws'),
    TRANSLATIONS_FILE: JSON.stringify(
      'https://storage.googleapis.com/cynack/figni/viewer/translations.yml'
    ),
  },
  plugins: [sassPlugin({ type: 'style' })],
  metafile: true,
}

const result = await esbuild.build(options)

if (result.metafile) {
  fs.writeFileSync('metadata.json', JSON.stringify(result.metafile))
}
