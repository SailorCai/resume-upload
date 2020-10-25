/*
 * @Author: SailorCai
 * @Date: 2020-10-22 00:22:38
 * @LastEditors: SailorCai
 * @LastEditTime: 2020-10-23 10:10:49
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

function testTask() {
  setTimeout(() => {
    console.log(1);
  }, 300);
  // Promise.resolve().then(() => {
  //   console.log(2)
  // }).then(() => {
  //   console.log(3);
  // });
  new Promise(resolve => {
    new Promise(resolve => {
      console.log(0);
      resolve();
    });
    resolve();
    console.log(2);
  }).then(() => {
    console.log(3)
  });
  console.log(4);
};

testTask();