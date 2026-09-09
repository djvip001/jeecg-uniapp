<route lang="json5" type="page">
{
  layout: 'default',
  style: {
    navigationBarTitleText: '',
    navigationStyle: 'custom',
  },
}
</route>

<template>
  <scroll-view scroll-y class="selected-user-container solid-top">
    <view class="user-container">
      <template v-if="selectedDeparts.length">
        <view
          class="depart-item"
          :class="{ 'one-columns': isCustomRenderTag }"
          v-for="item in selectedDeparts"
          :key="item.id"
          @click="handleDelDepart(item)"
        >
          <span class="depart-item-name ellipsis" :class="{ 'ellipsis-start': isCustomRenderTag }">{{ item.fillPath ?? item.departName }}</span>
          <view class="u-iconfont u-icon-close"></view>
        </view>
      </template>
      <template v-else>
        <view class="empty-data">
          <wd-status-tip url-prefix="/static/wot-assets/" image="content" tip="无选中部门" />
        </view>
      </template>
    </view>
  </scroll-view>
</template>

<script lang="ts" setup>
import { ref, reactive } from 'vue'
import { onShow, onHide, onLoad, onReady } from '@dcloudio/uni-app'
import { useMessage, useToast } from 'wot-design-uni'
import { useRouter } from '@/plugin/uni-mini-router'
import { useUserStore } from '@/store/user'
import { http } from '@/utils/http'
import { useParamsStore } from '@/store/page-params'
import { cache, getFileAccessHttpUrl } from '@/common/uitls'
defineOptions({
  name: 'SelectedDepart',
  options: {
    styleIsolation: 'shared',
  },
})
const props = defineProps(['selectedDeparts', 'isCustomRenderTag'])
const emit = defineEmits(['del'])
const router = useRouter()
const paramsStore = useParamsStore()
const userStore = useUserStore()
const toast = useToast()
const message = useMessage()
// 删除用户
const handleDelDepart = (item: any) => {
  emit('del', item)
}
</script>

<style lang="scss" scoped>
//
.selected-user-container {
  height: 100%;
}
.user-container {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  align-content: flex-start;
  padding: 16px;
  min-height: 100%;
  .depart-item {
    position: relative;
    display: flex;
    width: 33%;
    padding: 5px 10px;
    background-color: #f5f5f5;
    border-radius: 5px;
    margin-bottom: 16px;
    justify-content: space-between;
    &:nth-child(3n-2) {
      margin-right: 15px;
      width: calc(33% - 15px);
    }
    &:nth-child(3n-1) {
      margin-right: 10px;
      width: calc(33% - 10px);
    }
    &:nth-child(3n) {
      margin-left: 10px;
      width: calc(33% - 10px);
    }
    &.two-columns {
      width: 50%;
      &:nth-child(2n-1) {
        margin-right: 10px;
        margin-left: 0;
        width: calc(50% - 10px);
      }
      &:nth-child(2n) {
        margin-left: 10px;
        margin-right: 0;
        width: calc(50% - 10px);
      }
    }
    &.one-columns {
      width: 100%;
      margin-right: 0;
    }
    .depart-item-name {
      flex: 1;
      overflow: hidden;
      &.ellipsis-start {
        direction: rtl;
        text-align: left;
      }
    }
    .u-icon-close {
      position: absolute;
      top: -3px;
      right: -5px;
      border-radius: 50%;
    }
  }
  .empty-data {
    width: 100%;
    min-height: 100%;
    display: flex;
    align-items: center;
  }
}
</style>
