<route lang="json5" type="home">
{
  layout: 'default',
  style: {
    navigationBarTitleText: '',
    navigationStyle: 'custom',
    disableScroll: true, // 微信禁止页面滚动
    'app-plus': {
      bounce: 'none', // 禁用 iOS 弹性效果
    },
  },
}
</route>

<template>
  <view class="wrap">
    <view class="content">
      <!-- 消息内容 -->
      <Message v-if="tabbar.current === 'message'" />
      <!-- 协作内容 -->
      <Index v-if="tabbar.current === 'index'" />
      <!-- 个人内容 -->
      <people v-if="tabbar.current === 'people'" />
    </view>
    <!-- 自定义TabBar 【JHHB-313】使用userStore.isLogined 解决未登录首页一闪而过的情况-->
    <template v-if="userStore.isLogined">
      <view v-if="!isH5" class="native-tabbar-placeholder"></view>
      <wd-tabbar
        fixed
        bordered
        safeAreaInsetBottom
        :placeholder="isH5"
        v-model="tabbar.current"
        @change="handleChange"
        active-color="#39b54a"
        inactive-color="#aaa"
      >
        <template v-for="(item, index) in tabbar.data" :key="index">
          <wd-tabbar-item v-bind="item">
            <template #icon="{ active }">
              <view class="tabbar-icon-wrap">
                <view :class="`cIcon ${item.icon} ${active ? 'active' : ''}`"></view>
                <view
                  v-if="item.name === 'message' && unreadChatCount > 0"
                  class="tabbar-red-dot"
                ></view>
              </view>
            </template>
          </wd-tabbar-item>
        </template>
      </wd-tabbar>
    </template>
  </view>
</template>

<script lang="ts" setup>
import { ref, reactive } from 'vue'
import { onShow, onHide, onLoad, onUnload, onReady } from '@dcloudio/uni-app'
import { useToast } from 'wot-design-uni/components/wd-toast'
import { useMessage } from 'wot-design-uni/components/wd-message-box'
import { useRouter } from '@/plugin/uni-mini-router'
import { useUserStore } from '@/store/user'
import { http } from '@/utils/http'
import { useParamsStore } from '@/store/page-params'
import { HOME_PAGE } from '@/common/constants'
import Home from '../components/portal/home.vue'
import Message from '../components/message/message.vue'
import Index from '../components/index/index.vue'
import people from '../components/user/people.vue'
import { isH5 } from '@/utils/platform'

defineOptions({
  name: 'HomePage',
  options: {
    styleIsolation: 'shared',
  },
})

const router = useRouter()
const paramsStore = useParamsStore()
const userStore = useUserStore()
const toast = useToast()
const message = useMessage()
// 消息tab未读数量
const unreadChatCount = ref(0)

// 检查缓存的聊天列表未读总数
function checkCacheUnread() {
  try {
    const cached = uni.getStorageSync('chatList_cache')
    if (Array.isArray(cached)) {
      unreadChatCount.value = cached.reduce((sum, item) => sum + (item.unreadNum || 0), 0)
    }
  } catch (e) {}
}

onUnload(() => {
  uni.$off('socketMessage')
  uni.$off('chatHasUnread')
})

// TabBar配置
const tabbar = ref({
  current: 'index',
  data: [
    { name: 'message', title: '消息', icon: 'cuIcon-message' },
    { name: 'index', title: '协作', icon: 'cuIcon-group' },
    { name: 'people', title: '个人', icon: 'cuIcon-my' },
  ],
})

// Tab切换处理
const handleChange = ({ value }) => {
  if (isH5 && location.hash) {
    // 匹配所有可能的 current 参数值并替换
    const currentPattern = /current=(portal|message|index|people)/
    if (location.hash.match(currentPattern)) {
      location.hash = location.hash.replace(currentPattern, `current=${value}`)
    }
  }
  // 缓存当前（下次跳转到home打开对应的tab页面）
  uni.setStorageSync('home:current', value)
}

onShow(() => {})

onHide(() => {})

function initUserStatus() {
  http.get('/eoa/im/newApi/getUserByToken', { token: userStore.userInfo.token })
}
/**
 * 验证是否为默认密码
 */
function verifyIzDefaultPwd() {
  http.get('/sys/user/verifyIzDefaultPwd').then((res: any) => {
    if (res.success) {
      if (res.message.indexOf('yes') !== -1) {
        toast.warning('当前账号密码为默认密码，即将跳转至修改密码页面！')
        setTimeout(() => {
          router.push({ path: '/pages-user/password/password' })
        }, 2000)
      }
    }
  })
}
// 生命周期
onLoad((options) => {
  // 从缓存立即恢复未读数
  checkCacheUnread()
  // 监听聊天列表更新未读数（chatList加载完或卸载时触发，始终同步真实数量）
  uni.$on('chatHasUnread', (count: number) => {
    unreadChatCount.value = count
  })
  // 监听socket新消息，当不在消息tab时累加未读数
  uni.$on('socketMessage', (data: any) => {
    if (data?.event === 'event_chat_talk' && tabbar.value.current !== 'message') {
      // unreadChatCount.value++
      // if (unreadChatCount.value > 99) unreadChatCount.value = 99
    }
  })
  initUserStatus()
  // 优先从路由参数读取
  let currentTab = options?.current
  // 设置当前tab
  if (currentTab) {
    tabbar.value.current = currentTab
  } else {
    // 从缓存中读取
    const current = uni.getStorageSync('home:current')
    if (current) {
      tabbar.value.current = current
    }
  }
  // update-begin-author:liusq---date:2025-11-10--for: JHHB-999 【移动端】用户账号密码登录需要验证是否为默认密码，默认密码需要提示修改密码
  verifyIzDefaultPwd()
  // update-end-author:liusq---date:2025-11-10--for: JHHB-999 【移动端】用户账号密码登录需要验证是否为默认密码，默认密码需要提示修改密码
})
</script>

<style lang="scss" scoped>
.wrap {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
  .content {
    flex: 1;
    min-height: 0;
    overflow-y: hidden;
  }
}
.tab-content {
  padding: 20rpx;
  .content-header {
    margin-bottom: 30rpx;
    .title {
      font-size: 36rpx;
      font-weight: bold;
      color: #333;
    }
  }
}
// update-begin-author:liaozhiyang date:2026-08-13 for:【LHZP-1693】门户及协作等底部显示不全
.native-tabbar-placeholder {
  flex: none;
  height: calc(50px + constant(safe-area-inset-bottom));
  height: calc(50px + env(safe-area-inset-bottom));
}
// update-end-author:liaozhiyang date:2026-08-13 for:【LHZP-1693】门户及协作等底部显示不全
// TabBar样式
:deep(.wd-tabbar) {
  --wot-tabbar-item-title-font-size: 24rpx;
  background: white;
  border-top: 1rpx solid #eee;

  .cIcon {
    font-size: 40rpx;
    margin-bottom: 8rpx;
    color: #aaa;
    transition: all 0.3s ease;

    &.active {
      color: #39b54a;
      transform: scale(1.1);
    }
  }
}
.tabbar-icon-wrap {
  position: relative;
  display: inline-block;
}
.tabbar-red-dot {
  position: absolute;
  top: -4rpx;
  right: -8rpx;
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background-color: #f5222d;
}
.tabbar-badge {
  position: absolute;
  top: -6rpx;
  right: -16rpx;
  min-width: 32rpx;
  height: 32rpx;
  line-height: 32rpx;
  padding: 0 6rpx;
  border-radius: 16rpx;
  background-color: #f5222d;
  color: #fff;
  font-size: 20rpx;
  text-align: center;
  box-sizing: border-box;
}
</style>
