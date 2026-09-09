<template>
  <view class="CategorySelect">
    <view class="pickerArea" :class="{ clear: !!showText }" @click.stop="handleClick">
      <!-- 当isCustomRenderTag为true且multiple为true时，使用自定义滑动标签容器 -->
      <view class="textarea-box" v-if="isCustomRenderTag && multiple">
        <wd-textarea
          :placeholder="getPlaceholder($attrs)"
          v-bind="$attrs"
          v-model="showText"
          :disabled="disabled"
          clearable
          readonly
        ></wd-textarea>
        <view
          v-if="!!showText && !disabled"
          class="u-iconfont u-icon-close"
          @click.stop="handleClear"
        ></view>
      </view>
      <!-- 其他情况使用原来的wd-input -->
      <template v-else>
        <wd-input
          :placeholder="getPlaceholder($attrs)"
          v-bind="$attrs"
          v-model="showText"
          :disabled="disabled"
          clearable
          readonly
        ></wd-input>
        <view
          v-if="!!showText && !disabled"
          class="u-iconfont u-icon-close"
          @click.stop="handleClear"
        ></view>
      </template>
    </view>
    <SelectDeptModal
      v-if="popupShow"
      v-model="selectedData"
      :multiple="multiple"
      :rowKey="rowKey"
      :labelKey="labelKey"
      :isCustomRenderTag="isCustomRenderTag"
      @close="handleClose"
      @change="handleChange"
    ></SelectDeptModal>
  </view>
</template>

<script setup lang="ts">
import { ref, watch, useAttrs, inject } from 'vue'
import { useToast, useMessage, useNotify, dayjs } from 'wot-design-uni'
import { http } from '@/utils/http'
import { isArray, isNullOrUnDef } from '@/utils/is'
import { getPlaceholder } from '@/common/uitls'
import SelectDeptModal from './components/SelectDeptModal.vue'

defineOptions({
  name: 'SelectDept',
})
const props = defineProps({
  modelValue: {
    type: [Array, String],
  },
  // 是否支持多选
  multiple: {
    type: Boolean,
    default: true,
  },
  rowKey: {
    type: String,
    default: 'key',
  },
  labelKey: {
    type: String,
    default: 'title',
  },
  disabled: {
    type: Boolean,
    required: false,
    default: false,
  },
  // 是否显示全路径部门名称（取这个props名是为了和pc保持一致）
  isCustomRenderTag: {
    type: Boolean,
    default: true,
  },
  // 是否表单渲染（默认是true）
  izFormReader: {
    type: Boolean,
    default: true,
  },
})
const emit = defineEmits(['change', 'update:modelValue'])
// 流程底部按钮显示状态
const isOperationVisible = inject('isOperationVisible', null)
const toast = useToast()
const api = {
  loadDictItem: '/sys/category/loadDictItem/',
  queryDepartTreeSync: '/sys/sysDepart/queryDepartTreeSync',
  // 根据id查询部门(显示全路径)
  getDepartPathNameByOrgCode: '/sys/sysDepart/getDepartPathNameByOrgCode',
}
const showText = ref('')
const popupShow = ref(false)
const selectedData = ref<any[]>([])
const handleClick = () => {
  if (!props.disabled) {
    popupShow.value = true
    if (!isNullOrUnDef(isOperationVisible) && props.izFormReader) {
      isOperationVisible.value = false
    }
  }
}
const handleClose = () => {
  popupShow.value = false
  if (!isNullOrUnDef(isOperationVisible)) {
    isOperationVisible.value = true
  }
}
// 翻译input内的值
function loadItemByCode() {
  let value = props.modelValue
  if (value) {
    console.log('部门组件翻译props.modelValue', props.modelValue)
    if (isArray(props.modelValue)) {
      // @ts-ignore
      value = value.join(',')
    }
    if (value === selectedData.value.map((item) => item.id).join(',')) {
      // 说明是刚选完，内部已有翻译。不需要再请求
      if (props.isCustomRenderTag) {
        showText.value = selectedData.value
          .map((item) => item.fillPath ?? item[props.labelKey])
          .join(',')
      } else {
        showText.value = selectedData.value.map((item) => item[props.labelKey]).join(',')
      }
      return
    }
    value = (value as string).trim()
    if (value) {
      if (props.isCustomRenderTag) {
        showText.value = ''
        selectedData.value = []
        value.split(',').forEach((item) => {
          http
            .get(api.getDepartPathNameByOrgCode, { orgCode: '', depId: item })
            .then((res: any) => {
              if (res.success) {
                const { result = '' }: any = res
                if (showText.value.length) {
                  showText.value += ',' + result
                } else {
                  showText.value += result
                }
                selectedData.value.push({ id: item, fillPath: result })
              }
            })
            .catch((err) => {})
        })
      } else {
        http
          .get(api.queryDepartTreeSync, { ids: value })
          .then((res: any) => {
            if (res.success) {
              const { result = [] } = res
              showText.value = result.map((item) => item[props.labelKey]).join(',')
              selectedData.value = result
            } else {
            }
          })
          .catch((err) => {})
      }
    }
  }
}

// 清空
const handleClear = () => {
  showText.value = ''
  selectedData.value = []
  emit('update:modelValue', '')
  emit('change', '')
}
const handleChange = (value) => {
  selectedData.value = value
  emit('update:modelValue', value.map((item) => item.id).join(','))
  emit('change', value.map((item) => item.id).join(','))
  popupShow.value = false
}
watch(
  () => props.modelValue,
  () => {
    loadItemByCode()
  },
  { deep: true, immediate: true },
)
</script>

<style lang="scss" scoped>
:deep(.wd-popup-wrapper) {
  .wd-popup {
    border-top-left-radius: 10px;
    border-top-right-radius: 10px;
  }
}
.content {
  height: 50vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  .operation {
    display: flex;
    justify-content: space-between;
    line-height: 40px;
    padding: 0 5px;
    position: relative;
    &::before {
      content: ' ';
      position: absolute;
      bottom: 0;
      left: 8px;
      right: 8px;
      height: 1px;
      background-color: #e5e5e5;
    }
    .cancel,
    .confrim {
      font-size: 15px;
      height: 40px;
      min-width: 40px;
      text-align: center;
    }
    .confrim {
      color: var(--wot-color-theme);
    }
  }
  :deep(.da-tree) {
    .da-tree-item__checkbox {
      // display: none;
    }
  }
}
.pickerArea {
  position: relative;
  .u-icon-close {
    position: absolute;
    right: 15px;
    top: calc(14px + 4px);
    color: var(--wot-input-clear-color);
    font-size: 15px;
    z-index: 10;
  }
  &.clear {
    :deep(.wd-input__body) {
      padding-right: 20px;
    }
  }
  .textarea-box {
    position: relative;
    :deep(uni-textarea) {
      height: 72px;
      width: calc(100% - 20px);
    }
  }
}
</style>
