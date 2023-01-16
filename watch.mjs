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
  entryPoints: ['src/index.ts'],
  bundle: true,
  minify: true,
  color: true,
  sourcemap: true,
  outfile: 'dist/figni-viewer.min.js',
  define: {
    VERSION: JSON.stringify(process.env.VERSION || ''),
    API_BASE: JSON.stringify('https://api.figni.io/api'),
    WEBSOCKET_BASE: JSON.stringify('wss://api.figni.io/ws'),
  },
  plugins: [
    sassPlugin({ type: 'style' }),
    {
      name: 'on-end',
      setup(build) {
        build.onEnd((error, result) => {
          console.log('----------------------------')
          if (error) {
            console.error(new Date().toLocaleString(), ' watch build failed ')
            if (error.warnings) warningLog(error.warnings)
            if (error.errors) errorLog(error.errors)
          } else {
            if (result) {
              console.log(
                new Date().toLocaleString(),
                ' watch build succeeded '
              )
              if (result.warnings) warningLog(result.warnings)
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