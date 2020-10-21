/*
 * @Author: SailorCai
 * @Date: 2020-10-19 11:34:38
 * @LastEditors: SailorCai
 * @LastEditTime: 2020-10-21 19:06:35
 * @FilePath: /resume-upload/src/lib/Uploader.js
 */
class Uploader {
  constructor(options) {
    this.uploadUrl = options.uploadUrl;
    this.method = options.method;
    this.hashProgress = 0;
  }
  upload(file) {
    this.file = file;
    this.uploadFile();
  }
  isImage(file) {
    // 通过文件流来判定
    // 先判定是不是gif
    return this.isGif(file) || this.isPng(file) || this.isJpg(file);
  }
  async blobToString(blob) {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = function() {
        console.log(reader.result);
        const ret = reader.result
          .split("")
          .map(v => v.charCodeAt())
          .map(v => v.toString(16).toUpperCase())
          .join("");
        // const ret = reader.
        resolve(ret);
      };
      reader.readAsBinaryString(blob);
    });
  }
  async isGif(file) {
    // GIF89a 和GIF87a
    // 前面6个16进制， '47 49 46 38 39 61', '47 49 46 38 37 61'
    // 16进制的转换
    const ret = await this.blobToString(file.slice(0, 6));
    const isGif = ret === "47 49 46 38 39 61" || ret === "47 49 46 38 37 61";
    return isGif;
  }
  async isPng(file) {
    const ret = await this.blobToString(file.slice(0, 8));
    const isPng = ret === "89 50 4E 47 0d 0A 1A 0A";
    return isPng;
  }
  async isJpg(file) {
    const len = file.size;
    const start = await this.blobToString(file.slice(0, 2));
    const tail = await this.blobToString(file.slice(-2, len));
    const isJpg = start === "FF D8" && tail === "FF D9";
    return isJpg;
  }
  createFileChunk(file, size = CHUNK_SIZE) {
    const chunks = [];
    let cur = 0;
    while (cur < this.file.size) {
      chunks.push({ index: cur, file: this.file.slice(cur, cur + size) });
      cur += size;
    }
    return chunks;
  }
  async calculateHashWorker() {
    return new Promise(resolve => {
      this.worker = new Worker("/hash.js");
      this.worker.postMessage({ chunks: this.chunks });
      this.worker.onmessage = e => {
        const { progress, hash } = e.data;
        this.hashProgress = Number(progress.toFixed(2));
        if (hash) {
          resolve(hash);
        }
      };
    });
  }
  async calculateHashIdle() {
    const chunks = this.chunks;
    return new Promise((resolve, reject) => {
      const spark = new SparkMD5.ArrayBuffer();
      let count = 0;

      const appendToSaprk = async file => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsArrayBuffer(file);
          reader.onload = e => {
            spark.append(e.target.result);
            resolve();
          };
        });
      };
      const workLoop = async deadline => {
        while (count < chunks.length && deadline.timeRemaining() > 1) {
          // 空闲时间，且有任务
          await appendToSaprk(chunks[count].file);
          count++;
          if (count < chunks.length) {
            this.hashProgress = Number(
              ((100 * count) / chunks.length).toFixed(2)
            );
          } else {
            this.hashProgress = 100;
            resolve(spark.end());
          }
        }
        window.requestIdleCallback(workLoop);
      };
      window.requestIdleCallback(workLoop);
    });
  }
  async calculateHashSample() {
    return new Promise(resolve => {
      const spark = new SparkMD5.ArrayBuffer();
      const reader = new FileReader();

      const file = this.file;
      const size = file.size;
      const offset = 2 * 1024 * 1024;
      // 第一个2M，最后一个区块数据全要
      let chunks = [file.slice(0, offset)];

      let cur = offset;
      while (cur < size) {
        if (cur + offset >= size) {
          // 最后一个区块全取
          chunks.push(file.slice(cur, cur + offset));
        } else {
          // 中间的区块
          const mid = cur + offset / 2;
          const end = cur + offset;
          chunks.push(file.slice(cur, cur + 2));
          chunks.push(file.slice(cur, mid + 2));
          chunks.push(file.slice(end - 2, end));
        }
        cur += offset;
      }
      // 中间的，取前中后各两个字节
      reader.readAsArrayBuffer(new Blob(chunks));
      reader.onload = e => {
        spark.append(e.target.result);
        this.hashProgress = 100;
        resolve(spark.end());
      };
    });
  }
  async uploadFile() {
    /* if(!await this.isImage(this.file)) {
      console.log('文件格式不对')
      return
    }else{
      console.log('格式正确')
    } */
    if (!this.file) {
      return
    }
    const chunks = this.createFileChunk(this.file);
    // const hash = await this.calculateHashWorker()
    let hash;
    if(window.requestIdleCallback) {
      hash = await this.calculateHashIdle()
    }else{
      hash = await this.calculateHashSample();
    };
    
    this.hash = hash;

    // 问下后端，文件是否上传成功，如果没有，是否有存在的切片
    const {
      data: { uploaded, uploadedList }
    } = await this.$http.post("/checkfile", {
      hash: this.hash,
      ext: this.file.name.split(".").pop()
    });

    if (uploaded) {
      // 秒传
      return this.$message.success("秒传成功");
    }

    // console.log('文件hash：', hash)
    // console.log('文件hash1：', hash1)
    // console.log('文件hash2：', hash2)

    // 抽样hash 不算全量
    // 布隆过滤器 损失一部分的精度， 换取效率

    this.chunks = chunks.map((chunk, index) => {
      // 切片的名字 hash+index
      const name = hash + "-" + index;
      return {
        hash,
        name,
        index,
        chunk: chunk.file,
        // 设置进度条， 已经上传的，设置为100
        progress: uploadedList.indexOf(name) > -1 ? 100 : 0
      };
    });
    await this.uploadChunks(uploadedList);
  }
  async uploadChunks(uploadedList) {
    const requests = this.chunks
      .filter(chunk => uploadedList.indexOf(chunk.name) === -1)
      .map((chunk, index) => {
        // 转成promise
        const form = new FormData();
        form.append("chunk", chunk.chunk);
        form.append("hash", chunk.hash);
        form.append("name", chunk.name);
        // form.append('index', chunk.index)
        return { form, index: chunk.index, error: 0 };
      });
    // .map(({form, index}) => this.$http.post('/uploadfile', form, {
    //   onUploadProgress: progress => {
    //     // 不是整体的进度条，而是每个区块有自己的进度条，整体的进度条需要计算出来
    //     this.chunks[index].progress = Number(((progress.loaded/progress.total)*100).toFixed(2))
    //     console.log('progress', this.chunks[index].progress);
    //     console.log(this.chunks[index]);
    //   }
    // }))
    // todo 并发控制
    // 尝试申请tcp连接过多，也会造成卡顿
    // 异步的并发控制，
    // await Promise.all(requests)
    await this.sendRequest(requests);
    await this.mergeRequest();
    // await this.uploadChunks()
    // const form = new FormData()
    // form.append('name', 'file')
    // form.append('file', this.file)
    // const ret = await this.$http.post('/uploadfile', form, {
    //   onUploadProgress: progress=> {
    //     this.uploadProgress = Number(((progress.loaded/progress.total)*100).toFixed(2))
    //   }
    // })
  }
  // TCP慢启动，先上传一个出事区块，比如10kb，根据上传成功时间，决定下一个区块是20k，还是50k
  // 再下一个一样的逻辑，可能变成100K，200k，或者2k
  
  // 上传可能报错
  // 报错之后，进度条变红，开始重试
  // 一个切片重试失败三次，集体全部终止
  async sendRequest(chunks, limit = 3) {
    // limit是并发数
    // 一个数组，长度是limit
    return new Promise((resolve, reject) => {
      const len = chunks.length
      let count = 0
      let isStop = false

      const start = async () => {
        if(isStop) {
          return
        }
        const task = chunks.shift();
        if (task) {
          const { form, index } = task;

          try{
            await this.$http.post("/uploadfile", form, {
              onUploadProgress: progress => {
                // 不是整体的进度条，而是每个区块有自己的进度条，整体的进度条需要计算出来
                this.chunks[index].progress = Number(
                  ((progress.loaded / progress.total) * 100).toFixed(2)
                );
                console.log("progress", this.chunks[index].progress);
                console.log(this.chunks[index]);
              }
            });
            if (count === len - 1) {
              // 最后一个任务
              resolve();
            } else {
              count++;
              // 启动下一个任务
              start();
            }

          }catch(e) {
            this.chunks[index].progress = -1
            if(task.error < 3){
              task.error++
              chunks.unshift(task)
              start()
            }else{
              // 错误三次
              isStop = true
              reject()
            }
          }

        }
      };

      while (limit > 0) {
        // 启动limit个任务
        start();
        limit -= 1;
      }
    });
  }
  mergeRequest() {
    this.$http.post("/mergefile", {
      ext: this.file.name.split(".").pop(),
      size: CHUNK_SIZE,
      hash: this.hash
    });
  }
  handleFileChange(e) {
    const [file] = e.target.files;
    console.log(file);
    if (!file) return;
    this.file = file;
  }
}
module.exports = Uploader;