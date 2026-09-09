<template>
  <view class="form-container" :style="styleObject">
    <view class="cu-bar" @click="showDrawer">
      <view class="flex text-blue" style="width: 100%">
        <view>
          <text class="cuIcon-filter text-bold"></text>
          <text class="ml-1">查询条件</text>
        </view>
        <view>
          <text class="cuIcon-right text-bold"></text>
        </view>
      </view>
    </view>
  </view>
  <QueryDrawer ref="queryRef" :config="config" @ok="handleSubmit"></QueryDrawer>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import QueryDrawer from '@/pages-work/components/drag/form/QueryDrawer.vue'
import { cache } from '@/common/uitls'
import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'
dayjs.extend(weekday)
dayjs.extend(localeData)
const props = defineProps({
  i: {
    type: [String, Number],
    default: '',
  },
  id: {
    type: String,
    default: '',
  },
  size: {
    type: Object,
    default: () => {},
  },
  config: {
    type: Object,
    default: () => ({}) as any,
  },
  height: {
    type: Number,
  },
  compName: {
    type: String,
    default: '',
  },
  horizontal: {
    type: Boolean,
    default: false,
  },
  isView: {
    type: Boolean,
    default: true,
  },
  appId: {
    type: String,
    default: '',
  },
  izBigScreen: {
    type: Boolean,
    default: false,
  },
})
const queryRef = ref(null)
// 计算属性
const styleObject = computed(() => {
  return {
    width: '100%',
    height: '50px',
    borderRadius: '5px',
  }
})
// 关联组件刷新
const refreshComp = inject<any>('refreshComp')
const myFormData = ref({})
// 查询方法
function handleSubmit(dataSource, record) {
  const queryFormData = {}
  Object.assign(myFormData, { ...record })
  dataSource.forEach((item) => {
    const value = myFormData[item.key]
    // eslint-disable-next-line eqeqeq
    if (item.type == 'date') {
      if (item.searchMode === 'range' && value && value.length == 2) {
        const begin = dayjs(value[0]).format('YYYY-MM-DD')
        const end = dayjs(value[1]).format('YYYY-MM-DD')
        queryFormData[item.key] = [begin, end]
        queryFormData[item.key + '_begin'] = begin
        queryFormData[item.key + '_end'] = end
      } else {
        queryFormData[item.key] = dayjs(value).format('YYYY-MM-DD')
      }
    } else {
      queryFormData[item.key] = value
    }
  })
  const linkageConfig = props.config.linkageConfig
  // 1.判断联动配置是否存在
  if (linkageConfig && linkageConfig.length > 0) {
    // 2.将数据处理配置项成需求的格式[{id:'123,params:{sex:'1'.age:2}]}]
    const linkageParams = linkageConfig.map((item) => {
      const paramsObj = {}
      item.linkage.forEach((field) => {
        // 获取点击的对象的数值
        paramsObj[field.target] = queryFormData[field.source]
      })
      // 缓存联动信息
      const cachedData = cache(item.linkageId)
      if (cachedData) {
        cache(item.linkageId, Object.assign(cachedData, paramsObj))
      } else {
        cache(item.linkageId, paramsObj)
      }
      return { id: item.linkageId, params: paramsObj }
    })
    console.log('联动查询参数linkageParams：', queryFormData)
    refreshComp(linkageParams)
  }
}
function showDrawer() {
  queryRef.value.handleOpen(myFormData)
}
</script>

<style scoped lang="scss">
.flex {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
}
.text-bold {
  font-weight: bold;
}
</style>
