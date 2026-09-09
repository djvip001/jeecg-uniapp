<route lang="json5" type="page">
{
  layout: 'default',
  style: {
    navigationBarTitleText: '聊天记录',
    navigationStyle: 'custom',
    disableScroll: true, // 微信禁止页面滚动
    'app-plus': {
      bounce: 'none', // 禁用 iOS 弹性效果
    },
  },
}
</route>

<template>
  <PageLayout navTitle="聊天记录" backRouteName="chat">
    <view :class="{ wrap: true, [deviceBrand]: true }" :style="getWrapStyle">
      <!-- header: 搜索 + tab -->
      <view class="record-header">
        <wd-search
          hide-cancel
          placeholder="请输入搜索消息"
          v-model="searchQuery"
          @search="queryRecordList"
          @clear="queryRecordList"
        />
        <view class="record-tabs">
          <view :class="['tab', { active: activeTab === 'all' }]" @click="activeTab = 'all'">
            全部
          </view>
          <view :class="['tab', { active: activeTab === 'file' }]" @click="activeTab = 'file'">
            文件
          </view>
          <view :class="['tab', { active: activeTab === 'image' }]" @click="activeTab = 'image'">
            图片
          </view>
        </view>
      </view>
      <!-- prettier-ignore -->
      <z-paging height="85%" ref="paging" v-model="dataList" :fixed="false" use-virtual-list cell-height-mode="dynamic" safe-area-inset-bottom bottom-bg-color="#e5e5e5" @query="queryList" :default-page-size="defaultPageSize">
        <template #cell="{ item }">
          <chat-record-item
            :item="item"
            :playMsgid="playMsgid"
            @playVoice="handlePlayVoice"
          ></chat-record-item>
        </template>
      </z-paging>
    </view>
  </PageLayout>
</template>

<script lang="ts" setup>
import { nextTick, onMounted, ref } from 'vue'
import { http } from '@/utils/http'
import { getFileAccessHttpUrl, getPlaceholder } from '@/common/uitls'
import { textReplaceEmoji } from './emojis'
import chatRecordItem from './components/chat-record-item.vue'
import { useParamsStore } from '@/store/page-params'

defineOptions({
  name: 'chatRecord',
  options: {
    // apply-shared‌：当前页面样式会影响到子组件样式.(小程序)
    // shared‌：当前页面样式影响到子组件，子组件样式也会影响到当前页面.(小程序)
    styleIsolation: '‌apply-shared‌',
  },
})

const api = {
  chatlog: '/eoa/im/newApi/records',
  historyChatlog: '/eoa/im/newApi/historyRecords',
}

const globalData = getApp().globalData
const { systemInfo, navHeight } = globalData
const { statusBarHeight, deviceBrand, screenHeight } = systemInfo
const paging = ref(null)
// 搜索与 tab 状态
const searchQuery = ref('')
const activeTab = ref('all')

// 信息
const chatObj = ref(null)
// 对方userid 或者 群id 或者 讨论组id
const chatto = ref()
const navTitle = ref('')
const dataList = ref([])
const AUDIO = uni.createInnerAudioContext()
const playMsgid = ref('')
const paramsStore = useParamsStore()
// 加载历史消息
const loadHistory = ref(false)
let historyPageNo = 1
const defaultPageSize = 10
// 是否是荣耀手机
const isHonor = deviceBrand === 'honor'
// 页面初始化
const init = () => {
  const localData = paramsStore.getPageParams('chatRecord')
  if (!localData) {
    return
  }
  chatObj.value = { type: localData.type }
  chatto.value = localData.chatto
  // 重置分页状态
  loadHistory.value = false
  historyPageNo = 1
  searchQuery.value = ''
  activeTab.value = 'all'
  dataList.value = []
}
// 替换表情符号为图片
const replaceEmoji = (str) => {
  const temp = textReplaceEmoji(str)
  return '<div style="display:inline-block">' + temp + '</div>'
}

watch(
  () => activeTab.value,
  () => {
    queryRecordList()
  },
)
const queryRecordList = () => {
  loadHistory.value = false
  historyPageNo = 1
  dataList.value = []
  queryList(1, defaultPageSize)
}
/**
 * 查询消息列表
 * @param pageNo
 * @param pageSize
 */
const queryList = (pageNo, pageSize) => {
  // 数据库查询消息列表
  const params = {
    queryText: searchQuery.value,
    msgType: activeTab.value,
    type: chatObj.value.type,
    pageNo,
    pageSize,
    msgTo: chatto.value,
    // id: myuid.value,
    // sort: 'DESC',
  }
  if (loadHistory.value) {
    getMsgList(historyPageNo, pageSize)
    return
  }
  http
    .get(api.chatlog, params)
    .then((res: any) => {
      if (res.success) {
        // 加载消息列表，判断是否有更多数据
        if (res.result?.records.length > 0) {
          const records = analysis(res.result.records)
          paging.value.complete(records)
        }
        if (res.result?.records.length < pageSize) {
          // 初始化历史分页参数
          historyPageNo = 1
          loadHistory.value = true
          // 加载下一页历史消息，pageNo 从 1 开始
          getMsgList(historyPageNo, pageSize)
        }
      } else {
        paging.value.complete(false)
      }
    })
    .catch((res) => {
      paging.value.complete(false)
    })
}
const analysis = (data) => {
  const arr = data
  if (arr.length > 0) {
    const list = arr.map((item) => {
      const id = String(item.sendTime).replace(/\:/g, '').replace(/\-/g, '').replace(' ', '')
      item.sendTimeId = id
      let content = item.msgData
      if (item.msgType == 'text') {
        content = replaceEmoji(content)
      }
      if (item.msgType == 'voice') {
        content = JSON.parse(content)
      }
      item.msgData = content
      return item
    })
    for (let i = 0; i < list.length; i++) {
      if (list[i].msgType == 'revoke') {
        continue
      }
      if (list[i].referenceMsgId) {
        list[i] = handleReplyMsg(list[i], list)
      }
    }
  }
  return data
}

// 加载历史消息
const getMsgList = (pageNo = 1, pageSize = defaultPageSize) => {
  http
    .get(api.historyChatlog, {
      type: chatObj.value.type,
      pageNo,
      pageSize,
      msgTo: chatto.value,
      queryText: searchQuery.value,
      msgType: activeTab.value,
    })
    .then((res: any) => {
      historyPageNo++
      if (res.success && res.result?.records) {
        if (res.result.records.length > 0) {
          const records = analysis(res.result.records)
          // 第一页合并数据，后续页直接覆盖
          const allData = pageNo === 1 ? [...dataList.value, ...records] : [...records]
          paging.value.complete(allData)
        } else {
          paging.value.complete([...dataList.value])
        }
      }
    })
    .catch((res) => {
      paging.value.complete(false)
    })
}
const handleReplyMsg = (item, list) => {
  const tempId = item.referenceMsgId
  item.reply = true
  let replyContent = ''
  for (let i = 0; i < list.length; i++) {
    if (list[i].id == tempId) {
      replyContent = '"' + list[i].fromUserName + ':' + list[i].msgData + '"'
      break
    }
  }
  item.replyContent = replyContent
  return item
}
// 播放语音
const handlePlayVoice = (item) => {
  if (item.id == playMsgid.value) {
    AUDIO.stop()
    playMsgid.value = ''
  } else {
    playMsgid.value = item.id
    AUDIO.src = getFileAccessHttpUrl(item.msgData.url)
    nextTick(function () {
      AUDIO.play()
    })
  }
}
// 播放语音结束
AUDIO.onEnded((res) => {
  playMsgid.value = ''
})

// update-begin-author:liaozhiyang date:2025-11-18 for:【JHHB-1013】荣耀手机上聊天的输入框得到焦点时，输入框和键盘有较大的空白
const getWrapStyle = computed(() => {
  if (isHonor) {
    // 荣耀
    return {
      height: `${screenHeight - (statusBarHeight + navHeight)}px`,
    }
  }
  return {
    height: '100%',
  }
})
// update-end-author:liaozhiyang date:2025-11-18 for:【JHHB-1013】荣耀手机上聊天的输入框得到焦点时，输入框和键盘有较大的空白

init()

onShow(() => {
  // 页面每次显示时重新初始化（处理页面缓存导致第二次进入数据不刷新）
  init()
  nextTick(() => {
    paging.value?.reload()
  })
})

onMounted(() => {
  uni.$on('chat:updateTile', (title) => {
    navTitle.value = title
  })
})
onBeforeUnmount(() => {
  // socket?.closeSocket()
  uni.$off('chat:updateTile')
})
</script>

<style lang="scss" scoped>
//
.wrap {
  height: 100%;
  background: #f8f9fa;

  .search-container {
    padding: 24rpx 24rpx 16rpx;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 0 0 24rpx 24rpx;
    box-shadow: 0 4rpx 20rpx rgba(102, 126, 234, 0.15);

    :deep(.wd-search) {
      .wd-search__content {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10rpx);
        border: none;
        border-radius: 24rpx;
        box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.08);

        .wd-search__field {
          .wd-input {
            .wd-input__inner {
              background: transparent;
              border: none;
              font-size: 28rpx;
              color: #333;

              &::placeholder {
                color: #999;
              }
            }
          }
        }

        .wd-search__action {
          .wd-button {
            color: var(--wot-color-theme, #667eea);
            font-weight: 500;
          }
        }
      }
    }
  }

  .tab-container {
    background: #fff;
    padding: 0 24rpx;
    border-bottom: 1rpx solid #f0f0f0;

    :deep(.wd-tabs) {
      .wd-tabs__nav {
        background: transparent;
        padding: 0;

        .wd-tabs__wrapper {
          .wd-tabs__item {
            padding: 24rpx 32rpx;
            font-size: 28rpx;
            color: #666;
            font-weight: 400;
            position: relative;
            transition: all 0.3s ease;

            &::after {
              content: '';
              position: absolute;
              bottom: 0;
              left: 50%;
              transform: translateX(-50%);
              width: 0;
              height: 4rpx;
              background: linear-gradient(90deg, #667eea, #764ba2);
              border-radius: 2rpx;
              transition: all 0.3s ease;
            }

            &.wd-tabs__item--active {
              color: #333;
              font-weight: 500;

              &::after {
                width: 60rpx;
              }
            }

            &:hover {
              color: #333;
            }
          }
        }
      }
    }
  }

  .chat-list-container {
    flex: 1;
    overflow: hidden;
    background: #f8f9fa;
  }

  // update-begin-author:liaozhiyang date:2025-11-18 for:【JHHB-1013】荣耀手机上聊天的输入框得到焦点时，输入框和键盘有较大的空白
  &.honor {
    :deep(.zp-page-bottom-keyboard-placeholder-animate) {
      display: none;
    }
  }
  // update-begin-author:liaozhiyang date:2025-11-18 for:【JHHB-1013】荣耀手机上聊天的输入框得到焦点时，输入框和键盘有较大的空白
}

// 响应式调整
@media (max-width: 375px) {
  .wrap {
    .search-container {
      padding: 20rpx 20rpx 12rpx;
    }

    .tab-container {
      padding: 0 20rpx;

      :deep(.wd-tabs) {
        .wd-tabs__nav {
          .wd-tabs__wrapper {
            .wd-tabs__item {
              padding: 20rpx 24rpx;
              font-size: 26rpx;
            }
          }
        }
      }
    }
  }
}

.record-header {
  display: flex;
  flex-direction: column; /* search on first row, tabs on second */
  align-items: stretch;
  padding: 18rpx;
  gap: 10rpx;
  /* subtle gradient background for header */
  background: linear-gradient(90deg, rgba(102, 126, 234, 0.08), rgba(118, 75, 162, 0.05));
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.04);
  /* give a small backdrop to separate from list */
}
.record-search {
  display: block;
  width: 100%;
  height: 64rpx;
  padding: 0 24rpx;
  border-radius: 34rpx;
  border: none;
  background: #ffffff;
  box-sizing: border-box;
  box-shadow: 0 6rpx 20rpx rgba(34, 60, 80, 0.06);
  font-size: 30rpx;
  color: #333;
}
.record-tabs {
  display: flex;
  gap: 10rpx;
  margin-top: 8rpx; /* small separation from search row */
  align-items: center;
  justify-content: flex-start;
}
.tab {
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.9);
  color: #666;
  font-size: 28rpx;
  box-shadow: 0 2rpx 8rpx rgba(16, 24, 40, 0.04);
  transition: all 0.18s ease;
}
.tab.active {
  background: linear-gradient(90deg, #667eea, #764ba2);
  color: #fff;
  transform: translateY(-2rpx);
  box-shadow: 0 8rpx 20rpx rgba(102, 126, 234, 0.14);
}
</style>
