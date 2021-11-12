// Generated using webpack-cli https://github.com/webpack/webpack-cli
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const isProduction = process.env.NODE_ENV == 'production';

const config = {
  entry: ['@babel/polyfill', './src/index.js'],
  devServer: {
    open: true,
    host: 'localhost',
    port: 9201,
  },
  module: {
    rules: [{
      test: /\.(js|jsx)$/i,
      use: [{
        loader: 'babel-loader',
        options: {
          plugins: ['@babel/plugin-transform-runtime'],
        },
      }, ],
    }, ],
  },
};

module.exports = () => {
  if (isProduction) {
    Object.assign(config, {
      mode: 'production',
      output: {
        filename: 'figni-viewer.min.js',
        path: path.resolve(__dirname, 'dist'),
      },
    });
  } else {
    Object.assign(config, {
      mode: 'development',
      output: {
        filename: 'figni-viewer.js',
        path: path.resolve(__dirname, '.test'),
      },
      plugins: [
        new HtmlWebpackPlugin({
          template: 'index.html',
        }),
      ],
    });
  }
  return config;
};