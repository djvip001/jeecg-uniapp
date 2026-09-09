// @ts-nocheck
import { randomString } from './uitls'
import { useUserStore } from '@/store/user'

const baseUrl = import.meta.env.VITE_SERVER_BASEURL

class socket {
  constructor() {
    this.socketUrl = baseUrl
    this.socketStart = false
    this.socketType = ''
    this.socketTask = null // 鸿蒙系统socket任务
    this.monitorSocketError()
    this.monitorSocketClose()
    this.socketReceive()
  }

  // 判断是否为鸿蒙系统
  isHarmonyOS() {
    // 鸿蒙系统检测逻辑
    return (
      uni.getSystemInfoSync().platform === 'harmony' ||
      uni.getSystemInfoSync().osName === 'harmony' ||
      (typeof uni !== 'undefined' && uni.getSystemInfoSync().platform.includes('harmony'))
    )
  }

  init(socket_type, callback?) {
    const userStore = useUserStore()
    const token = userStore.userInfo.token
    // 检查是否已经存在相同类型的连接
    if (this.socketStart && this.socketType === socket_type) {
      console.log('webSocket已经启动了，类型:', socket_type, this.socketUrl)
      callback && callback()
      return
    }

    // 对于 eoaNewChatSocket 类型，检查是否有缓存的连接
    if (socket_type === 'eoaNewChatSocket') {
      // update-begin--author:liaozhiyang---date:20260812---for：【LHZP-1790】修复自己发的消息不能撤回及socket连不上
      // const cachedConnection = this.getCachedConnection(token)
      const cachedConnection = null;
      // update-end--author:liaozhiyang---date:20260812---for：【LHZP-1790】修复自己发的消息不能撤回及socket连不上
      if (cachedConnection && cachedConnection.socketType === socket_type) {
        console.log('使用缓存的 eoaNewChatSocket 连接', this.socketUrl)
        this.socketStart = true
        this.socketType = socket_type
        // 根据平台选择不同的连接方式
        if (this.isHarmonyOS()) {
          const cacheMessageId = cachedConnection.messageId;
          const url =
            this.socketUrl.replace('https://', 'wss://').replace('http://', 'ws://') +
            '/eoaNewChatSocket/' +
            userStore.userInfo.userid +
            '_' +
            cacheMessageId +
            '/' +
            cacheMessageId
          this.initHarmonySocket(url, token, socket_type, callback)
        }
        return
      }
    }

    if (baseUrl) {
      if (this.socketStart) {
        console.log('webSocket已经启动了', this.socketUrl)
      } else {
        this.socketType = socket_type
        let url =
          this.socketUrl.replace('https://', 'wss://').replace('http://', 'ws://') +
          '/' +
          socket_type +
          '/' +
          userStore.userInfo.userid +
          '_app'
        if (socket_type == 'eoaNewChatSocket') {
          let randomMessageId = 'app' + randomString(6)
          url =
            this.socketUrl.replace('https://', 'wss://').replace('http://', 'ws://') +
            '/eoaNewChatSocket/' +
            userStore.userInfo.userid +
            '_' +
            randomMessageId +
            '/' +
            randomMessageId

          // 缓存 eoaNewChatSocket 连接信息
          this.cacheConnection(token, socket_type, randomMessageId)
        }
        console.log('启动this.socketUrl连接地址：', url)

        // 根据平台选择不同的连接方式
        if (this.isHarmonyOS()) {
          this.initHarmonySocket(url, token, socket_type, callback)
        } else {
          this.initStandardSocket(url, token, socket_type, callback)
        }
      }
    } else {
      console.log('config/baseUrl socketUrl为空')
    }
  }

  // 鸿蒙系统WebSocket连接
  initHarmonySocket(url, token, socket_type, callback?) {
    try {
      // 鸿蒙系统使用原生的WebSocket API
      this.socketTask = uni.connectSocket({
        url,
        method: 'GET',
        protocols: [token],
        // 鸿蒙系统特殊配置
        header: {
          Authorization: `Bearer ${token}`,
          Platform: 'harmony',
        },
        // 鸿蒙系统需要额外的参数
        complete: (res) => {
          console.log('鸿蒙WebSocket连接完成:', res)
        },
      })

      // 鸿蒙系统的事件监听
      if (this.socketTask) {
        this.socketTask.onOpen((res) => {
          this.socketStart = true
          callback && callback()
          console.log('鸿蒙WebSocket连接已打开！类型:', socket_type)
        })

        this.socketTask.onMessage((res) => {
          console.log('鸿蒙APP:--》收到服务器内容：')
          const data = JSON.parse(res.data)
          this.acceptMessage && this.acceptMessage(data)
          uni.$emit('socketMessage', data)
        })

        this.socketTask.onClose((res) => {
          console.log('鸿蒙WebSocket 已关闭！', res)
          this.socketStart = false
          this.clearCachedConnection()
          if (this.socketType !== 'eoaNewChatSocket') {
            setTimeout(() => {
              this.init(this.socketType)
            }, 3000)
          }
        })

        this.socketTask.onError((res) => {
          this.socketStart = false
          this.clearCachedConnection()
          console.log('鸿蒙WebSocket连接打开失败，请检查！', res)
        })
      }
    } catch (error) {
      console.error('鸿蒙WebSocket初始化失败:', error)
      this.socketStart = false
      this.clearCachedConnection()
    }
  }

  // 标准WebSocket连接（原有逻辑）
  initStandardSocket(url, token, socket_type, callback?) {
    uni.connectSocket({
      url,
      method: 'GET',
      protocols: [token],
    })

    uni.onSocketOpen((res) => {
      this.socketStart = true
      callback && callback()
      console.log('WebSocket连接已打开！类型:', socket_type)
    })
  }

  // 缓存连接信息
  cacheConnection(token, socketType, messageId) {
    const connectionInfo = {
      socketType,
      messageId,
      timestamp: Date.now(),
    }
    uni.setStorageSync(token + 'cached_socket_connection', connectionInfo)
  }

  // 获取缓存的连接信息
  getCachedConnection(token) {
    try {
      return uni.getStorageSync(token + 'cached_socket_connection')
    } catch (e) {
      return null
    }
  }

  // 清除缓存的连接信息
  clearCachedConnection() {
    try {
      const userStore = useUserStore()
      const token = userStore.userInfo.token
      uni.removeStorageSync(token + 'cached_socket_connection')
    } catch (e) {
      console.log('清除缓存连接信息失败:', e)
    }
  }

  // Socket给服务器发送消息
  send(data, callback) {
    const userStore = useUserStore()
    if (userStore.userInfo.userid) {
      data.userUid = userStore.userInfo.userid
    }
    console.log(data)
    // 鸿蒙系统使用socketTask发送消息
    if (this.isHarmonyOS() && this.socketTask) {
      try {
        this.socketTask.send({
          data: JSON.stringify(data),
          success: () => {
            callback && callback(true)
          },
          fail: (error) => {
            console.error('鸿蒙WebSocket发送消息失败:', error)
            callback && callback(false)
          },
        })
      } catch (error) {
        console.error('鸿蒙WebSocket发送消息异常:', error)
        callback && callback(false)
      }
    } else {
      // 标准系统发送消息
      uni.sendSocketMessage({
        data: JSON.stringify(data),
        success: () => {
          callback && callback(true)
        },
        fail: () => {
          callback && callback(false)
        },
      })
    }
  }
  acceptMessage(msg) {
    console.log(msg)
  }
  // Socket接收服务器发送过来的消息
  socketReceive() {
    // 标准系统的消息接收（鸿蒙系统在initHarmonySocket中已处理）
    uni.onSocketMessage((res) => {
      console.log('APP:--》收到服务器内容：')
      let data = JSON.parse(res.data)
      // console.log('收到服务器内容：', data);
      this.acceptMessage && this.acceptMessage(data)
      uni.$emit('socketMessage', data)
    })
  }
  // 关闭Socket
  closeSocket() {
    // 清除缓存连接信息
    console.log('关闭WebSocket！')
    this.clearCachedConnection()
    // 鸿蒙系统使用socketTask关闭
    if (this.isHarmonyOS() && this.socketTask) {
      try {
        this.socketTask.close({
          code: 1000,
          reason: '正常关闭',
        })
      } catch (error) {
        console.error('鸿蒙WebSocket关闭异常:', error)
      }
      this.socketTask = null
    } else {
      uni.closeSocket()
    }

    this.socketStart = false
  }
  // 监听Socket关闭
  monitorSocketClose() {
    uni.onSocketClose((res) => {
      console.log('WebSocket 已关闭！',res)
      this.socketStart = false
      // 清除缓存连接信息
      this.clearCachedConnection()
      if (this.socketType !== 'eoaNewChatSocket') {
        setTimeout(() => {
          this.init(this.socketType)
        }, 3000)
      }
    })
  }
  // 监听Socket错误
  monitorSocketError() {
    uni.onSocketError((res) => {
      this.socketStart = false
      // 清除缓存连接信息
      this.clearCachedConnection()
      console.log('WebSocket连接打开失败，请检查！', res)
    })
  }
  // 心跳
  getHeartbeat() {
    const userStore = useUserStore()
    this.send(
      {
        type: '心跳',
        userUid: userStore.userInfo.userid,
      },
      (val) => {
        setTimeout(() => {
          if (val) {
            // this.getHeartbeat();
          } else {
            if (!this.socketStart) {
              // this.init();
            }
          }
        }, 10000)
      },
    )
  }
}

// 单例模式
let instance = null

function getSocketInstance() {
  if (!instance) {
    instance = new socket()
  }
  return instance
}

const mySocket = getSocketInstance()
export default mySocket
