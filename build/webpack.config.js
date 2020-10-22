/*
 * @Author: SailorCai
 * @Date: 2020-10-21 22:02:54
 * @LastEditors: SailorCai
 * @LastEditTime: 2020-10-22 00:24:54
 * @FilePath: /resume-upload/build/webpack.config.js
 */
const path = require('path');
module.exports = {
  entry: './src/index.js',
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
    
  }
}