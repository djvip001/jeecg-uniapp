<template>
  <view class='t-toptips' :style="{top: top,background: cubgColor}" :class="[show?'t-top-show':'']">
    <view v-if="loading" class="flex flex-sub">
      <view class="cu-progress flex-sub round striped active sm">
        <view :style="{ background: color,width: value + '%'}"></view>
      </view>
      <text class="margin-left">{{value}}%</text>
    </view>
    <block v-else>{{msg}}</block>
    <!-- #ifdef H5 -->
    <view ref="input" class="input"></view>
    <!-- #endif -->
  </view>
  <!-- 文件名确认对话框 -->
  <FileNameDialog
    v-if="showFileNameDialog"
    :fileName="pendingFileInfo.fileName"
    :fileSize="pendingFileInfo.fileSize"
    :sendModalTitle="sendModalTitle"
    :sendModalBtnText="sendModalBtnText"
    @confirm="handleConfirmFileName"
    @cancel="handleCancelFileName"
  />
</template>

<script lang="ts" setup>
import { ref, nextTick } from 'vue'
import {useToast} from "wot-design-uni";
import {http} from "@/utils/http";
import { isApp, isH5, isMp, isHarmony } from '@/utils/platform'
import FileNameDialog from './FileNameDialog.vue'
defineOptions({
  name: 'LFile',
  options: {
    // apply-shared‌：当前页面样式会影响到子组件样式.(小程序)
    // shared‌：当前页面样式影响到子组件，子组件样式也会影响到当前页面.(小程序)
    styleIsolation: 'shared',
  },
})
const props = defineProps({
  top: {
    type: String,
    default: 'auto'
  },
  bgColor: {
    type: String,
    default: 'rgba(49, 126, 243, 0.5)',
  },
  color: {
    type: String,
    default: '#e54d42',
  },
  type: {
    type: String,
    default: 'file'
  },
  // 是否需要确认文件名，为true时需要 传入fileNameKey
  confirmFileName: {
    type: Boolean,
    default: false,
  },
  sendModalTitle: {
    // 发送文件弹窗标题
    type: String,
    default: '发送文件',
  },
  sendModalBtnText: {
    // 发送文件弹窗按钮文本
    type: String,
    default: '立即发送',
  },
  fileNameKey: {
    type: String,
    default: 'fileName',
  },
})
const toast = useToast()
const emits = defineEmits(['up-success', 'up-error', 'webview-close'])

const cubgColor = ref('')
const loading = ref(false)
const value = ref(5)
const show = ref(false)
const msg = ref('执行完毕~')
const input = ref(null)
const showFileNameDialog = ref(false)
const pendingFileInfo = ref({
  filePath: '',
  fileName: '',
  fileSize: 0,
  url: '',
  name: 'file',
  header: {},
  formData: {},
  currentWebview: null,
})

const getRequest = (url) => {
  let theRequest = {}
  let index = url.indexOf("?")
  if (index != -1) {
    let str = url.substring(index+1)
    let strs = str.split("&")
    for(let i = 0; i < strs.length; i++) {
      theRequest[strs[i].split("=")[0]] = unescape(strs[i].split("=")[1])
    }
  }
  return theRequest
}

const handleFileSelected = (fileInfo) => {
  if (props.confirmFileName) {
    pendingFileInfo.value = fileInfo
    showFileNameDialog.value = true
  } else {
    doUpload(fileInfo)
  }
}

const handleConfirmFileName = (fileName: string) => {
  showFileNameDialog.value = false
  pendingFileInfo.value.formData[props.fileNameKey] = fileName
  doUpload(pendingFileInfo.value)
}

const handleCancelFileName = () => {
  showFileNameDialog.value = false
  pendingFileInfo.value = {
    filePath: '',
    fileName: '',
    fileSize: 0,
    url: '',
    name: 'file',
    header: {},
    formData: {},
    currentWebview: null,
  }
}

const doUpload = (fileInfo) => {
  if (isApp) {
    return appDoUpload(fileInfo)
  } else if (isHarmony) {
    return harmonyDoUpload(fileInfo)
  } else if (isMp) {
    return wxDoUpload(fileInfo)
  } else if (isH5) {
    return h5DoUpload(fileInfo)
  }
}
/**
 *
 * @param currentWebview 当前窗口webview对象
 * @param url 上传接口地址
 * @param name 上传文件key值
 * @param header 上传接口请求头
 * @param formData body内其他参数
 */
const appChooseFile = ({currentWebview, url, name = 'file', header, formData = {}} = {} as any) => {
  // #ifdef APP-PLUS
  let wv = plus.webview.create("","/hybrid/html/index.html",{
    //'uni-app': 'none',
    top: '0px',
    height: '100%',
    background: 'transparent'
  },{
    url,
    header,
    formData,
    key: name,
    confirmFileName: props.confirmFileName,
    sendModalTitle: props.sendModalTitle,
    sendModalBtnText: props.sendModalBtnText,
    fileNameKey: props.fileNameKey,
  })
  // 添加webview关闭事件监听器
  wv.addEventListener('close', function() {
    // 触发自定义事件，通知父组件webview已关闭
    emits('webview-close');
    // 可以在这里执行其他清理操作
  }, false);
  wv.loadURL("/hybrid/html/index.html")
  currentWebview.append(wv)
  wv.overrideUrlLoading({mode:'reject'},(e)=>{
    let {fileName, id, fileSize} = getRequest(e.url) as any
    fileName = unescape(fileName)
    id = unescape(id)
    fileSize = unescape(fileSize)
    console.log("fileSize", fileSize)
    const fileInfo = {
      fileName,
      fileSize,
      url,
      name,
      header,
      formData,
      currentWebview,
      id,
      statusCode: 200,
    }
    doUpload(fileInfo)
    // handleFileSelected(fileInfo)
  })
  // #endif
}

const appDoUpload = (fileInfo) => {
  // #ifdef APP-PLUS
  return onCommit(
    emits('up-success', {fileName: fileInfo.fileName, fileSize: fileInfo.fileSize, data: {id: fileInfo.id, statusCode: fileInfo.statusCode}})
  )
  // #endif
}
/**
 *
 * @param url 上传接口地址
 * @param name 上传文件key值
 * @param header 上传接口请求头
 * @param formData body内其他参数
 */
const h5ChooseFile = ({url, name = 'file', header, formData = {}} = {} as any) => {
  // #ifdef H5
  const inputEl = document.createElement('input');
  inputEl.type = 'file'
  inputEl.style.display = 'none'
  inputEl.id = 'file'
  if(props.type === 'image'){
    inputEl.accept = 'image/*'
  }
  input.value.$el.appendChild(inputEl)

  document.getElementById("file").click()
  inputEl.onchange = (event: any) => {
    const _file = (event.target as HTMLInputElement).files?.[0]
    if (!_file) return
    const fileInfo = {
      file: _file,
      fileName: _file.name,
      fileSize: _file.size,
      url,
      name,
      header,
      formData,
    }
    handleFileSelected(fileInfo)
  }
  // #endif
}

const h5DoUpload = (fileInfo) => {
  // #ifdef H5
  uploadH5(fileInfo.file, fileInfo.url, fileInfo.header, fileInfo.name, fileInfo.formData)
  // #endif
}
/**
 *
 * @param url
 * @param name
 * @param header
 * @param formData
 */
const wxChooseFile = ({url, name = 'file', header, formData = {}} = {} as any) => {
  wx.chooseMessageFile({
    count: 1,
    type: 'file',
    success: ({tempFiles}) => {
      let [{path: filePath, name: fileName, size: fileSize}] = tempFiles
      console.log("tempFiles==>::", tempFiles)
      console.log("filePath==>::", filePath)
      console.log("url==>::", url)
      const fileInfo = {
        filePath,
        fileName,
        fileSize,
        url,
        name,
        header,
        formData,
      }
      handleFileSelected(fileInfo)
    },
    fail: () => errorHandler('文件选择失败', upErr)
  })
}

const wxDoUpload = (fileInfo) => {
  setDefUI()
  return http.upload(fileInfo.url, {
    filePath: fileInfo.filePath,
    name: 'file'
  }).then((res : any) => {
    if (res.statusCode === 200) {
      console.log("wxChooseFile返回值success::", res)
      let data = res.data
      return onCommit(emits('up-success', {fileName: fileInfo.fileName, data}))
    }
  }).catch(err => {
    console.log("wxChooseFile返回值err", err)
    return errorHandler('文件上传失败', upErr)
  })
}
/**
 *
 * @param url 上传接口地址
 * @param name 上传文件key值
 * @param header 上传接口请求头
 * @param formData body内其他参数
 */
const harmonyChooseFile = ({ url, name = 'file', header, formData = {} } = {} as any) => {
  console.log('harmonyChooseFile', url, name, header, formData)
  // #ifdef APP-HARMONY
  uni.chooseFile({
    count: 1,
    success: (res) => {
      const filePath = res.tempFilePaths[0]
      const fileName = res.tempFiles[0].name || filePath.substring(filePath.lastIndexOf('/') + 1)
      console.log('harmonyChooseFile==>::', res)
      const fileInfo = {
        filePath,
        fileName,
        fileSize: res.tempFiles[0].size,
        url,
        name,
        header,
        formData,
      }
      handleFileSelected(fileInfo)
    },
    fail: () => errorHandler('文件选择失败', upErr),
  })
  // #endif
}

const harmonyDoUpload = (fileInfo) => {
  // #ifdef APP-HARMONY
  setDefUI()
  uni.uploadFile({
    url: fileInfo.url,
    filePath: fileInfo.filePath,
    name: fileInfo.name,
    header: fileInfo.header,
    formData: fileInfo.formData,
    success: (uploadRes) => {
      console.log('harmonyChooseFile上传成功::', uploadRes)
      const data = JSON.parse(uploadRes.data)
      onCommit(emits('up-success', { fileName: fileInfo.fileName, fileSize: fileInfo.fileSize, data }))
    },
    fail: (err) => {
      console.log('harmonyChooseFile上传失败::', err)
      errorHandler('文件上传失败', upErr)
    },
  })
  // #endif
}
/**
 * 上传
 * @param param
 */
const upload = (param = {} as any) => {
  if (!param.url) {
    toast.warning('上传地址不正确')
    return
  }

  if (loading.value) {
    toast.warning('还有个文件玩命处理中，请稍候..')
    return
  }

  if (isApp) {
    return appChooseFile(param)
  } else if (isHarmony) {
    return harmonyChooseFile(param)
  } else if (isMp) {
    return wxChooseFile(param)
  } else if (isH5) {
    return h5ChooseFile(param)
  }
}
/**
 * 打开文件
 * @param filePath
 */
const open = (filePath) => {
  let system = uni.getSystemInfoSync().platform
  if(system == 'ios'){
    filePath = encodeURI(filePath)
  }
  uni.openDocument({
    filePath,
    success: (res) => { console.log('打开文档成功') }
  })
}
/**
 * type: temporary=返回临时地址，local=长期保存到本地
 * @param url
 * @param type
 */
const download = (url, type = 'temporary') => {
  if (loading.value) {
    toast.warning('还有个文件玩命处理中，请稍候..')
    return
  }
  setDefUI()

  return new Promise((resolve, reject) => {
    let downloadTask = uni.downloadFile({
      url,
      success: ({statusCode, tempFilePath}) => {
        if (statusCode === 200) {
          if (type == 'local') {
            uni.saveFile({
              tempFilePath,
              success: ({savedFilePath}) => onCommit(resolve(savedFilePath)),
              fail: () => errorHandler('下载失败', reject)
            })
          }
          else {
            onCommit(resolve(tempFilePath))
          }
        }
      },
      fail: () => errorHandler('下载失败', reject)
    })

    downloadTask.onProgressUpdate(({progress = 0}) => {
      if (progress <= 100) {
        nextTick(() => {
          value.value = progress
        })
      }
    })
  })
}

const onCommit = (resolve) => {
  msg.value = '执行完毕~'
  loading.value = false
  cubgColor.value = 'rgba(57, 181, 74, 0.5)'
  setTimeout(() => { show.value = false }, 1500)
  return resolve
}

// #ifdef H5
const uploadH5 = (_file, url, header, name = 'file', _formData = {}) => {
  let formData = new FormData()
  formData.append(name, _file)
  for (let keys in _formData) {
    formData.append(keys, _formData[keys])
  }
  let xhr = new XMLHttpRequest()
  xhr.open("post", url, true)

  for (let keys in header) {
    xhr.setRequestHeader(keys, header[keys])
  }

  xhr.upload.onloadstart = () => {
    toast.loading('上传中...')
  }

  xhr.upload.onprogress = (res) => {
    if(res.loaded / res.total == 1){
      setTimeout(() => {
        toast.close()
      }, 5000)
    }
  }

  xhr.onload = (res:any) => {
    console.log("上传完成", res)
    console.log(res.target.response)

    toast.close()
    if (res.target.status === 200) {
      let data = JSON.parse(res.target.response)
      console.log("data", data)
      let fileName = data.message || pendingFileInfo.value?.fileName || _file.name
      onCommit(emits('up-success', {fileSize: _file.size, fileName, data}))
    } else {
      toast.error('文件上传失败')
    }
    const inputEl = document.getElementById("file");
    input.value.$el.removeChild(inputEl)
  }

  xhr.onerror = (data) => {
    toast.close()
    toast.error('上传失败')
  }

  xhr.ontimeout = function(event) {
    toast.close()
    toast.error('上传超时，请刷新重试')
  }

  xhr.send(formData)
}
// #endif

const setDefUI = () => {
  cubgColor.value = props.bgColor
  value.value = 0
  loading.value = true
  show.value = true
}

const upErr = (errText) => {
  emits('up-error', errText)
}

const errorHandler = (errText, reject) => {
  msg.value = errText
  loading.value = false
  cubgColor.value = 'rgba(229, 77, 66, 0.5)'
  setTimeout(() => { show.value = false }, 1500)
  return reject(errText)
}

defineExpose({
  upload,
  open,
  download
})
</script>

<style scoped>
.t-toptips {
  width: 100%;
  padding: 18upx 30upx;
  box-sizing: border-box;
  position: fixed;
  z-index: 90;
  color: #fff;
  font-size: 30upx;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  word-break: break-all;
  display: none;
  transform: translateZ(0) translateY(-100%);
  transition: all 0.3s ease-in-out;
}

.t-top-show {
  transform: translateZ(0) translateY(0);
  display: block;
}
</style>
