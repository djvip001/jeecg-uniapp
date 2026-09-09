<template>
  <view
    class="wrap"
    :style="{
      '--nav-height': `${statusBarHeight + navHeight}px`,
      '--status-bar-height': `${statusBarHeight}px`,
    }"
  >
    <wd-tabs :customClass="getClass()" v-model="tabActive">
      <template v-for="(item, index) in tabList" :key="index">
        <wd-tab :title="item.title" :name="item.key">
          <view class="flow" @click="handleGo">
            <view class="content">
              <view class="cuIcon-roundcheck"></view>
              <view class="text">流程待办</view>
            </view>
          </view>
          <view class="mainContent">
            <chatList v-if="item.key === '1'" class="message-list"></chatList>
            <addressBookList v-if="item.key === '2'" class="message-list"></addressBookList>
          </view>
        </wd-tab>
      </template>
    </wd-tabs>
  </view>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import chatList from './components/chatList.vue'
import addressBookList from './components/addressBookList.vue'
import { platform, isMp } from '@/utils/platform'
import { useRouter } from '@/plugin/uni-mini-router'
import { useParamsStore } from '@/store/page-params'
import appBadge from '@/common/appBadge'
defineOptions({
  name: 'message',
  options: {
    // apply-shared‌：当前页面样式会影响到子组件样式.(小程序)
    // shared‌：当前页面样式影响到子组件，子组件样式也会影响到当前页面.(小程序)
    styleIsolation: 'shared',
  },
})

const paramsStore = useParamsStore()
const router = useRouter()
const globalData = getApp().globalData
const { systemInfo, navHeight } = globalData
const { statusBarHeight } = systemInfo
console.log('systemInfo:::', systemInfo)
const tabList = ref([
  { key: '1', title: '消息' },
  { key: '2', title: '通讯录' },
])
const tabActive = ref<string>('1')
const getClass = () => {
  return `${platform} ${isMp ? 'mp' : ''}`
}
const handleGo = () => {
  paramsStore.setPageParams('flowIndex', {
    backRouteName: 'home',
  })
  router.push({ name: 'flowIndex' })
}
onLoad(() => {
  // 更新角标数量
  appBadge()
})
</script>

<style lang="scss" scoped>
.pageLayout {
  height: 100%;
}
.wrap {
  height: 100%;
}
:deep(.wd-tabs) {
  display: flex;
  flex-direction: column;
  height: 100%;
  &.mp {
    .wd-tabs__nav-container {
      padding-right: 87px;
    }
  }
  .wd-tabs__nav {
    height: var(--nav-height);
    padding-top: var(--status-bar-height);
    background: linear-gradient(45deg, #0081ff, #1cbbb4);
    .wd-tabs__nav-item {
      color: #fff;
    }
  }
  .wd-tabs__container {
    flex: 1;
    width: 100%;
    display: flex;
    flex-direction: column;
  }
  .wd-tabs__body {
    position: relative;
    flex: 1;
  }
  .wd-tabs__line {
    background-color: #fff;
  }
}
:deep(.wd-tab) {
  .wd-tab__body {
    position: absolute;
    top: 0;
    left: 0;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
  }
}
.flow {
  position: relative;
  z-index: 1;
  padding-bottom: 5px;
  background: #fff;
  box-shadow: 0 1px 3px 1px rgba(0, 0, 0, 0.1);
  .content {
    display: flex;
    align-items: center;
    height: 50px;
    padding-left: 15px;
    font-size: 16px;
    color: #666;
    background-color: #f8f8f8;
  }
  .text {
    margin-left: 6px;
    color: #333;
  }
}
.mainContent {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.message-list {
  flex: 1;
  min-height: 0;
  height: 100%;
}
</style>
