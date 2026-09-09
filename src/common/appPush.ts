// utils/push.ts
import { ref, onMounted, onUnmounted } from 'vue'
import router from '@/router'
// 推送消息接口定义
interface PushMessage {
  title: string
  content: string
  payload?: Record<string, any>
  timestamp: number
}

// 推送服务类
class PushService {
  private isInitialized = ref(false)
  private clientInfo: any = null

  // 初始化推送服务
  async initialize(): Promise<boolean> {
    try {
      // 检查平台支持
      if (!this.isUniPushSupported()) {
        console.warn('当前平台不支持 UniPush')
        return false
      }

      // 获取客户端信息
      this.clientInfo = await this.getClientInfo()
      console.warn('this.clientInfo', this.clientInfo)
      // 监听推送事件
      this.setupPushListeners()

      this.isInitialized.value = true
      console.log('UniPush 初始化成功')
      return true
    } catch (error) {
      console.error('UniPush 初始化失败:', error)
      return false
    }
  }

  // 检查平台支持
  private isUniPushSupported(): boolean {
    return (
      typeof uni !== 'undefined' &&
      typeof uni.getPushClientId === 'function' &&
      typeof uni.onPushMessage === 'function'
    )
  }

  // 获取客户端信息
  private async getClientInfo(): Promise<any> {
    return new Promise((resolve, reject) => {
      uni.getPushClientId({
        success: (res) => {
          resolve(res)
        },
        fail: (error) => {
          reject(error)
        },
      })
    })
  }

  // 设置推送监听器
  private setupPushListeners(): void {
    // 监听点击通知栏消息
    uni.onPushMessage((res) => {
      if (res.type === 'click') {
        console.log('监听点击通知栏消息:', res)
        this.handleNotificationClick(res.data)
      } else if (res.type === 'receive') {
        console.log('收到推送消息:', res)
        this.handlePushMessage(res.data)
      }
    })
  }

  // 处理推送消息
  private handlePushMessage(message: any): void {
    const pushMessage: PushMessage = {
      title: message.title || '新消息',
      content: message.content || '',
      payload: message.payload || {},
      timestamp: Date.now(),
    }
    console.log('处理推送消息:', pushMessage)
    // 触发消息接收事件
    this.emitMessageReceived(pushMessage)

    // 显示本地通知（可选）
    this.showLocalNotification(pushMessage)
  }

  // 处理通知栏点击
  private handleNotificationClick(message: any): void {
    console.log('通知栏被点击:根据类型跳转到具体的页面message', message)
    // 根据消息内容跳转到对应页面
    // payload 可能是 JSON 字符串（个推通道常见），需要先解析
    let payload = message.payload || {}
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload)
      } catch (e) {
        payload = {}
      }
    }
    console.log('通知栏被点击:payload', payload)
    console.log('通知栏被点击:payload?.type', payload?.type)
    // 根据 payload 中的路径信息进行跳转
    if (payload?.type) {
      if (payload.type === 'bpm_task') {
        // 任务办理：先reLaunch到首页，再push到待办列表，保证返回栈正常
        console.log('通知栏被点击:跳转到任务办理页面')
        // update-begin-author:liusq---date:20260407--for:个推推送点击后处理完待办返回不到首页问题，改用先跳首页再push方式保留导航栈
        uni.reLaunch({ url: '/pages/home/home' })
        setTimeout(() => {
          router.push({ name: 'flowIndex' })
        }, 300)
      } else if (payload.type === 'bpm_cc') {
        // 任务详情：先reLaunch到首页，再push到知会列表
        console.log('通知栏被点击:跳转到任务详情页面')
        uni.reLaunch({ url: '/pages/home/home' })
        setTimeout(() => {
          router.push({ name: 'ccIndex' })
        }, 300)
        // update-end-author:liusq---date:20260407--for:个推推送点击后处理完待办返回不到首页问题，改用先跳首页再push方式保留导航栈
      } else if (payload.type === 'collaboration') {
        // 任务详情：先reLaunch到首页，再push到知会列表
        uni.reLaunch({ url: '/pages/home/home' })
        uni.redirectTo({ url: '/pages-super/collaboration/collaboration' })
        setTimeout(() => {
          router.push({ name: 'collaPending' })
        }, 300)
      } else if (payload.type === 'chat') {
        // 聊天页面
        console.log('通知栏被点击:跳转到聊天页面')
        router.replaceAll({ name: 'home', params: { current: 'message' } })
      } else {
        // 消息列表
        console.log('通知栏被点击:跳转到消息页面')
        router.replaceAll({ name: 'home', params: { current: 'message' } })
      }
    }else {
        // 消息列表
        console.log('通知栏被点击:跳转到消息页面')
        router.replaceAll({ name: 'home', params: { current: 'message' } })
    }
  }

  // 显示本地通知
  private showLocalNotification(message: PushMessage): void {
    console.log('显示本地通知:', message)
    plus.push.createMessage(
      message.content,
      message.payload ? JSON.stringify(message.payload) : '',
      {
        title: message.title,
        cover: false,
        sound: 'system',
        // Android 8.0+ 必须设置 channel
        channel: 'default',
      },
    )
  }

  // 事件监听相关
  private messageListeners: ((message: PushMessage) => void)[] = []

  // 添加消息监听器
  onMessageReceived(callback: (message: PushMessage) => void): void {
    this.messageListeners.push(callback)
  }

  // 移除消息监听器
  offMessageReceived(callback: (message: PushMessage) => void): void {
    const index = this.messageListeners.indexOf(callback)
    if (index > -1) {
      this.messageListeners.splice(index, 1)
    }
  }

  // 触发消息接收事件
  private emitMessageReceived(message: PushMessage): void {
    this.messageListeners.forEach((callback) => {
      callback(message)
    })
  }

  // 获取客户端ID（用于服务端推送）
  async getClientId(): Promise<string> {
    if (!this.clientInfo) {
      await this.initialize()
    }
    return this.clientInfo?.cid || ''
  }

  // 获取初始化状态
  getInitialized(): boolean {
    return this.isInitialized.value
  }
}

// 创建单例实例
export const pushService = new PushService()
