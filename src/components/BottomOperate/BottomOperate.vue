<template>
  <wd-popup v-model="show" position="bottom" @close="handleClose">
    <view class="contetn">
      <wd-text custom-class="title" v-if="title" :text="title"></wd-text>
      <wd-cell-group border>
        <wd-cell
          v-for="(item, index) in options"
          :icon="item.icon"
          :label="item.label"
          :custom-class="item.color"
          clickable
          @click="handleClick(item)"
        ></wd-cell>
      </wd-cell-group>
    </view>
    <view class="tabbar" :style="tabbarStyle"></view>
  </wd-popup>
</template>

<script setup lang="ts">
import { ref } from 'vue'
defineOptions({
  name: 'BottomOperate',
  options: {
    styleIsolation: 'shared',
  },
})
const eimt = defineEmits(['change', 'close'])
const show = ref(true)
const props = defineProps(['title', 'data', 'options', 'isTabbar'])
const windowInfo = uni.getWindowInfo()
const tabbarStyle = computed(() => {
  const safeAreaInsets = windowInfo.safeAreaInsets || { bottom: 0 }
  return {
    height: props.isTabbar ? `calc(51px + ${safeAreaInsets.bottom}px)` : 0,
  }
})
const handleClose = () => {
  show.value = false
  setTimeout(() => {
    eimt('close')
  }, 300)
}
const handleClick = (item) => {
  eimt('change', { option: item, data: props.data })
  handleClose()
}
</script>

<style lang="scss" scoped>
.contetn {
  padding-top: 10px;
  :deep(.title) {
    padding-left: 10px;
    padding-right: 10px;
    font-size: 14px;
    color: #666;
    margin-bottom: 10px;
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  :deep(.wd-cell) {
    padding-left: 10px;
    --wot-cell-icon-size: 15px;
    --wot-cell-label-color: #444;
    --wot-cell-label-fs: 14px;
    .wd-icon {
      margin-right: 6px;
    }
    .wd-cell__label {
      margin-top: 0;
    }
    &.red {
      color: red;
      --wot-cell-label-color: red;
    }
    &.orange {
      color: #f0883a;
      --wot-cell-label-color: #f0883a;
    }
    &.green {
      color: #2ed573;
      --wot-cell-label-color: #2ed573;
    }
    &.pink {
      color: #f78fb3;
      --wot-cell-label-color: #f78fb3;
    }
    &.gray {
      color: #888;
      --wot-cell-label-color: #888;
    }
    &.brown {
      color: #a5673f;
      --wot-cell-label-color: #a5673f;
    }
    &.cyan {
      color: #1cbbb4;
      --wot-cell-label-color: #1cbbb4;
    }
    &.yellow {
      color: #edb202;
      --wot-cell-label-color: #edb202;
    }
    &.lime {
      color: #8bc34a;
      --wot-cell-label-color: #8bc34a;
    }
  }
}
</style>
