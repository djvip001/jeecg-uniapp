<route lang="json5" type="page">
{
  layout: 'default',
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '仪表盘',
    disableScroll: true, // 微信禁止页面滚动
    'app-plus': {
      bounce: 'none', // 禁用 iOS 弹性效果
    },
  },
}
</route>

<template>
  <PageLayout :navTitle="title">
    <scroll-view
      class="scroll-area"
      :scroll-y="true"
      :scroll-with-animation="scrollAnimation"
      :scroll-top="scrollTop"
      :scroll-into-view="scrollToView"
    >
      <template v-if="dragData.compsData.length">
        <view v-for="(item, index) in dragData.compsData" :key="index">
          <template v-if="compList.includes(item.component)">
            <view
              class="drag-block bg-white"
              @tap="focusPane(item)"
              :id="'drag' + item.i"
              :style="[getStyle(item)]"
            >
              <!-- #ifndef MP-WEIXIN -->
              <view
                v-if="
                  hasDrill && currentIndexHasDrill(item) && !noActionList.includes(item.component)
                "
                class="backIcon"
              >
                <view class="cuIcon-back" @tap.stop="drillBack(item.config)">上一级</view>
              </view>
              <!-- #endif -->
              <!-- #ifdef APP-PLUS || H5 -->
              <component
                :ref="COMP_NAME_PREFIX + item.i"
                :is="item.component"
                :compName="item.component"
                :i="item.i"
                :id="item.i"
                :size="item.config?.size"
                :config="item.config"
                :izBigScreen="dragData.style !== 'default'"
                :izDrill="
                  hasDrill && currentIndexHasDrill(item) && !noActionList.includes(item.component)
                "
              />
              <!-- #endif -->
              <!-- #ifdef MP-WEIXIN -->
              <dynamic-component
                :compName="item.component"
                :i.sync="item.i"
                :config.sync="item.config"
                :size="item.config?.size"
              ></dynamic-component>
              <!-- #endif -->
            </view>
          </template>
        </view>
      </template>
      <template v-else>
        <wd-status-tip url-prefix="/static/wot-assets/" image="content" tip="暂无内容" />
      </template>
    </scroll-view>
  </PageLayout>
</template>

<script lang="ts" setup>
import { compList, COMP_NAME_PREFIX } from '../components/common/concants'
import { http } from '@/utils/http'
// #ifdef MP-WEIXIN
import dynamicComponent from '../components/echarts/dynamic-component.vue'
// #endif
import { useLinkage } from '../components/hooks/useLinkage'
import { cache } from '@/common/uitls'
defineOptions({
  name: 'dragPage',
})
const title = ref('仪表盘示例')
const pageId = ref('')
const appId = ref('')
const compObj = ref({})
const dragData = ref({
  name: '',
  compsData: [],
  style: 'default',
})
//不包含操作的组件
const noActionList = [
  'JCustomButton',
  'JIframe',
  'JCarousel',
  'JDragEditor',
  'JText',
  'JNumber',
  'JFilterQuery',
]
const scrollY = true
const scrollAnimation = false
const scrollTop = 0
const scrollToView = '';
provide('dragData',dragData)
const getStyle = computed(() => {
  return (item: any) => {
    let component = item.component
    let isSetHeight = component === 'JDragEditor' ? false : true
    if (['JText','JNumber','JRadioButton','JList','JFilterQuery','JProgress','JForm'].includes(component)) {
      return {
        height: 'auto',
        zIndex: 1000,
      }
    }
    if (component === 'JCalendar') {
      return {
        minHeight: '600rpx',
        height: 'auto',
        zIndex: 1000,
      }
    }
    console.log('item', item)
    return {
      minHeight: '600rpx',
      height: isSetHeight ? '600rpx' : 'auto',
      zIndex: 1000,
      overflowX: 'auto',
      overflowY: 'hidden',
      // eslint-disable-next-line eqeqeq
      background: dragData.value.style == 'bigScreen' ? '#fff' : (item?.config?.background  || '#fff'),
      border: `1px solid ${item?.config?.borderColor || '#fff'}`,
    }
  }
})

const showBack = computed(() => {
  return (item: any) => {
    console.log('item', item)
    console.log('hasDrill.value', hasDrill.value)
    return hasDrill.value && currentIndexHasDrill(item)
  }
})

//查询仪表盘数据
function queryData() {
  http.get('/drag/page/queryById', { id: unref(pageId) }).then((res: any) => {
    if (res.success && res.result) {
      let result = res.result
      let template = result.template ? JSON.parse(result.template) : []
      dragData.value.name = result.name
      dragData.value.style = result?.style || 'default'
      title.value = result.name
      if(template && template.length > 0){
        template.forEach((item: any) => {
          if (item.component === 'JFilterQuery') {
            item['mobileY'] = 0
          } else {
            item['mobileY'] = item['mobileY'] || item['mobileY'] == 0 ? item['mobileY'] : 1
          }
          if (item.config.filter && !item.config.filter.customTime) {
            item.config.filter['customTime'] = []
          }
        })
        template.sort((a, b) => a.mobileY - b.mobileY)
        dragData.value.compsData = template || []
      }
    }
  })
}
//当前移入的节点
const currentIndex = ref('')
let { drillBack, hasDrill } = useLinkage(currentIndex)
//当前组件是否包含钻取
function currentIndexHasDrill(item) {
  console.log('currentIndexHasDrill:item', item)
  if (item.i == currentIndex.value) {
    const drillLocalJson = cache('drill:' + item.i)
    console.log('currentIndexHasDrill:drillLocalJson', drillLocalJson)
    if (drillLocalJson) {
      const drillParamArr = JSON.parse(drillLocalJson)
      if (drillParamArr && drillParamArr.length >= 0) {
        return true
      }
    }
  }
  return false
}
/**
 * 面板移入事件
 * @param  id 移入的id
 */
function focusPane(item) {
  currentIndex.value = item.i
}

onLoad((option) => {
  const params: any = option
  pageId.value = params.id
  queryData()
})
</script>

<style lang="scss" scoped>
.backIcon {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  font-weight: bold;
  font-size: 12px;
  padding: 2px 10px 0 0;
}
.drag-block {
  margin: 14px 14px 0 14px;
  border-radius: 10px;
}
</style>
