<template>
  <PageLayout :navbarShow="false">
    <!--轮播图-->
    <!-- prettier-ignore -->
    <swiper class="swiper" :indicator-dots="true" :circular="true" :autoplay="true" :interval="5000" :duration="500">
      <!--本地配置轮播图-->
      <swiper-item v-for="(item, index) in swiperList" :key="index" v-if="isLocalConfig">
        <image :src="item.url" mode="aspectFill" v-if="item.type == 'image'"></image>
        <video :src="item.url" autoplay loop muted :show-play-btn="false" :controls="false"  objectFit="cover"  v-if="item.type == 'video'"></video>
      </swiper-item>
      <!--线上配置轮播图-->
      <swiper-item v-for="(item, index) in carouselList" :key="index" v-if="!isLocalConfig">
        <image :src="getFileAccessHttpUrl(item)" mode="aspectFill"></image>
      </swiper-item>
    </swiper>
    <scroll-view class="scrollView" :scroll-y="true" scroll-with-animation>
      <!--流程服务-->
      <wd-row>
        <wd-col :span="12" v-for="(item, index) in middleApps" :key="index">
          <view class="box" @click="goTo(item.routeIndex)">
            <wd-img :width="50" :height="50" :src="getFileAccessHttpUrl(item.icon)"></wd-img>
            <view class="textBox">
              <wd-text :text="item.title"></wd-text>
              <wd-text :text="item.subTitle"></wd-text>
            </view>
          </view>
        </wd-col>
      </wd-row>
      <!--常用服务-->
      <view class="serveBox">
        <view class="title">
          <view class="dot"></view>
          <wd-text text="常用服务"></wd-text>
        </view>
        <Grid :column="4" v-model="usList" @itemClik="goPage"></Grid>
      </view>
      <!--其他服务-->
      <view class="serveBox">
        <view class="title">
          <view class="dot"></view>
          <wd-text text="其他服务"></wd-text>
        </view>
        <Grid :column="4" v-model="osList" @itemClik="goPage"></Grid>
      </view>
    </scroll-view>
  </PageLayout>
</template>

<script lang="ts" setup>
import { nextTick, ref } from 'vue'
import { TestEnum } from '@/typings'
import { us, os } from '@/common/work'
// 获取当前运行平台
import PLATFORM from '@/utils/platform'
import { cache, getFileAccessHttpUrl, hasRoute } from '@/common/uitls'
import { onLaunch, onShow, onHide, onLoad, onReady } from '@dcloudio/uni-app'
import { useToast } from 'wot-design-uni/components/wd-toast'
import { useRouter } from '@/plugin/uni-mini-router'
import { useParamsStore } from '@/store/page-params'
import Grid from '@/components/Grid/Grid.vue'

import {
  ACCESS_TOKEN,
  USER_NAME,
  USER_INFO,
  APP_ROUTE,
  APP_CONFIG,
  HOME_CONFIG_EXPIRED_TIME,
} from '@/common/constants'
import { http } from '@/utils/http'

defineOptions({
  name: 'index_local',
  options: {
    // apply-shared‌：当前页面样式会影响到子组件样式.(小程序)
    // shared‌：当前页面样式影响到子组件，子组件样式也会影响到当前页面.(小程序)
    styleIsolation: 'shared',
  },
})
const toast = useToast()
const router = useRouter()
const paramsStore = useParamsStore()
// 获取屏幕边界到安全区域距离
const { safeAreaInsets } = uni.getSystemInfoSync()
const isLocalConfig = getApp().globalData.isLocalConfig
const carouselList = ref([])
const swiperList = ref([])
const middleApps = ref([])
const usList = ref([])
const osList = ref([])
const msgCount = ref(0)
const dot = ref({ mailHome: false })
const goPage = (item) => {
  let page = item.routeIndex
  console.log('-----------page------------', page)
  if (!page) {
    toast.info('该功能暂未实现')
  } else {
    if (['other', 'common'].includes(page)) {
      goPageMore(page)
      return
    }
    if (page === 'annotationList') {
      msgCount.value = 0
    }
    dot.value[page] = false
    if (page.indexOf('/app/online') == 0) {
      let code = page.substring(page.lastIndexOf('/') + 1)
      let real = { desformCode: code, desformName: item.title }
      router.push({
        name: 'onlineAdd',
        params: { ...real, backRouteName: 'index' },
      })
    } else if (page.indexOf('/app/desform') == 0) {
      let code = page.substring(page.lastIndexOf('/') + 1)
      let real = { desformCode: code, desformName: item.title }
      paramsStore.setPageParams('designForm', {
        backRouteName: 'index',
        routeMethod: 'pushTab',
        data: real,
      })
      router.push({ name: 'designForm' })
    } else {
      if (!hasRoute({ name: page })) {
        router.push({ name: 'demo', params: { backRouteName: 'index', routeMethod: 'pushTab' } })
      } else {
        router.push({ name: page, params: { backRouteName: 'index', routeMethod: 'pushTab' } })
      }
    }
  }
}
const getAppConfigRoute = () => {
  //判断是否过期
  let config = cache(APP_CONFIG)
  if (config) {
    homeConfig()
  } else {
    //更新首页配置
    http.get('/eoa/sysAppConfig/queryAppConfigRoute').then((res: any) => {
      console.log('更新首页配置res', res)
      let result = res
      if (result.success) {
        cache(APP_ROUTE, result.result.route, HOME_CONFIG_EXPIRED_TIME)
        cache(APP_CONFIG, result.result.config, HOME_CONFIG_EXPIRED_TIME)
        homeConfig()
      }
    })
  }
}
//跳转路由
const goTo = (name) => {
  if (!hasRoute({ name })) {
    router.push({ name: 'demo' })
  } else {
    router.push({ name })
  }
}
//加载首页配置
const homeConfig = async () => {
  const indexRouteList = cache(APP_ROUTE)
  const appConfig = cache(APP_CONFIG)
  // 防止缓存过期或不存在时，indexRouteList/appConfig 为 undefined 导致 filter 报错
  if (!indexRouteList || !appConfig || !Array.isArray(indexRouteList)) {
    console.warn('homeConfig: 缓存数据不存在或已过期，使用空数据')
    usList.value = [
      { text: '更多', img: '/static/index/128/more.png', routeIndex: 'common', itemKey: 'common' },
    ]
    osList.value = [
      { text: '更多', img: '/static/index/128/more.png', routeIndex: 'other', itemKey: 'other' },
    ]
    middleApps.value = []
    carouselList.value = []
    return
  }
  nextTick(() => {
    usList.value = indexRouteList
      .filter((item) => item.type == 'common')
      .map((item) => {
        return {
          ...item,
          text: item.title,
          img: item.icon,
          itemKey: item.routeIndex,
        }
      })
    osList.value = indexRouteList
      .filter((item) => item.type == 'other')
      .map((item) => {
        return {
          ...item,
          text: item.title,
          img: item.icon,
          itemKey: item.routeIndex,
        }
      })
    middleApps.value = indexRouteList
      .filter((item) => item.type == 'approve')
      .map((item) => {
        return {
          ...item,
          text: item.title,
          img: item.icon,
          itemKey: item.routeIndex,
        }
      })
    let carouselImgStr = appConfig[0].carouselImgJson
    const carouselImgArr =
      carouselImgStr && carouselImgStr.length > 0 ? carouselImgStr.split(',') : []
    carouselList.value = carouselImgArr
    usList.value.push({
      text: '更多',
      img: '/static/index/128/more.png',
      routeIndex: 'common',
      itemKey: 'common',
    })
    osList.value.push({
      text: '更多',
      img: '/static/index/128/more.png',
      routeIndex: 'other',
      itemKey: 'other',
    })
  })
}
const goPageMore = (page) => {
  router.push({ name: 'more', params: { backRouteName: 'index', type: page } })
}
onLoad(() => {
  console.log('index页面：onLoad')
})
onReady(() => {
  console.log('index页面：onReady')
})

if (isLocalConfig) {
  usList.value = us.data.map((item) => ({
    ...item,
    text: item.title,
    img: item.icon,
    itemKey: item.routeIndex,
  }))
  osList.value = os.data.map((item) => ({
    ...item,
    text: item.title,
    img: item.icon,
    itemKey: item.routeIndex,
  }))
  usList.value.push({
    text: '更多',
    img: '/static/index/128/more.png',
    routeIndex: 'common',
    itemKey: 'common',
  })
  osList.value.push({
    text: '更多',
    img: '/static/index/128/more.png',
    routeIndex: 'other',
    itemKey: 'other',
  })
  middleApps.value = [
    {
      icon: 'https://static.jeecg.com/upload/test/line2_icon1_1595818065964.png',
      title: '审批',
      subTitle: '个人审批',
      routeIndex: 'paper',
    },
    {
      icon: 'https://static.jeecg.com/upload/test/line2_icon2_1595818070168.png',
      title: '审批稿',
      subTitle: '审批草稿箱',
      routeIndex: 'draft',
    },
  ]
  swiperList.value = [
    {
      id: 1,
      type: 'image',
      url: 'https://static.jeecg.com/upload/test/oabanner-2_1595648520760.png',
      link: '',
    },
    {
      id: 3,
      type: 'image',
      url: 'https://static.jeecg.com/upload/test/oabanner-2_1595648520760.png',
      link: '',
    },
  ]
} else {
  getAppConfigRoute()
}
</script>

<style lang="scss" scoped>
.pageLayout {
  height: 100%;
}
.swiper {
  height: 375upx;
  flex: none;
  image,
  video {
    width: 100%;
    display: block;
    height: 100%;
    margin: 0;
  }
  :deep(.uni-swiper-dot) {
    transition: all 400ms ease;
    background-color: rgba(255, 255, 255, 0.4);
    width: 5px;
    height: 5px;
    border-radius: 50%;
    margin: 0 4px;
  }
  :deep(.uni-swiper-dot-active) {
    background-color: rgba(255, 255, 255, 1);
    width: 16px;
    border-radius: 2px;
  }
}
.scrollView {
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 0;
  min-height: 0;
  background-color: #f1f1f1;
  .tabbarPlaceholder {
    height: calc(50px + constant(safe-area-inset-bottom));
    height: calc(50px + env(safe-area-inset-bottom));
  }
  :deep(.wd-row) {
    background-color: #fff;
    margin-bottom: 32upx;
    .wd-col {
      .box {
        display: flex;
        align-items: center;
        justify-content: center;
        &:first-child {
          border-right: 1px solid rgba(165, 165, 165, 0.1);
        }
        .wd-img {
          margin: 20upx;
          margin-left: 0;
        }
        .textBox {
          text-align: center;
          display: flex;
          flex-direction: column;
          .wd-text {
            color: #666;
            &:last-child {
              font-weight: 200;
            }
          }
        }
      }
    }
  }
  .serveBox {
    margin-bottom: 32upx;
    background-color: #fff;
    &:last-child {
      .title {
        .dot {
          background-color: #fbbd08;
        }
      }
    }
    :deep(.wd-grid-item) {
      &:not(.enabled) {
        // filter: grayscale(1);
      }
    }
    .title {
      display: flex;
      align-items: center;
      padding-left: 30upx;
      height: 52px;
      .dot {
        width: 14upx;
        height: 14upx;
        background-color: #0081ff;
        border-radius: 100%;
        margin-right: 20upx;
      }
      .wd-text {
        color: #666;
        font-size: 15px;
      }
    }
  }
}
</style>
