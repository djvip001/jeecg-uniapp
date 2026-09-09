<template>
  <view class="chat-list-wrap">
    <z-paging
      ref="paging"
      :fixed="false"
      v-model="dataList"
      @query="queryList"
      :default-page-size="100"
      height="100%"
      style="flex: 1; min-height: 0; height: 100%"
      safe-area-inset-bottom
      use-safe-area-placeholder
    >
      <view class="chat-list">
        <template v-for="(item, index) in dataList" :key="index">
          <view
            :class="{ 'chat-item': true, 'solid-top': true, 'is-top': item.izTop == 1 }"
            @longpress.prevent="handleLongPress(item)"
            @click="handleGo(item)"
          >
            <!-- 头像区域 -->
            <view class="avatar-container">
              <template v-if="['systemNotice'].includes(item.type)">
                <view class="avatar system-avatar">
                  <text class="cuIcon-notice text-white"></text>
                </view>
              </template>
              <template v-else-if="['fileNotice'].includes(item.type)">
                <view class="avatar file-avatar">
                  <text class="cuIcon-file text-white"></text>
                </view>
              </template>
              <template v-else-if="['planNotice'].includes(item.type)">
                <view class="avatar plan-avatar">
                  <text class="cuIcon-time text-white"></text>
                </view>
              </template>
              <template v-else-if="['flowNotice'].includes(item.type)">
                <view class="avatar flow-avatar">
                  <text class="cuIcon-fork text-white"></text>
                </view>
              </template>
              <template v-else-if="['group'].includes(item.type) && !item.fromAvatar">
                <view class="avatar group-avatar">
                  <text class="text-white">{{ getFirstStr(item.fromUserName) }}</text>
                </view>
              </template>
              <template v-else>
                <image
                  v-if="getAvatar(item)"
                  :src="getAvatar(item)"
                  class="avatar user-avatar"
                  mode="aspectFill"
                />
                <view v-else class="avatar user-avatar">
                  <text class="text-white">{{ getFirstStr(item.fromUserName) }}</text>
                </view>
              </template>
              <!-- 未读消息徽章 -->
              <view v-if="item.unreadNum > 0" class="badge">
                {{ item.unreadNum > 99 ? '99+' : item.unreadNum }}
              </view>
            </view>
            <!-- 内容区域 -->
            <view class="content">
              <view class="content-header">
                <text class="title">{{ item.fromUserName }}</text>
                <text class="time">{{ formatChatTime(item.lastMsgTime || item.sendTime) }}</text>
              </view>
              <view class="content-body">
                <text class="note">{{ getChatType(item) }}</text>
              </view>
            </view>
          </view>
        </template>
        <!-- <view class="scroll-bottom-safe"></view> -->
      </view>
    </z-paging>
  </view>
  <BottomOperate
    v-if="bottomOperatePopup.show"
    v-bind="bottomOperatePopup"
    @close="() => (bottomOperatePopup.show = false)"
    @change="handleChange"
    :isTabbar="true"
  ></BottomOperate>
  <wd-toast />
</template>

<script setup lang="ts">
import { onLaunch, onShow, onHide, onLoad, onReady } from '@dcloudio/uni-app'
import { nextTick, onMounted, ref } from 'vue'
import { http } from '@/utils/http'
import { useToast } from 'wot-design-uni/components/wd-toast'
import { useRouter } from '@/plugin/uni-mini-router'
import { beautifyTime } from '@/common/uitls'
import { useParamsStore } from '@/store/page-params'
import { cache, getFileAccessHttpUrl, hasRoute } from '@/common/uitls'
import { isObject } from '@/common/is'
import socket from '@/common/socket'
import { platform } from '@/utils/platform'
import { useUserStore } from '@/store'
console.log('platform:::', platform)
defineOptions({
  name: 'chatList',
  options: {
    styleIsolation: 'shared',
  },
})
const userStore = useUserStore()
const toast = useToast()
const router = useRouter()
const paramsStore = useParamsStore()
const paging = ref(null)
const avatarList = ref()
const dataList = ref([])
const curPlatform = ref<string>(platform)
// #ifdef APP-IOS
curPlatform.value = 'ios'
// #endif
const options = [
  { key: 'backtop', icon: 'backtop', label: '置顶' },
  { key: 'cancelbacktop', icon: 'translate-bold', label: '取消置顶' },
  { key: 'delete', icon: 'delete', label: '删除', color: 'red' },
]
const bottomOperatePopup = reactive({
  show: false,
  title: '',
  data: {},
  options: [],
})

// const CACHE_KEY = 'chatList_cache'

// 排除当前登录人（如与自己的会话）
const filterCurrentUser = (records) => {
  const currentUserId = userStore.userInfo.userid
  if (!currentUserId) return records
  return records.filter((item) => item.msgTo !== currentUserId)
}

const queryList = async (pageNo: number, pageSize: number) => {
  const data = [
    {
      id: 1,
      fromUserName: '廖秀兰',
      sendTime: '2018-12-08',
      type: 'discussion',
      izTop: 0,
      status: 'offline',
      msgFrom: 4000,
      msgTo: 100,
      fromAvatar: 'https://random.imagecdn.app/100/100',
    },
    {
      id: 2,
      fromUserName: '廖强',
      sendTime: '2018-12-08',
      type: 'discussion',
      izTop: 1,
      status: 'online',
      msgFrom: 4012,
      msgTo: 134,
      fromAvatar: 'https://q1.qlogo.cn/g?b=qq&nk=190848757&s=100',
    },
    {
      id: 3,
      fromUserName: '许强',
      sendTime: '2018-12-08',
      type: 'group',
      izTop: 0,
      status: 'online',
      msgFrom: 4024,
      msgTo: 168,
      fromAvatar: 'https://dummyimage.com/100x100/f37b1d/fff&text=%E7%8E%8B%E4%BA%94',
    },
    {
      id: 4,
      fromUserName: '孙静',
      sendTime: '2018-12-08',
      type: 'friend',
      izTop: 1,
      status: 'online',
      msgFrom: 4036,
      msgTo: 202,
      fromAvatar: 'https://random.imagecdn.app/100/100',
    },
    {
      id: 5,
      fromUserName: '白艳',
      sendTime: '2018-12-08',
      type: 'discussion',
      izTop: 0,
      status: 'offline',
      msgFrom: 4048,
      msgTo: 236,
      fromAvatar: 'https://picsum.photos/100/100',
    },
    {
      id: 6,
      fromUserName: '尹芳',
      sendTime: '2018-12-08',
      type: 'discussion',
      izTop: 0,
      status: 'offline',
      msgFrom: 4060,
      msgTo: 270,
      fromAvatar: 'https://q1.qlogo.cn/g?b=qq&nk=190848757&s=100',
    },
    {
      id: 7,
      fromUserName: '侯娜',
      sendTime: '2018-12-08',
      type: 'group',
      izTop: 0,
      status: 'offline',
      msgFrom: 4072,
      msgTo: 304,
      fromAvatar: 'https://q1.qlogo.cn/g?b=qq&nk=190848757&s=100',
    },
    {
      id: 8,
      fromUserName: '邹涛',
      sendTime: '2018-12-08',
      type: 'group',
      izTop: 0,
      status: 'offline',
      msgFrom: 4084,
      msgTo: 338,
      fromAvatar: 'https://dummyimage.com/100x100/59c7b8/fff&text=%E5%85%AD%E5%AD%90',
    },
    {
      id: 9,
      fromUserName: '吴洋',
      sendTime: '2018-12-08',
      type: 'discussion',
      izTop: 0,
      status: 'offline',
      msgFrom: 4096,
      msgTo: 372,
      fromAvatar: 'https://random.imagecdn.app/100/100',
    },
  ]
  const records = filterCurrentUser(data || [])
  const sorted = sortByIzTop([...records])
  // 仅缓存第一页用于消除白屏
  // if (pageNo === 1) {
  //   uni.setStorageSync(CACHE_KEY, sorted)
  // }
  await paging.value.complete(sorted)
  // 同步未读总数给首页 tabbar（按已加载列表统计）
  const totalUnread = dataList.value.reduce((sum, item) => sum + (item.unreadNum || 0), 0)
  uni.$emit('chatHasUnread', totalUnread)
}
const sortByIzTop = (arr) => {
  return arr.sort((a, b) => {
    if (a.izTop && !b.izTop) {
      return -1 // a 排在 b 前面
    } else if (!a.izTop && b.izTop) {
      return 1 // b 排在 a 前面
    } else {
      return 0 // 保持原有顺序
    }
  })
}
const formatChatTime = (datetime) => {
  const result = beautifyTime(datetime || '')
  return result === 'NaN/NaN/NaN' ? '' : result
}
const getFirstStr = (val) => {
  return val ? val.substr(0, 1) : val
}
const getAvatar = (item) => {
  if (['systemNotice'].includes(item.type)) {
  } else if (['group'].includes(item.type)) {
  }
  return getFileAccessHttpUrl(item.fromAvatar) ?? ''
}
const getChatType = (item) => {
  switch (item.type) {
    case 'discussion':
      return '[聊天消息]'
    case 'systemNotice':
      return '[系统消息]'
    case 'flowNotice':
      return '[工作流消息]'
    case 'fileNotice':
      return '[知识库消息]'
    case 'planNotice':
      return '[日程消息]'
    case 'friend':
      return item.status === 'online' ? '[在线]' : '[离线]'
    case 'group':
      return '[群消息]'
    default:
      return ''
  }
}
const handleLongPress = (item) => {
  const isTop = String(item.izTop) === '1'
  bottomOperatePopup.show = true
  bottomOperatePopup.title = item.fromUserName
  bottomOperatePopup.data = item
  bottomOperatePopup.options = options.filter((o) => {
    if (o.key === 'backtop' && isTop) {
      return false
    } else if (o.key === 'cancelbacktop' && !isTop) {
      return false
    }
    return true
  })
}
const handleChange = ({ option, data }) => {
  if (['cancelbacktop', 'backtop'].includes(option.key)) {
    let izTop = 1
    if (option.key === 'cancelbacktop') {
      izTop = 0
    }
    http
      .post('/eoa/im/newApi/chatToTop', {
        id: data.id,
        izTop,
      })
      .then((res: any) => {
        if (res.success) {
          paging.value.reload()
        }
      })
  } else if (option.key === 'delete') {
    http
      .post('/eoa/im/newApi/removeChat', {
        id: data.id,
      })
      .then((res: any) => {
        if (res.success) {
          paging.value.reload()
        }
      })
  }
}
// 跳转
const typeMap = {
  flowNotice: 'flow',
  fileNotice: 'file',
  planNotice: 'plan',
}
const handleGo = (item) => {
  if (['systemNotice', 'planNotice', 'fileNotice', 'flowNotice'].includes(item.type)) {
    // 1.系统消息
    router.push({
      name: 'annotationList',
      params: { backRouteName: 'message', noticeType: typeMap[item.type] || '' },
    })
  } else if (['friend'].includes(item.type)) {
    // 2.聊天
    needRefresh = true
    paramsStore.setPageParams('chat', { data: item })
    router.push({ name: 'chat' })
  } else {
    // 3.群组和讨论组
    // TODO
    needRefresh = true
    paramsStore.setPageParams('chat', { data: item })
    router.push({ name: 'chat' })
  }
}
const onSocketOpen = () => {
  console.log('启动webSocket')
  socket.init('eoaNewChatSocket')
}
const onSocketReceive = () => {
  socket.acceptMessage = function (res) {
    console.log('接受到消息res', res)
    if (['event_talk_revoke', 'event_chat_online'].includes(res.event)) {
      const findItem = dataList.value.find((item) => item.id === res.data.id)
      if (isObject(findItem)) {
        Object.assign(findItem, { ...res.data })
      }
    } else if (['event_chat_talk'].includes(res.event)) {
      const isCurrentUserMessage =
        res.data?.msgFrom != null && String(res.data.msgFrom) === String(userStore.userInfo.userid)
      const findItem = dataList.value.find((item) => {
        if (item.type == 'friend') {
          return item.msgTo === res.data.msgFrom
        } else if (item.type == 'group') {
          return item.msgTo === res.data.msgTo
        } else if (item.type == 'discussion') {
          return item.msgTo === res.data.msgTo
        }
      })
      if (isObject(findItem)) {
        if (!isCurrentUserMessage) {
          findItem.unreadNum = findItem.unreadNum ?? 0
          findItem.unreadNum++
          if (findItem.unreadNum > 99) {
            findItem.unreadNum = 99
          }
        }
        if (res.data?.msgTo && res.data?.sendTime) {
          findItem.sendTime = res.data.sendTime
        }
        if (!isCurrentUserMessage) {
          const totalUnread = dataList.value.reduce((sum, item) => sum + (item.unreadNum || 0), 0)
          uni.$emit('chatHasUnread', totalUnread)
        }
      }
    } else if (['event_chat_add_list'].includes(res.event)) {
      // 把当前用户加入组或者聊天
      const findItem = dataList.value.find((item) => item.id === res.data.id)
      if (!findItem) {
        dataList.value.unshift(res.data)
      }
    } else if (['event_chat_delete_list'].includes(res.event)) {
      // 把当前用户删除群组或者聊天 或者当前用户所在群组或聊天被解散
      const findIndex = dataList.value.findIndex((item) => (item.msgTo = res.data.msgTo))
      if (findIndex != -1) {
        dataList.value.splice(findIndex, 1)
      }
    }
  }
}

function initUserStatus() {
  http.get('/eoa/im/newApi/getUserByToken', { token: userStore.userInfo.token })
}
let needRefresh = false
onShow(() => {
  onSocketOpen()
  onSocketReceive()
  if (needRefresh) {
    needRefresh = false
    paging.value?.reload()
  } else if (!dataList.value.length) {
    paging.value?.refresh()
  }
  initUserStatus()
})
onHide(() => {
  //socket?.closeSocket()
})
onUnmounted(() => {
  // socket?.closeSocket()
})
onMounted(() => {
  uni.$on('chatList:unreadClear', (chatItemData) => {
    const findItem = dataList.value.find((item) => item.id === chatItemData.id)
    if (findItem) {
      findItem.unreadNum = 0
    }
  })
  uni.$on('chatList:reload', () => {
    paging.value?.reload()
  })
  // 【JHHB-1437】确保组件作为子组件挂载时也能可靠触发首次查询
  if (dataList.value.length === 0) {
    nextTick(() => {
      paging.value?.refresh()
    })
  }
})
onBeforeUnmount(() => {
  // 离开消息 tab 时，将当前真实未读数同步给首页 tabbar
  const totalUnread = dataList.value.reduce((sum, item) => sum + (item.unreadNum || 0), 0)
  uni.$emit('chatHasUnread', totalUnread)
  uni.$off('chatList:unreadClear')
  uni.$off('chatList:reload')
})
</script>

<style lang="scss" scoped>
.chat-list-wrap {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  :deep(.z-paging) {
    flex: 1;
    min-height: 0;
    height: 100%;
  }
  :deep(.z-paging-content) {
    flex: 1;
    min-height: 0;
    height: 100%;
    background-color: #f1f1f1;
  }
}
.chat-list {
  background-color: #fff;
}
.scroll-bottom-safe {
  height: constant(safe-area-inset-bottom);
  height: env(safe-area-inset-bottom);
  min-height: 16px;
}
.chat-item {
  position: relative;
  display: flex;
  align-items: center;
  padding: 12px 15px;
  background-color: #fff;
  transition: all 0.2s ease;

  &:active {
    background-color: #f8f9fa;
    transform: scale(0.98);
  }

  &.is-top {
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    border-left: 3px solid #667eea;
  }

  &:last-child {
    border-bottom: none;
  }
}
.avatar-container {
  position: relative;
  margin-right: 12px;
  flex-shrink: 0;
}
.avatar {
  width: 45px;
  height: 45px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #fff;

  &.system-avatar {
    background: #0081ff;
    font-size: 24px;
  }
  &.file-avatar {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    font-size: 24px;
  }
  &.plan-avatar {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    font-size: 24px;
  }
  &.flow-avatar {
    background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
    font-size: 24px;
  }
  &.group-avatar {
    background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
    font-size: 18px;
  }
  &.user-avatar {
    background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
    font-size: 18px;
  }
}

.badge {
  position: absolute;
  top: -5px;
  right: -5px;
  min-width: 18px;
  height: 18px;
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
  color: #fff;
  font-size: 12px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  z-index: 2;
  box-shadow: 0 2px 4px rgba(255, 107, 107, 0.3);
}

.content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.title {
  font-size: 15px;
  color: var(--color-grey);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.time {
  font-size: 12px;
  color: #999;
  margin-left: 8px;
  flex-shrink: 0;
}

.content-body {
  display: flex;
  align-items: center;
}

.note {
  font-size: 12px;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
</style>
