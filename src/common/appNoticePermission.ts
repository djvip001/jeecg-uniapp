// typescript
import { http } from '@/utils/http'

// APP角标
export default async function appNoticePermission(): Promise<void> {
  const platform = uni.getSystemInfoSync().platform // 首先判断app是安卓还是ios
  console.log(platform)
  if (platform === 'ios') {
    // 这里是ios的方法
    console.log('我是iOS')
    let isOn: boolean
    let types: number
    const app = plus.ios.invoke('UIApplication', 'sharedApplication')
    const settings = plus.ios.invoke(app, 'currentUserNotificationSettings')
    if (settings) {
      types = settings.plusGetAttribute('types')
      plus.ios.deleteObject(settings)
    } else {
      types = plus.ios.invoke(app, 'enabledRemoteNotificationTypes')
    }
    plus.ios.deleteObject(app)
    // eslint-disable-next-line prefer-const
    isOn = types !== 0
    if (isOn === false) {
      uni.showModal({
        title: '通知权限开启提醒',
        content: '您还没有开启通知权限，无法接收到消息通知，请前往设置！',
        showCancel: false,
        confirmText: '去设置',
        success: function (res) {
          if (res.confirm) {
            openTongZhi()
          }
        },
      })
    }
  } else if (platform === 'android') {
    // 下面是安卓的方法
    console.log('我是安卓', plus.android)
    const main = plus.android.runtimeMainActivity()
    let NotificationManagerCompat = plus.android.importClass(
      'android.support.v4.app.NotificationManagerCompat',
    )
    // android.support.v4升级为androidx
    if (NotificationManagerCompat == null) {
      NotificationManagerCompat = plus.android.importClass(
        'androidx.core.app.NotificationManagerCompat',
      )
    }
    const areNotificationsEnabled = NotificationManagerCompat.from(main).areNotificationsEnabled()
    console.log(areNotificationsEnabled)
    if (!areNotificationsEnabled) {
      uni.showModal({
        title: '通知权限开启提醒',
        content: '您还没有开启通知权限，无法接收到消息通知，请前往设置！',
        showCancel: false,
        confirmText: '去设置',
        success: (res) => {
          if (res.confirm) {
            openTongZhi()
          } else if (res.cancel) {
            console.log('用户点击取消')
          }
        },
      })
    }
  }
}

/**
 * 开启通知
 */
function openTongZhi() {
  // 弹窗按钮绑定方法
  const platform = uni.getSystemInfoSync().platform // 获取安卓还是ios
  if (platform === 'ios') {
    const app = plus.ios.invoke('UIApplication', 'sharedApplication')
    const setting = plus.ios.invoke('NSURL', 'URLWithString:', 'app-settings:')
    plus.ios.invoke(app, 'openURL:', setting)
    plus.ios.deleteObject(setting)
    plus.ios.deleteObject(app)
  } else if (platform === 'android') {
    // 如果机型是安卓
    const main = plus.android.runtimeMainActivity()
    const pkName = main.getPackageName()
    const uid = main.getApplicationInfo().plusGetAttribute('uid')
    const Intent = plus.android.importClass('android.content.Intent')
    const Build = plus.android.importClass('android.os.Build')
    // android 8.0引导
    if (Build.VERSION.SDK_INT >= 26) {
      // 判断安卓系统版本
      const intent = new Intent('android.settings.APP_NOTIFICATION_SETTINGS')
      intent.putExtra('android.provider.extra.APP_PACKAGE', pkName)
    } else if (Build.VERSION.SDK_INT >= 21) {
      // 判断安卓系统版本
      // android 5.0-7.0
      const intent = new Intent('android.settings.APP_NOTIFICATION_SETTINGS')
      intent.putExtra('app_package', pkName)
      intent.putExtra('app_uid', uid)
    } else {
      // (<21)其他--跳转到该应用管理的详情页
      intent.setAction(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
      const uri = Uri.fromParts('package', mainActivity.getPackageName(), null)
      intent.setData(uri)
    }
    // 跳转到该应用的系统通知设置页
    main.startActivity(intent)
  }
}
