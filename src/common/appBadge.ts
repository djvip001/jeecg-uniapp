// typescript
import { http } from '@/utils/http'

// APP角标
export default async function appBadge(): Promise<void> {
  // #ifdef APP-PLUS
  // try {
  //   console.log('角标更新:')
  //   const [res1, res2] = (await Promise.all([
  //     http.get('/sys/annountCement/getUnreadMessageCount'),
  //     http.get('/eoa/im/newApi/getUserMsgCount'),
  //   ])) as [
  //     { success?: boolean; result?: { systemCount?: number; planCount?: number; count?: number; flowCount?: number; fileCount?: number }  },
  //     { success?: boolean; result?: number;}
  //   ]
  //   let msgCount = 0
  //   console.log('角标更新:系统未读消息:res1',res1)
  //   if (res1?.success && res1.result) {
  //     const systemCount = Number(res1.result?.systemCount || 0)
  //   const planCount = Number(res1.result?.planCount || 0)
  //     const count = Number(res1.result?.count || 0)
  //   const flowCount = Number(res1.result?.flowCount || 0)
  //   const fileCount = Number(res1.result?.fileCount || 0)
  //     msgCount += systemCount + planCount + count + flowCount + fileCount
  //   }
  //   console.log('角标更新:聊天未读消息:',res2)
  //   if (res2?.success) {
  //     // 有些接口在 data.result，有些在 result，兼容两种情况
  //     msgCount += Number(res2?.result ?? res2.result ?? 0)
  //   }
  //   plus.runtime.setBadgeNumber(msgCount < 99 ? msgCount : 99)
  // } catch (e) {
  //   // 请求错误或其他异常时，清零或按需处理
  //   plus.runtime.setBadgeNumber(0)
  // }
  // #endif
}
