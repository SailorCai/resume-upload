/*
 * @Author: SailorCai
 * @Date: 2020-10-20 15:40:43
 * @LastEditors: SailorCai
 * @LastEditTime: 2020-10-21 20:00:21
 * @FilePath: /resume-upload/src/index.js
 */

 /** 
  * @options 配置对象
  * 
  * 
  */
// exports = module.exports = 
function resumeInit(options) {
  var uploader;
  var preset = {
    uploadUrl: options.uploadUrl,
    method: options.method || 'POST',
  };
  return uploader ? uploader : new Uploader(preset);
};
