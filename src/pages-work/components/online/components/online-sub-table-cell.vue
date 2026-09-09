<template>
  <view class="onlineTableCell">
    <!--图片-->
    <template v-if="column?.type === 'image'">
      <template v-if="record[column.key]">
        <wd-img
          width="30"
          height="30"
          :src="getFirstImg(record[column.key])"
          @click="handleClickImg"
        ></wd-img>
        <ImgPreview
          v-if="imgPreview.show"
          :urls="imgPreview.urls"
          @close="() => (imgPreview.show = false)"
        ></ImgPreview>
      </template>
      <template v-else>
        <text>无图片</text>
      </template>
    </template>
    <!--下载-->
    <template v-else-if="column?.type === 'file'">
      <template v-if="record[column.key]">
        <wd-button @click="handleDownload(record[column.key])">下载</wd-button>
      </template>
      <template v-else>
        <text>无文件</text>
      </template>
    </template>
    <template v-else-if="['markdown', 'umeditor'].includes(column?.type)">
        <rich-text :nodes="record[column.key]"></rich-text>
    </template>
    <template v-else-if="column?.type === 'pca'">
      <text class="ellipsis-2">{{ getPcaText(record[column.key])}}</text>
    </template>
    <template v-else-if="['datetime', 'date'].includes(column?.type)">
      <text class="ellipsis-2">{{ getFormatDate(record[column.key], column) }}</text>
    </template>
    <template v-else-if="column?.type === 'link_table'">
      <text class="ellipsis-2">
        {{ record[column.key + '_dictText'] ?? record[column.key] }}
      </text>
    </template>
    <template v-else-if="['cat_tree', 'sel_tree'].includes(column?.type)">
      <text class="ellipsis-2">{{ asyncText }}</text>
    </template>
    <template v-else>
      <text class="ellipsis-2">{{ renderVal(record, column)}}</text>
    </template>
  </view>
</template>

<script setup lang="ts">
import { getFormatDate, filterMultiDictText } from '@/common/uitls'
import {isArray, isString} from '@/utils/is'
import { getFileAccessHttpUrl } from '@/common/uitls'
import { getAreaTextByCode } from '@/common/areaData/Area'
import { http } from '@/utils/http'
defineOptions({
  name: 'OnlineSubTableCell',
  options: {
    styleIsolation: 'shared',
  },
})
const api = {
  // 分类字典树
  loadCategoryDictItem: '/sys/category/loadDictItem',
  // 自定义字典树
  loadDictItem: '/sys/dict/loadDictItem',
}
const props = defineProps({
  columnsInfo: {
    type: Object,
    default: () => {},
  },
  column: {
    type: Object,
    default: () => {},
  },
  record: {
    type: Object,
    default: () => {},
  },
})
const imgPreview = ref({
  show: false,
  urls: [],
})
const asyncText = ref('')
// 下载
const handleDownload = (text) => {
  uni.downloadFile({
    url: text,
    success: (res) => {
      if (res.statusCode === 200) {
        console.log('下载成功')
        console.log(res);
      }
    },
  })
}
// 省市区
const getPcaText = (code) => {
  if (!code) {
    return ''
  }
  return getAreaTextByCode(code)
}
// 列表只显示第一张图
const getFirstImg = (text) => {
  if (isString(text)) {
    var imgs = text.split(',')
    return getFileAccessHttpUrl(imgs[0])
  } else {
    return ''
  }
}
// 点击图时
const handleClickImg = () => {
  imgPreview.value.show = true
}
// 渲染值
const renderVal = (record, column) => {
  const { type , key } = column
  let text = record[key]
  if (['date', 'Date'].includes(type)) {
    if (!text) {
      return ''
    }
    if (text.length > 10) {
      return text.substring(0, 10)
    }
    return text
  } else if (['popup_dict'].includes(type)) {
    const dict = record[key + '_dictText']
    if (dict != undefined) {
      return record[key + '_dictText']
    }
    return text
  } else if (['checkbox'].includes(type) && column?.customValue && isArray(column?.customValue)) {
    return column?.customValue.includes(text) ? '是' : '否'
  }
  //字典值翻譯
  if(props.columnsInfo?.dictOptions && props.columnsInfo?.dictOptions[key]){
    return filterMultiDictText(props.columnsInfo.dictOptions[key], text + '')
  }
  return text
}
const getAsyncText = () => {
  // link_table 由父组件 sub-many 统一批量翻译，cell 内只处理树形字段
  if (!['cat_tree', 'sel_tree'].includes(props.column?.type)) return
  const field = props.column['key']
  const ids = props.record[field]
  if (!ids) return
  if (props.column.type == 'cat_tree') {
    http.get(api.loadCategoryDictItem, { ids: ids }).then((res: any) => {
      if (res.success) {
        asyncText.value = res.result.join(',')
      }
    })
  } else if (props.column.type == 'sel_tree') {
    const dictText = props.column['dictText'].split(',')
    http
      .get(`${api.loadDictItem}/${props.column['dictTable']},${dictText[2]},${dictText[0]}`, {
        key: ids,
      })
      .then((res: any) => {
        if (res.success) {
          asyncText.value = res.result.join(',')
        }
      })
  }
}
// 初始化
const init = () => {
  const field = props.column.dataIndex
  if (props.column?.customRender === 'imgSlot') {
    const text = props.record[field]
    if (isString(text)) {
      imgPreview.value.urls = text.split(',').map((item) => getFileAccessHttpUrl(item))
    } else {
      return ''
    }
  }
}
init()
// update-begin-author:liaozhiyang date:2026-05-12 for:【QQYUN-15414】online子表支持关联记录、分类字典树、自定义字典树
// 树形字段（cat_tree / sel_tree）的 cell 在父组件编辑保存后可能被复用，
// setup 只跑一次拿不到新值；监听字段值变化主动重新翻译。
watch(
  () => props.record?.[props.column?.key],
  () => {
    asyncText.value = ''
    getAsyncText()
  },
  { immediate: true },
)
// update-end-author:liaozhiyang date:2026-05-12 for:【QQYUN-15414】online子表支持关联记录、分类字典树、自定义字典树
</script>

<style lang="scss" scoped>
:deep(.wd-button) {
  --wot-button-medium-height: 30px;
  --wot-button-medium-fs: 12px;
  --wot-button-medium-padding: 8px;
  &.is-medium.is-round {
    min-width: 80px;
  }
}
</style>
