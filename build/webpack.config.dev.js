/*
 * @Author: SailorCai
 * @Date: 2020-10-21 22:02:54
 * @LastEditors: SailorCai
 * @LastEditTime: 2020-10-24 22:00:12
 * @FilePath: /resume-upload/build/webpack.config.dev.js
 */
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin')
module.exports = {
  entry: './demo/index.js',
  output: {
    path: path.resolve(__dirname, '../', 'dist'),
    filename: 'resume-upload.js',
  },
  module: {
    rules: [
      {test: /\\.js$/, use: 'babel-loader'},
    ]
  },
  devServer: {
    contentBase: path.join(__dirname, '../','dist'),
    compress: true,
    port: 9000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:7001',
        pathRewrite: {
          '^/api': ''
        }
      }
    }
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './demo/index.html',
      inject: 'body',
    })
  ]
}