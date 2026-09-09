<template>
  <view>
    <wd-popup
      v-model="show"
      position="bottom"
      custom-style="width:100%;height: 70%;"
      @close="handleClose"
    >
      <view class="form-container">
        <wd-form ref="form" :model="myFormData">
          <template v-for="(item, index) in [...dataSource]" :key="index">
            <wd-input
              label-width="80px"
              border
              v-if="item.type === 'input'"
              v-model="myFormData[item.key]"
              :label="item.label"
            />
            <template v-if="item.type === 'select'">
              <online-multi
                v-if="item.searchMode === 'multi'"
                :label="item.label"
                type="list_multi"
                :dict="item.dictCode"
                v-model="myFormData[item.key]"
              ></online-multi>
              <online-select
                v-else
                :label="item.label"
                type="list"
                :dict="item.dictCode"
                v-model="myFormData[item.key]"
              ></online-select>
            </template>
            <template v-if="item.type === 'date'">
              <wd-calendar
                v-if="item.searchMode === 'range'"
                label-width="80px"
                :type="getDateRangeType(item.format)"
                v-model="myFormData[item.key]"
                :label="item.label"
              />
              <online-date
                v-else
                :label="item.label"
                :type="getDateType(item.format)"
                v-model:value="myFormData[item.key]"
              ></online-date>
            </template>
          </template>
        </wd-form>
        <view class="btn-area mt-14px">
          <wd-button plain type="info" @click="handleReset">重置</wd-button>
          <wd-button @click="handleSubmit">查询</wd-button>
        </view>
      </view>
    </wd-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { cloneDeep } from 'lodash-es'
import { echartProps } from '../props'
import OnlineSelect from '@/pages-work/components/online/view/online-select.vue'
import OnlineMulti from '@/pages-work/components/online/view/online-multi.vue'
import OnlineDate from '@/pages-work/components/online/view/online-date.vue'
import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'
dayjs.extend(weekday)
dayjs.extend(localeData)

const show = ref(false)
const emit = defineEmits(['ok'])
const handleClose = () => {
  show.value = false
}
const handleOpen = async (record) => {
  await queryData()
  Object.keys(myFormData.value).forEach((key) => {
    myFormData.value[key] = record[key]
  })
  show.value = true
}

// 定义 props
const props = defineProps(echartProps)
// 定义响应式数据
const dataSource = ref([])
const myFormData = ref({})

/**
 * 获取日期类型
 * @param format
 */
const getDateType = (format) => {
  switch (format) {
    case 'YYYY':
      return 'year'
    case 'YYYY-MM':
      return 'year-month'
    default:
      return 'date'
  }
}
/**
 * 获取日期类型
 * @param format
 */
const getDateRangeType = (format) => {
  switch (format) {
    case 'YYYY':
      return 'daterange'
    case 'YYYY-MM':
      return 'monthrange'
    default:
      return 'daterange'
  }
}
// 监听表单配置修改
watch(
  () => dataSource.value,
  () => {
    initFormData()
  },
)
// 重置方法
function handleReset() {
  initFormData()
  handleSubmit()
}
// 查询方法
function handleSubmit() {
  emit('ok', dataSource.value, myFormData.value)
  handleClose()
}
/**
 * 获取日期
 * @param date
 * @param num
 * @returns
 */
function getDay(date, num) {
  return dayjs(date).add(num, 'days').startOf('days').format('YYYY-MM-DD HH:mm:ss')
}
/**
 * 设置modal初始默认值
 */
function initFormData() {
  myFormData.value = {}
  dataSource.value.forEach((item) => {
    try {
      // 日期默认值支持昨天、今天，明天
      if (!item?.format) {
        item.format = 'YYYY-MM-DD'
      }
      if (item.value && item.type == 'date') {
        let value = item.value
        if (item.value.startsWith('=dateStr')) {
          const regex = /\(([^)]+)\)/ // 匹配括号及其内容，捕获括号内的内容
          const match = item.value.match(regex)
          if (match) {
            const day = match[1] // match[1] 是捕获组的内容
            value = getDay(new Date(), day)
          }
        }
        myFormData.value[item.key] = dayjs(value).valueOf()
      } else {
        myFormData.value[item.key] = item.value ? item.value : null
      }
    } catch (e) {
      console.log('初始化表单数据失败', e)
    }
  })
}
async function queryData() {
  console.log('queryData', props)
  if (!props.config.dataSetId) {
    // 静态数据处理字典编码
    dataSource.value = handleData()
  }
}
/**
 * 处理数据成需求格式
 * @param result
 */
function handleData() {
  const fields = cloneDeep(props.config.option?.fields) || []
  const arr = []
  if (fields && fields.length > 0) {
    // 判断有code的情况下，设置成select
    fields.forEach((field) => {
      if (field.izSearch == '1') {
        arr.push({
          label: field.fieldTxt,
          key: field.fieldName,
          type: field.widgetType,
          dictCode: field.dictCode,
          searchMode: field.searchMode,
          value: field.defaultValue,
          format: field.dateFormat,
        })
      }
    })
  }
  return arr
}
defineExpose({
  handleOpen,
})
</script>

<style scoped lang="scss">
.btn-area {
  display: flex;
  justify-content: space-evenly;
  align-items: center;
}
.form-container {
  padding: 10px;
  overflow: auto;
  :deep(.wd-cell-group__body) {
    background-color: #f1f1f1;
  }
  .onlineLoader-form {
    :deep(.wd-input__label-inner) {
      font-size: 16px;
    }
    :deep(.wd-picker__label) {
      font-size: 16px;
    }
    :deep(.wd-select-picker__label) {
      font-size: 16px;
    }
    :deep(.wd-cell__title) {
      font-size: 16px;
    }
    :deep(.wd-textarea__label-inner) {
      font-size: 16px;
    }
    :deep(.wd-input__label.is-required) {
      padding-left: 0px;
    }
    :deep(.wd-input__label.is-required::after) {
      left: -10px;
    }
  }
}
</style>
