import esbuild from 'esbuild'
import { sassPlugin } from 'esbuild-sass-plugin'

const warningLog = (warning) => {
  warning.forEach((warn) => {
    console.error('warning: ', warn.text)
    console.error('detail: ', warn.detail)
    console.error(
      'path: ',
      `${warn.location.file}:${warn.location.line}:${warn.location.column}`
    )
    console.error(' -> ', warn.location.lineText)
  })
}
const errorLog = (errors) => {
  errors.forEach((err) => {
    console.error('error: ', err.text)
    console.error(
      'path: ',
      `${err.location.file}:${err.location.line}:${err.location.column}`
    )
    console.error(' -> ', err.location.lineText)
  })
}

const ctx = await esbuild.context({
  entryPoints: ['src/index.js'],
  outfile: 'test/js/figni-viewer.min.js',
  bundle: true,
  minify: true,
  color: true,
  sourcemap: true,
  define: {
    VERSION: JSON.stringify(process.env.VERSION || ''),
    API_BASE: JSON.stringify('https://api.stg.figni.io/api'),
    WEBSOCKET_BASE: JSON.stringify('wss://api.stg.figni.io/ws'),
  },
  loader: {
    '.yml': 'text',
    '.json': 'text',
  },
  plugins: [
    sassPlugin({ type: 'style' }),
    {
      name: 'on-end',
      setup(build) {
        build.onEnd((result) => {
          console.log('----------------------------')
          if (result.errors.length > 0) {
            console.error(new Date().toLocaleString(), ' watch build failed ')
            if (result.warnings.length) {
              result.warnings.forEach((warn) => {
                warningLog(warn)
              })
            }
            if (result.errors.length) {
              result.errors.forEach((err) => {
                errorLog(err)
              })
            }
          } else {
            console.log(new Date().toLocaleString(), ' watch build succeeded ')
            if (result.warnings.length) {
              result.warnings.forEach((warn) => {
                warningLog(warn)
              })
            }
          }
        })
      },
    },
  ],
})

try {
  console.log('============================')
  console.log('Compile start... ', new Date().toLocaleDateString())
  await ctx.watch()
} catch (err) {
  console.error(JSON.stringify(err, null, 2))
}
