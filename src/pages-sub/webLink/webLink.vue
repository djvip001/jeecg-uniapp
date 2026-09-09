<route lang="json5" type="page">
{
  layout: 'default',
  style: {
    navigationBarTitleText: '',
    navigationBarBackgroundColor: '#0081ff',
    navigationBarTextStyle: 'white',
    disableScroll: true, // 微信禁止页面滚动
    'app-plus': {
      bounce: 'none', // 禁用 iOS 弹性效果
    },
  },
}
</route>

<template>
  <view>
    <web-view :src="url"></web-view>
  </view>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
const url = ref('')

onLoad((options) => {
  url.value = options.url
})
</script>

<style lang="scss" scoped></style>
