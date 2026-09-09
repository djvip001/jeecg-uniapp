<script lang="ts">
import { onLaunch, onShow, onHide, onLoad, onReady } from '@dcloudio/uni-app'
import 'abortcontroller-polyfill/dist/abortcontroller-polyfill-only'
import { beforEach } from '@/router/index'
import { http } from '@/utils/http'
import { isBoolean } from '@/common/is'
// #ifdef APP-PLUS
import appUpdate from '@/common/appUpdate'
import appBadge from '@/common/appBadge'
import { pushService } from '@/common/appPush'
import appNoticePermission from '@/common/appNoticePermission'
// #endif
let isFirstShow = true
export default {
  onLaunch: function (options) {
    console.log('App Launch')
    console.log('应用启动路径：', options.path)
    // #ifdef APP-PLUS
    // 检测升级
    appUpdate()
    // 初始化推送
    pushService.initialize()
    // 通知权限
    appNoticePermission()
    // 角标设置
    appBadge()
    // 全局处理推送消息
    pushService.onMessageReceived((message) => {
      // 在这里处理需要全局响应的推送消息
      console.log('全局推送消息:', message)
      appBadge()
    })
    // #endif
  },
  onShow: function (options) {
    console.log('App Show')
    console.log('应用启动路径：', options.path)
    // 首次进入页面时路由拦截，后台恢复时保留当前页面栈
    if (isFirstShow) {
      isFirstShow = false
      setTimeout(() => {
        const currentPage = options.path
        beforEach({ path: '/' }, { path: currentPage, fullPath: currentPage }, (data) => {
          if (data?.path) {
            uni.redirectTo({ url: data.path })
          }
        })
      }, 100)
    }
  },
  onHide: function () {
    console.log('App Hide')
  },
  // 全局变量
  globalData: {
    // 开启APP首页设计，协作工作台：通过后台排版布局
    isLocalConfig: true,
    systemInfo: uni.getSystemInfoSync(),
    // 导航的高度
    navHeight: 44,
  },
}
</script>

<style lang="scss">
:root,
page {
  font-size: 14px;
  color: #333333;
  font-family:
    Helvetica Neue,
    Helvetica,
    sans-serif;
}
uni-page-body {
  height: 100%;
  & > uni-view {
    height: 100%;
  }
}
.shadow-warp {
  position: relative;
  box-shadow: 0 0 5px rgba(168, 92, 92, 0.1);
}

/* stylelint-disable selector-type-no-unknown */
button::after {
  border: none;
}

swiper,
scroll-view {
  flex: 1;
  height: 100%;
  overflow: hidden;
}

image {
  width: 100%;
  height: 100%;
  vertical-align: middle;
}

// 单行省略，优先使用 unocss: text-ellipsis
.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// 两行省略
.ellipsis-2 {
  display: -webkit-box;
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-all;
}

// 三行省略
.ellipsis-3 {
  display: -webkit-box;
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

/* ===== 流程办理页面悬浮按钮：强制圆形 ===== */
/* 仅小程序平台（MP-*）生效，H5/App/Harmony 不受影响 */
/* #ifdef MP */
.wd-fab .wd-button.custom-button,
.wd-fab .wd-button.is-round.custom-button {
  min-width: auto !important;
  box-sizing: border-box !important;
  width: 44px !important;
  height: 44px !important;
  border-radius: 50% !important;
  margin: 6px 0 !important;
  padding: 0 !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
}
.wd-fab .wd-button.custom-button::after,
.wd-fab .wd-button.is-round.custom-button::after {
  border-radius: 50% !important;
}
/* FAB 触发按钮（右下角 X 关闭按钮）：改为正圆 */
.wd-fab .wd-fab__trigger.wd-button {
  width: 44px !important;
  height: 44px !important;
  min-width: auto !important;
  border-radius: 50% !important;
}
.wd-fab .wd-fab__trigger.wd-button::after {
  border-radius: 50% !important;
}
/* FAB 图标大小 */
.wd-fab .wd-fab__icon {
  font-size: 18px !important;
}
/* #endif */
</style>
