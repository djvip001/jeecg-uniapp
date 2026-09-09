<!-- 使用 type="home" 属性设置首页，其他页面不需要设置，默认为page；推荐使用json5，更强大，且允许注释 -->
<route lang="json5" type="home">
{
  layout: 'default',
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '首页',
    disableScroll: true, // 微信禁止页面滚动
    'app-plus': {
      bounce: 'none', // 禁用 iOS 弹性效果
    },
  },
}
</route>
<template>
  <PageLayout :navbarShow="false">
    <scroll-view class="scrollView" :scroll-y="true" scroll-with-animation>
      <view style="margin-bottom: 14px" v-for="(item, index) in layout" :key="index">
        <portalItem :item="item" @item-click="goPage"></portalItem>
      </view>
      <view class="tabbarPlaceholder"></view>
    </scroll-view>
  </PageLayout>
</template>

<script lang="ts" setup>
import { onLoad, onReady, onShow } from '@dcloudio/uni-app'
import { useRouter } from '@/plugin/uni-mini-router'
import { http } from '@/utils/http'
import { useToast } from 'wot-design-uni/components/wd-toast'
import portalItem from '@/pages-appPortal/components/appPortalItem.vue'
import { ref } from 'vue'
import { hasRoute } from '@/common/uitls'
defineOptions({
  name: 'index',
  options: {
    styleIsolation: 'shared',
  },
})
const router = useRouter()
const toast = useToast()
const layout = ref([])

const goPage = (item) => {
  let page = item.routeIndex
  console.log('-----------goPage-----routeIndex-------', page)
  if (!page) {
    toast.info('该功能暂未实现')
  } else {
    if (page.startsWith('/app/online')) {
      let code = page.substring(page.lastIndexOf('/') + 1)
      let real = { desformCode: code, desformName: item.title }
      uni.navigateTo({
        url: '/pages-work/onlinePage/onlineAdd?item=' + encodeURIComponent(JSON.stringify(real)),
      })
    } else if (page.startsWith('/app/desform')) {
      let code = page.substring(page.lastIndexOf('/') + 1)
      let real = { desformCode: code, desformName: item.title }
      uni.navigateTo({
        url: '/pages/check/designForm/designForm?item=' + encodeURIComponent(JSON.stringify(real)),
      })
    } else {
      console.log('-----------goPage-----routeIndex-------', page)
      if (hasRoute({ name: page })) {
        router.replace({ name: page, params: { backRouteName: 'index', routeMethod: 'pushTab' } })
      } else {
        const params = { code: page }
        console.log('home页面跳转详情页面', params)
        uni.navigateTo({
          url: `/pages/portal/detail?data=${encodeURIComponent(JSON.stringify(params))}`,
        })
      }
    }
  }
}
const getAppConfigRoute = () => {
  http.get('/portalapp/portalDesign/queryPortalRoot', { bizMode: 'app' }).then((res: any) => {
    let { success, result } = res
    if (success && result && result.length > 0) {
      let { appComponentData } = JSON.parse(result[0].designJson)
      console.log('更新首页配置componentData', appComponentData)
      if (appComponentData && appComponentData.length > 0) {
        layout.value = appComponentData.sort((a, b) => a.y - b.y)
      } else {
        layout.value = []
      }
    }
  })
}
onShow(() => {
  console.log('index页面：onShow')
  getAppConfigRoute()
})
onLoad(() => {
  console.log('index页面：onLoad')
})
onReady(() => {
  console.log('index页面：onReady')
})
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
