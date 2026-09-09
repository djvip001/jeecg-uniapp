<template>
  <view>
    <wd-popup
      custom-class="file-name-dialog-popup"
      v-model="show"
      position="center"
      :close-on-click-overlay="false"
    >
      <view class="file-name-dialog">
        <view class="dialog-header">
          <text class="dialog-title">{{ sendModalTitle }}</text>
          <view class="dialog-close" @click="show = false">
            <text class="close-icon">×</text>
          </view>
        </view>
        <view class="dialog-content">
          <view class="file-type-tag">{{ fileType }}</view>
          <view class="input-wrapper">
            <view class="file-name-input-wrapper">
              <wd-input
                custom-class="file-name-input"
                v-model="editingFileName"
                placeholder="请输入文件名"
                :maxlength="100"
              />
            </view>
            <view class="file-size">{{ formatFileSize(fileSize) }}</view>
          </view>
        </view>
        <view class="dialog-footer">
          <wd-button custom-class="send-btn" type="primary" @click="handleConfirm" block>
            {{ sendModalBtnText }}
          </wd-button>
        </view>
      </view>
    </wd-popup>
    <wd-toast :selector="toastSelector"></wd-toast>
  </view>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import { useToast } from 'wot-design-uni'
import { uuid } from '@/common/uitls'
const props = defineProps({
  fileName: {
    type: String,
    default: '',
  },
  fileSize: {
    type: Number,
    default: 0,
  },
  sendModalTitle: {
    // 发送文件弹窗标题
    type: String,
    default: '发送文件',
  },
  sendModalBtnText: {
    // 发送文件弹窗按钮文本
    type: String,
    default: '立即发送',
  },
})

const emit = defineEmits(['confirm', 'cancel', 'update:show'])

const editingFileName = ref('')
const show = ref(true)
const toastSelector = uuid()
const toast = useToast(toastSelector)
// 分离文件名和后缀
const splitFileName = (fullName: string) => {
  if (!fullName) return { name: '', ext: '' }
  const lastDotIndex = fullName.lastIndexOf('.')
  if (lastDotIndex === -1) {
    return { name: fullName, ext: '' }
  }
  return {
    name: fullName.substring(0, lastDotIndex),
    ext: fullName.substring(lastDotIndex + 1),
  }
}

// 文件扩展名（后缀）
const fileExtension = computed(() => {
  const { ext } = splitFileName(props.fileName)
  return ext
})

// 文件类型（用于显示标签）
const fileType = computed(() => {
  const ext = fileExtension.value
  return ext || 'file'
})

const formatFileSize = (size) => {
  if (!size) return '0 KB'
  if (size < 1024) {
    return size + ' B'
  } else if (size < 1024 * 1024) {
    return (size / 1024).toFixed(2) + ' KB'
  } else {
    return (size / (1024 * 1024)).toFixed(2) + ' MB'
  }
}

const handleConfirm = () => {
  if (!editingFileName.value.trim()) {
    toast.warning('请输入文件名')
    return
  }
  // 组合文件名和后缀
  const fullFileName = fileExtension.value
    ? `${editingFileName.value.trim()}.${fileExtension.value}`
    : editingFileName.value.trim()
  emit('confirm', fullFileName)
}

// 监听show变化
watch(
  () => show.value,
  () => {
    if (show.value === false) {
      emit('cancel')
    }
  },
)
watch(
  () => props.fileName,
  (newVal) => {
    const { name } = splitFileName(newVal)
    editingFileName.value = name || ''
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
:deep(.file-name-dialog-popup) {
  background-color: transparent;
}
.file-name-dialog {
  width: 320px;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 16px 12px;
  border-bottom: 1px solid #f5f5f5;
}

.dialog-title {
  font-size: 16px;
  color: #333;
}

.dialog-close {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity 0.2s;
}

.dialog-close:active {
  opacity: 0.6;
}

.close-icon {
  font-size: 22px;
  color: #999;
  line-height: 1;
  font-weight: 300;
}

.dialog-content {
  padding: 24px 16px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.file-type-tag {
  background: var(--wot-color-theme);
  color: #fff;
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 15px;
  margin-bottom: 20px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  min-width: 60px;
  text-align: center;
}

.input-wrapper {
  width: 100%;
  display: flex;
  flex-direction: column;
}

.file-name-input-wrapper {
  width: 100%;
  display: flex;
  align-items: center;
  margin-bottom: 6px;
}

.file-name-input-wrapper :deep(.file-name-input) {
  flex: 1;
}

.file-extension {
  font-size: 15px;
  color: #333;
  margin-left: 4px;
  white-space: nowrap;
}

.file-size {
  font-size: 13px;
  color: #999;
  margin-left: 2px;
  text-align: center;
}

.dialog-footer {
  padding: 0 16px 16px;
}

:deep(.send-btn) {
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 0.5px;
  padding: 14px 0;
}
</style>
