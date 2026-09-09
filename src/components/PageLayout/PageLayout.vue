<template>
  <view class="pageLayout" :style="rootStyle">
    <view
      v-if="navbarShow"
      :class="{ pageNav: true, transparent: navBgTransparent, fixed: navFixed }"
      :style="{ height: `${statusBarHeight + navHeight}px` }"
    >
      <view class="statusBar" :style="{ height: `${statusBarHeight}px` }"></view>
      <wd-navbar
        :bordered="false"
        :title="navTitle"
        :leftText="navLeftText"
        :leftArrow="navLeftArrow"
        :rightText="isMp ? '' : navRightText"
        @clickLeft="handleClickLeft"
        @clickRight="handleClickRight"
        :custom-class="getClass()"
      >
        <template v-if="isMp === false && $slots.navRight" #right>
          <slot name="navRight"></slot>
        </template>
        <template v-if="isMp" #left>
          <!-- 为了在小程序上美观 -->
          <template v-if="$slots.navRight && isShowNavRightTextMp">
            <view class="btnGroup">
              <view class="left" @click.stop="handleClickLeft">{{ navLeftText }}</view>
              <view class="right" @click.stop="() => emit('navRightMp')">{{ navRightTextMp }}</view>
            </view>
          </template>
          <template v-else-if="$slots.navLeft">
            <slot name="navLeft"></slot>
          </template>
          <template v-else>
            <view class="mpNavLeft" @click.stop="handleClickLeft">
              <wd-icon v-if="navLeftArrow" name="thin-arrow-left" size="14px"></wd-icon>
              <view>{{ navLeftText }}</view>
            </view>
          </template>
        </template>
      </wd-navbar>
    </view>
    <view class="pageContent">
      <view class="content">
        <slot></slot>
      </view>
      <!--微信中导航右侧的在这儿生成-->
      <view class="navRight" v-if="isMp && !$slots.navRight && mpNavRightIsBottom && navRightText">
        <wd-button @click="handleClickRight">{{ navRightText }}</wd-button>
      </view>
    </view>
    <view class="tabbar"></view>
  </view>
</template>

<script setup lang="ts">
import { useSlots } from 'vue'
import { useRouter } from '@/plugin/uni-mini-router'
import { useParamsStore } from '@/store/page-params'
import { isMp, isH5 } from '@/utils/platform'
import { HOME_PAGE } from '@/common/constants'
// const isMp = true
defineOptions({
  name: 'pageLayout',
  options: {
    // apply-shared‌：当前页面样式会影响到子组件样式.(小程序)
    // shared‌：当前页面样式影响到子组件，子组件样式也会影响到当前页面.(小程序)
    styleIsolation: 'shared',
  },
})
const paramsStore = useParamsStore()
const router = useRouter()
const props = defineProps({
  backRouteName: {
    type: String,
    default: '',
  },
  backRoutePath: {
    type: String,
    default: '',
  },
  routeParams: {
    type: Object,
    default: () => {},
  },
  routeQuery: {
    type: Object,
    default: () => {},
  },
  routeMethod: {
    type: String,
    default: 'replace',
  },
  navbarShow: {
    type: Boolean,
    default: true,
  },
  navBgTransparent: {
    type: Boolean,
    default: false,
  },
  navFixed: {
    type: Boolean,
    default: false,
  },
  type: {
    type: String,
    default: 'page', // 'page','popup'
  },
  navTitle: {
    type: String,
    default: '',
  },
  navLeftText: {
    type: String,
    default: '返回',
  },
  navLeftArrow: {
    typeof: Boolean,
    default: true,
  },
  navRightText: {
    typeof: String,
    default: '',
  },
  // 当有右侧有slot时，在小程序上不显示slot，显示文字 (默认显示)
  isShowNavRightTextMp: {
    typeof: Boolean,
    default: true,
  },
  // 当有右侧有slot时，在小程序上不显示slot，显示文字
  navRightTextMp: {
    typeof: String,
    default: '确定',
  },
  // 右侧的文本在小程序端是否生成在页面底部（否：就得业务中自己写）
  mpNavRightIsBottom: {
    typeof: Boolean,
    default: true,
  },
  // 减去额外的高度
  minusHeight: {
    typeof: Number,
    default: 0,
  },
})
const slot = useSlots()
const globalData = getApp().globalData
const { systemInfo, navHeight } = globalData
const { statusBarHeight } = systemInfo
const emit = defineEmits(['navBack', 'navRight', 'navRightMp'])
const handleClickLeft = () => {
  emit('navBack')
  // 只有在页面中才默认返回，弹层中不返回
  if (props.type === 'page') {
    const pages = getCurrentPages()
    // update-begin--author:liaozhiyang---date:20260813---for:【LHZP-1639】h5刷新后点击返回，返回到门户页
    if (isH5 && pages.length <= 1) {
      clearPageParamsCache()
      router.replace({ path: HOME_PAGE, query: { current: 'index' } })
      return
    }
    // update-end--author:liaozhiyang---date:20260813---for:【LHZP-1639】h5刷新后点击返回，返回到门户页
    if (props.backRouteName || props.backRoutePath) {
      const prevPage = pages[pages.length - 2]
      if (prevPage) {
        const route = prevPage.route
        const name = route.split('/').pop()
        if (route === props.backRoutePath || props.backRouteName === name) {
          router.back()
          clearPageParamsCache()
          return
        }
      }
      // update-begin--author:liaozhiyang---date:20250917---for：【JHHB-551】指定路由返回报错，兜底返回上一层
      if (props.backRouteName) {
        router[props.routeMethod]({ name: props.backRouteName, params: props.routeParams }).catch(
          () => {
            router.back()
          },
        )
        clearPageParamsCache()
      } else {
        router[props.routeMethod]({ name: props.backRoutePath, query: props.routeQuery }).catch(
          () => {
            router.back()
          },
        )
        clearPageParamsCache()
      }
      // update-end--author:liaozhiyang---date:20250917---for：【JHHB-551】指定路由返回报错，兜底返回上一层
    } else {
      router.back()
      clearPageParamsCache()
    }
  }
}
const clearPageParamsCache = () => {
  // 清除页面传参缓存
  const pages = getCurrentPages()
  const curPage = pages[pages.length - 1]
  const curRoute = curPage.route
  const name = curRoute.split('/').pop()
  paramsStore.clearPageParams(name)
}
const handleClickRight = () => {
  emit('navRight')
}
const getClass = () => {
  const cls = `nav ${isMp ? 'mp' : ''} ${slot.navRight ? 'slot_navRight' : ''}`
  return cls
}
console.log('props:', props)
const rootStyle = computed(() => {
  const result: any = {}
  if (props.minusHeight) {
    result.height = `calc(100vh - ${props.minusHeight}px)`
  }
  return result
})
</script>

<style lang="scss" scoped>
.pageLayout {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh; /* 兜底 */
  /* #ifdef H5 */
  height: 100dvh; /* H5 修复底部遮挡 */
  /* #endif */
  .pageNav {
    background-image: linear-gradient(45deg, #0081ff, #1cbbb4);
    &.transparent {
      background-image: none;
    }
    &.fixed {
      position: fixed;
      top: 0;
      left: 0;
      z-index: 1;
      width: 100%;
    }
    .statusBar {
      width: 100%;
      height: 0;
    }
    :deep(.wd-navbar) {
      background-color: transparent;
      --wot-navbar-title-font-weight: 400;
      --wot-navbar-arrow-size: 18px;
      --wot-navbar-desc-font-size: 14px;
      --wot-navbar-title-font-size: 16px;
      &.mp {
        &.slot_navRight {
          padding-right: 90px;
          .wd-navbar__text {
            display: none;
          }
          .wd-navbar__content {
            display: flex;
          }
          .wd-navbar__left,
          .wd-navbar__title,
          .wd-navbar__right {
            position: static;
          }
          .btnGroup {
            min-width: 92px;
          }
          .wd-navbar__title {
            max-width: 50%;
          }
        }
      }
    }
  }
  .pageContent {
    display: flex;
    flex: 1;
    flex-direction: column;
    overflow: hidden;
    background-color: #f1f1f1;
    .content {
      display: flex;
      flex: 1;
      flex-direction: column;
      overflow: hidden;
    }
    .navRight {
      padding: 15px;
      padding-top: 10px;
      display: flex;
      margin-bottom: calc(constant(safe-area-inset-bottom));
      margin-bottom: calc(env(safe-area-inset-bottom));
      justify-content: flex-end;
      :deep(.wd-button) {
        --wot-button-medium-height: 38px;
        width: 70%;
        display: block;
        margin: 0 auto;
      }
    }
  }
  .tabbar {
    /* #ifdef H5 */
    height: var(--window-bottom);
    /* #endif */
  }
  .btnGroup {
    display: flex;
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.6);
    height: 28px;
    line-height: 28px;
    color: #fff;
    align-items: center;
    .left {
      border-right: 1px solid rgba(255, 255, 255, 0.6);
    }

    .left,
    .right {
      padding: 0 8px;
      font-size: 14px;
    }
  }
  .mpNavLeft {
    display: flex;
    color: #fff;
  }
}
</style>
