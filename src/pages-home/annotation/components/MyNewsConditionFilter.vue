<template>
  <wd-popup v-model="show" position="right" @close="handleClose">
    <view class="filter-panel">
      <view class="filter-title">筛选</view>
      <wd-input v-model="form.titile" label="标题" clearable placeholder="请输入标题" />
      <wd-cell title="消息类型" />
      <view class="message-type-options">
        <wd-radio-group v-model="form.msgCategory" cell shape="button">
          <wd-radio value="">全部</wd-radio>
          <wd-radio value="1">通知公告</wd-radio>
          <wd-radio value="2">系统消息</wd-radio>
          <wd-radio value="plan">日程计划</wd-radio>
          <wd-radio value="flow">流程消息</wd-radio>
          <wd-radio value="meeting">会议</wd-radio>
          <wd-radio value="file">知识库</wd-radio>
          <wd-radio value="collab">协同通知</wd-radio>
          <wd-radio value="supe">督办通知</wd-radio>
        </wd-radio-group>
      </view>
      <wd-calendar
        v-model="form.startTime"
        label="开始日期"
        placeholder="请选择开始日期"
        clearable
      />
      <wd-calendar v-model="form.endTime" label="结束日期" placeholder="请选择结束日期" clearable />
      <view class="filter-actions">
        <wd-button plain @click="reset">重置</wd-button>
        <wd-button type="primary" @click="confirm">查询</wd-button>
      </view>
    </view>
  </wd-popup>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'

defineOptions({
  name: 'MyNewsConditionFilter',
})

const props = defineProps({
  titile: { type: String, default: '' },
  sender: { type: String, default: '' },
  msgCategory: { type: String, default: '' },
  noticeType: { type: String, default: '' },
  conditionStartDate: { type: [String, Number], default: '' },
  conditionEndDate: { type: [String, Number], default: '' },
})
const emit = defineEmits(['change', 'close'])
const show = ref(true)
const form = reactive({
  titile: props.titile,
  sender: props.sender,
  msgCategory: props.msgCategory || props.noticeType,
  startTime: props.conditionStartDate,
  endTime: props.conditionEndDate,
})

const handleClose = () => emit('close')
const reset = () => {
  Object.assign(form, {
    titile: '',
    msgCategory: '',
    startTime: '',
    endTime: '',
  })
}
const confirm = () => {
  emit('change', { ...form })
  show.value = false
  emit('close')
}
</script>

<style lang="scss" scoped>
.filter-panel {
  box-sizing: border-box;
  width: 300px;
  min-height: 100vh;
  padding: 16px;
  background: #fff;
}
.filter-title {
  margin-bottom: 12px;
  font-size: 18px;
  font-weight: 600;
}
.message-type-options {
  margin-bottom: 12px;

  :deep(.wd-radio-group) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px 12px;
  }

  :deep(.wd-radio) {
    box-sizing: border-box;
    width: 100%;
    padding: 0;
    margin: 0;
  }

  :deep(.wd-radio__shape) {
    width: 100%;
  }

  :deep(.wd-radio__label) {
    width: 100%;
    overflow: visible;
    padding-right: 8px;
    padding-left: 8px;
    text-align: center;
    white-space: nowrap;
  }
}
.filter-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  .wd-button {
    flex: 1;
  }
}
</style>
