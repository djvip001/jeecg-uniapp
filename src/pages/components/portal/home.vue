<template>
  <!-- 【JHHB-313】使用userStore.isLogined 解决未登录首页一闪而过的情况-->
  <view class="wrapper" v-if="userStore.isLogined">
    <view
      class="header"
      :style="{
        '--nav-height': `${navHeight}px`,
        '--status-bar-height': `${statusBarHeight}px`,
      }"
    >
      <view class="drop-menu" @click="closeOutside">
        <wd-drop-menu>
          <wd-drop-menu-item v-model="dropMenu" :options="option" @change="dropMenuChange" />
        </wd-drop-menu>
      </view>
      <view class="scan" @tap="scan">
        <text class="cuIcon-scan"></text>
      </view>
    </view>
    <!-- 使用scroll-view的下拉刷新 -->
    <scroll-view
      class="scrollView"
      :scroll-y="true"
      scroll-with-animation
      :refresher-enabled="true"
      :refresher-triggered="refresherTriggered"
      refresher-background="#f1f1f1"
      @refresherrefresh="onRefresherRefresh"
      @refresherrestore="onRefresherRestore"
      @refresherabort="onRefresherAbort"
    >
      <view class="app-portal-item" v-for="(item, index) in layout" :key="index">
        <portalItem :item="item"></portalItem>
      </view>
    </scroll-view>
  </view>
</template>

<script lang="ts" setup>
import { onHide, onLoad, onReady, onShow } from '@dcloudio/uni-app'
import { useQueue } from 'wot-design-uni/components/composables/useQueue'
import { useRouter } from '@/plugin/uni-mini-router'
import { http } from '@/utils/http'
import { useToast } from 'wot-design-uni/components/wd-toast'
import portalItem from '@/pages-appPortal/components/appPortalItem.vue'
import { onMounted, provide, ref } from 'vue'
import { hasRoute } from '@/common/uitls'
import { useUserStore } from '@/store/user'
import { isObject, isArray } from '@/common/is'
defineOptions({
  name: 'portalHome',
  options: {
    styleIsolation: 'shared',
  },
})
const api = {
  queryPortal: '/eoa/portalapp/portalDesign/queryPortal',
  copyTemplateData: '/eoa/portalapp/portalDesign/copyTemplateData',
}
const { systemInfo, navHeight } = getApp().globalData
const { statusBarHeight } = systemInfo
const { closeOutside } = useQueue()
const userStore = useUserStore()
const router = useRouter()
const toast = useToast()
const layout = ref([])
const loading = ref(false)
const type = ref<string>(
  userStore.userInfo.homePath.indexOf('/personal') != -1 ? 'personal' : 'system',
)
const pageVisibleState = ref(false)
const cacheKey = 'portalHomeLayout'
provide('pageVisibleState', pageVisibleState)
const option = ref<Record<string, any>[]>([
  { label: '主门户', value: 'system' },
  { label: '个人工作台', value: 'personal' },
])
const dropMenu = ref<string>(type.value)

// 下拉刷新状态
const refresherTriggered = ref(false)

const dropMenuChange = ({ value }) => {
  type.value = value
  getAppConfig()
  uni.setStorage({ key: cacheKey, data: value })
}
const copyTemplateData = () => {
  return http.get(api.copyTemplateData, {
    type: type.value,
  })
}
const queryPortal = () => {
  return http.get(api.queryPortal, {
    type: type.value,
  })
}
const getAppConfig = async () => {
  layout.value = []
  loading.value = true
  if (type.value === 'personal') {
    queryPortal()
      .then((res: any) => {
        if (res.success) {
          const { result } = res
          if (result) {
            auto(res)
          }
        } else {
          copyTemplateData().then((res: any) => {
            if (res.success) {
              auto(res)
            } else {
              toast.warning(res.message)
            }
          })
        }
      })
      .finally(() => {
        loading.value = false
        // 停止下拉刷新
        refresherTriggered.value = false
      })
  } else {
    queryPortal()
      .then((res: any) => {
        if (res.success) {
          auto(res)
        } else {
          toast.warning(res.message)
        }
      })
      .finally(() => {
        loading.value = false
        // 停止下拉刷新
        refresherTriggered.value = false
      })
  }
  const auto = (res) => {
    let { result } = res
    let data: any
    if (isObject(result)) {
      data = result
    } else if (isArray(result)) {
      data = result[0]
    }
    let { appComponentData } = JSON.parse(data.designJson)
    if (appComponentData && appComponentData.length > 0) {
      layout.value = appComponentData
    } else {
      layout.value = []
    }
  }
}

// scroll-view下拉刷新事件处理
const onRefresherRefresh = () => {
  console.log('触发下拉刷新')
  refresherTriggered.value = true
  getAppConfig()
}

const onRefresherRestore = () => {
  console.log('下拉刷新复位')
  refresherTriggered.value = false
}

const onRefresherAbort = () => {
  console.log('下拉刷新被中止')
  refresherTriggered.value = false
}

const scan = () => {
  // #ifndef H5
  uni.scanCode({
    success: function (res) {
      console.log('条码res：' + res)
      console.log('条码类型：' + res.scanType)
      console.log('条码内容：' + res.result)
      //条码内容包含QRCODELOGIN则是去扫码登录的逻辑
      if (res.result.indexOf('QRCODELOGIN') != -1) {
        const data = {
          qrcodeId: res.result,
          token: userStore.userInfo.token,
        }
        http({
          url: '/sys/scanLoginQrcode',
          data,
          header: { 'content-type': 'application/x-www-form-urlencoded' },
          method: 'POST',
        }).then((res: any) => {
          console.log('扫码接口返回内容res：', res)
          if (res.success) {
            toast.success(res.result)
          } else {
            toast.warning(res.result)
          }
        })
      }
    },
  })
  // #endif
  // #ifdef H5
  toast.warning('H5暂不支持')
  // #endif
}

onShow(() => {
  console.log('home页面：onShow')
  pageVisibleState.value = true
  // 解决第一次登录进来首页偶尔空的情况
  setTimeout(() => {
    if (layout.value.length == 0 && loading.value == false) {
      getAppConfig()
    }
  }, 100)
})
onHide(() => {
  console.log('home页面：onHide')
  pageVisibleState.value = false
})
onMounted(() => {
  const cacheLayout = uni.getStorageSync(cacheKey)
  if (cacheLayout) {
    type.value = cacheLayout
    dropMenu.value = cacheLayout
  }
  getAppConfig()
})
onLoad(() => {
  console.log('home页面：onLoad')
})
onReady(() => {
  console.log('home页面：onReady')
})
</script>

<style lang="scss" scoped>
.wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  .header {
    padding-top: var(--status-bar-height);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: linear-gradient(45deg, #0081ff, #1cbbb4);
    .scan {
      .cuIcon-scan {
        padding: 10px 16px;
        font-size: 18px;
        color: #fff;
      }
    }
  }
}
.scrollView {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 0;
  min-height: 0;
  background-color: #f1f1f1;
}
.app-portal-item {
  margin-bottom: 14px;
}
:deep(.wd-drop-menu) {
  flex: 1;
  .wd-drop-menu__list {
    color: #fff;
    font-size: 16px;
    background: transparent;
  }
  .wd-drop-menu__item {
    text-align: left;
  }
  .wd-icon {
    font-size: 16px !important;
    transform: scale(1);
  }
}
</style>
