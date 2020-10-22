/*
 * @Author: SailorCai
 * @Date: 2020-10-22 00:22:38
 * @LastEditors: SailorCai
 * @LastEditTime: 2020-10-22 09:56:57
 * @FilePath: /resume-upload/demo/index.js
 */
// import upload from '../src/index.js';
const resumeInit  = require('../src/index.js');

console.log(resumeInit);
var uploader = resumeInit({
  uploadUrl: '/uploadfile',
});

var fileInput = document.getElementById('fileInput');
var file;
fileInput.onchange = function(e) {
  console.log(e.target.files[0]);
  file = e.target.files[0];
  uploader.upload(file);
}

