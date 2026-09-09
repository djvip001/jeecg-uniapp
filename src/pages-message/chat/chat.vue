<route lang="json5" type="page">
{
  layout: 'default',
  style: {
    navigationBarTitleText: '聊天',
    navigationStyle: 'custom',
    disableScroll: true, // 微信禁止页面滚动
    'app-plus': {
      bounce: 'none', // 禁用 iOS 弹性效果
    },
  },
}
</route>

<template>
  <PageLayout
    :navTitle="navTitle"
    :backRouteName="backRouteName"
    :routeMethod="routeMethod"
    @navBack="handleNavBack"
    :isShowNavRightTextMp="['group', 'discussion'].includes(chatObj?.type)"
    navRightTextMp="设置"
    @navRightMp="handleGoChatSetting"
  >
    <view :class="{ wrap: true, [deviceBrand]: true }" :style="getWrapStyle" @click="hideOptions">
      <!-- prettier-ignore -->
      <z-paging ref="paging" v-model="dataList" :fixed="false" use-chat-record-mode use-virtual-list cell-height-mode="dynamic" safe-area-inset-bottom bottom-bg-color="#e5e5e5" @query="queryList" @keyboardHeightChange="keyboardHeightChange" @hidedKeyboard="hidedKeyboard" :default-page-size="15">
        <template #cell="{item,index}" :key="index">
          <view style="transform: scaleY(-1)">
            <chat-item :item="item" :playMsgid="playMsgid" :isGroupOwner="isGroupOwner" @playVoice="handlePlayVoice" @open="openReadDetail" @insertMessage="insertMessage" @openForwardModal="openForwardModal" @quickReply="quickReply" @reply="handleReplyFocus" @openReplyDetail="openReplyDetailModal" @revokeMessage="revokeMessage"></chat-item>
          </view>
        </template>
        <template #bottom>
          <chat-input-bar ref="inputBar" :selectedUser="selectedUser" :mentionAll="mentionAll" :chatObj="chatObj" @send="doSend" @image="handleImage" @file="handleFile" @send-voice="doSendVoice" @handleFocus="handleFocus" @handleBlur="handleBlur" @callUser="handleCallUser" @chatRecord="handleGoChatRecord"/>
        </template>
      </z-paging>
    </view>
    <template #navRight>
      <view
        v-if="['group', 'discussion'].includes(chatObj.type)"
        class="cuIcon-friend font-size-16px color-white"
        @click="handleGoChatSetting"
      ></view>
    </template>
    <!-- 文件上传组件 -->
    <LFile
      ref="lFileRef"
      :confirmFileName="true"
      fileNameKey="fileName"
      @up-success="handleFileSuccess"
    />
    <!-- 消息阅读状态   -->
    <MsgReadDetail ref="readDetailRef" v-if="modalShow" @close="modalShow = false" />
    <!-- 回复详情弹窗   -->
    <ReplyDetailModal
      ref="replyDetailRef"
      v-if="replyDetailShow"
      @close="replyDetailShow = false"
      @playVoice="handlePlayVoice"
      @replied="handleReplied"
    />
    <!-- @选人组件   -->
    <SelectMentionUserModal
      v-if="modalUserShow"
      :showIds="showUserIds"
      :selected="userModelValue"
      rowKey="id"
      modalTitle="选择提及人"
      :maxSelectCount="10"
      :readonlyUser="readonlyUser"
      @change="handleChange"
      @close="modalUserShow = false"
    ></SelectMentionUserModal>
    <!-- 转发选消息组件   -->
    <SelectChatMsgModal
      v-if="forwardModalShow"
      modalTitle="转发"
      :msgId="chatObj.id"
      @close="forwardModalShow = false"
    ></SelectChatMsgModal>
  </PageLayout>
</template>

<script lang="ts" setup>
//
import { onLaunch, onShow, onHide, onLoad, onReady } from '@dcloudio/uni-app'
import { nextTick, onMounted, ref } from 'vue'
import { useUserStore } from '@/store/user'
import { http } from '@/utils/http'
import { useToast, useMessage, useNotify, dayjs } from 'wot-design-uni'
import { useRouter } from '@/plugin/uni-mini-router'
import { cache, getFileAccessHttpUrl, hasRoute, formatDate } from '@/common/uitls'
import { TENANT_LIST } from '@/common/constants'
import socket from '@/common/socket'
import { textReplaceEmoji, getEmojiImageUrl } from './emojis'
import chatInputBar from './components/chat-input-bar.vue'
import chatItem from './components/chat-item.vue'
import { getEnvBaseUrl } from '@/utils/index'
import { useParamsStore } from '@/store/page-params'
import { isMp } from '@/utils/platform'
import MsgReadDetail from '@/pages-message/chat/components/MsgReadDetail.vue'
import ReplyDetailModal from '@/pages-message/chat/components/ReplyDetailModal.vue'
import SelectMentionUserModal from './components/SelectMentionUserModal.vue'
import SelectChatMsgModal from '@/pages-message/chat/components/SelectChatMsgModal.vue'
import appBadge from '@/common/appBadge'

defineOptions({
  name: 'chat',
  options: {
    // apply-shared‌：当前页面样式会影响到子组件样式.(小程序)
    // shared‌：当前页面样式影响到子组件，子组件样式也会影响到当前页面.(小程序)
    styleIsolation: '‌apply-shared‌',
  },
})

const api = {
  chatlog_old: '/eoa/im/api/queryChatLogList',
  chatlog: '/eoa/im/newApi/records',
  historyChatlog: '/eoa/im/newApi/historyRecords',
  sendMsg: '/eoa/im/newApi/sendMessage',
  sendFile: '/eoa/im/newApi/sendFile',
  creatFriendSession: '/eoa/im/newApi/creatFriendSession',
  getReferenceMsg: '/eoa/im/newApi/getReferenceMsg',
  getReferenceNum: '/eoa/im/newApi/getReferenceNum',
  revokeMessage: '/eoa/im/newApi/revokeMessage',
  uploadUrl: `${getEnvBaseUrl()}/eoa/im/newApi/sendImage`,
}

const globalData = getApp().globalData
const { systemInfo, navHeight } = globalData
const { statusBarHeight, deviceBrand, screenHeight } = systemInfo
const toast = useToast()
const userStore = useUserStore()
const paging = ref(null)

const lFileRef = ref(null)
// 消息弹窗
const modalShow = ref(false)
const readDetailRef = ref(null)
// 信息
const chatObj = ref({ type: '' })
// 对方userid 或者 群id 或者 讨论组id
const chatto = ref()
const navTitle = ref('')
const myuid = ref(userStore.userInfo.userid)
const msgList = ref([])
// const pageNo = ref(1)
// const pageSize = ref(10)
const loadingShow = ref(false)
const hasRecord = ref(false)
const dataList = ref([])
const inputBar = ref(null)
const AUDIO = uni.createInnerAudioContext()
const playMsgid = ref('')
let stopWatch: any = null
const paramsStore = useParamsStore()
const backRouteName = ref('message')
const routeMethod = ref('pushTab')
const router = useRouter()
// 键盘高度
const keyboardHeight = ref(0)
// 是否首次加载
const isFirstLoad = true
// 加载历史消息
const loadHistory = ref(false)
let historyPageNo = 1
let chatItemData = {}
// 引用消息缓存
const cacheReply = ref({})
// 引用消息请求缓存（防止同一引用并发重复请求）
const pendingReplyRequests: Record<string, Promise<any>> = {}
// 是否是荣耀手机
const isHonor = deviceBrand === 'honor'
// 页面初始化
const init = () => {
  const localData = paramsStore.getPageParams('chat')
  const params = localData?.data
  if (!params) {
    return
  }
  cacheReply.value = {}
  chatObj.value = { ...params }
  // 对方头像、群头像、讨论组头像
  navTitle.value = params.fromUserName
  // 对方userid 或者 群id 或者 讨论组id
  chatto.value = chatObj.value.msgTo
  chatItemData = params
  if (params.type == 'friend') {
    // 创建会话数据
    creatFriendSession(chatObj.value.msgTo)
  }
  // 启动webSocket
  onSocketOpen()
  // 接收消息
  onSocketReceive()
  // 获取群聊成员
  getGroupUser()
  // 加载初始页面消息
  loadHistory.value = false
  historyPageNo = 1
  if (localData.back) {
    backRouteName.value = localData.back
    routeMethod.value = localData.routeMethod
  }
}
// 创建会话数据
const creatFriendSession = (userId) => {
  http.post(api.creatFriendSession, {
    type: 'friend',
    userId,
  })
}
const onSocketOpen = () => {
  console.log('启动webSocket')
  socket.init('eoaNewChatSocket')
}
const onSocketReceive = () => {
  const _this = this
  socket.acceptMessage = function (res) {
    console.log('页面收到的消息=====》', res)
    if (res.event == 'event_talk_revoke') {
      // 撤回了消息
      removeMsg(res)
    } else {
      // event_chat_talk
      if (res.event.startsWith('event_chat_talk') || res.event === 'event_chat_add_dialogue') {
        // 聊天消息
        screenMsg(res)
        unreadClear()
      }
      if (res.event.startsWith('event_chat_read')) {
        unreadClear()
        // 更新已读未读状态
        readMsg(res)
      }
    }
  }
}
/**
 * 更新已读未读状态
 * res.data：{
 *     "msgIds": "2044246255316447234",
 *     "msgTo": "1959896729107812354",
 *     "msgFrom": "1959887773723512833",
 *     "type": "friend",
 *     "izRead": true
 * }
 * @param data
 */
const readMsg = (res?: any) => {
  setTimeout(() => {
    // 加载初始页面消息
    loadHistory.value = false
    historyPageNo = 1
    paging.value?.refresh()
  }, 0)
}
const removeMsg = (data) => {
  const arr = msgList.value.filter((item) => item.id != data.id)
  msgList.value = arr
}
const screenMsg = (msg) => {
  // update-begin--author:liaozhiyang---date:20260812---for：【LHZP-1790】修复自己发的消息不能撤回及socket连不上
  let isCurrentChatMessage = false
  if (chatObj.value.type == 'friend') {
    const isReceivedMessage = msg.data.msgFrom == chatto.value && msg.data.msgTo == myuid.value
    const isSentMessage = msg.data.msgFrom == myuid.value && msg.data.msgTo == chatto.value
    isCurrentChatMessage = isReceivedMessage || isSentMessage
  } else if (['group', 'discussion'].includes(chatObj.value.type)) {
    isCurrentChatMessage = msg.data.msgTo == chatto.value
  }
  // update-end--author:liaozhiyang---date:20260812---for：【LHZP-1790】修复自己发的消息不能撤回及socket连不上
  if (isCurrentChatMessage) {
    console.log('用户消息')
    const time = formatDate(msg.data.sendTime, 'yyyy-MM-dd hh:mm:ss')
    const id = time.replace(/\:/g, '').replace(/\-/g, '').replace(' ', '')
    paging.value?.addChatRecordData(
      analysis([
        {
          ...msg.data,
          sendTimeId: id,
          type: chatObj.value.type,
        },
      ]),
    )
    // 非自己的消息震动
    if (msg.data.msgFrom != myuid.value) {
      console.log('振动')
      uni.vibrateLong()
    }
  }
}
// 替换表情符号为图片
const replaceEmoji = (str) => {
  const temp = textReplaceEmoji(str)
  return '<div style="display:inline-block">' + temp + '</div>'
}
// 获取引用消息数量
const getRefMsgNum = (records) => {
  const referenceIds = records.map((item) => item.referenceMsgId)
  const uniqueIds = referenceIds.reduce((acc, current) => {
    if (!acc.includes(current)) {
      // 检查累积数组是否已包含当前元素
      acc.push(current)
    }
    return acc
  }, [])
  for (let i = 0; i < uniqueIds.length; i++) {
    const id = uniqueIds[i]
    http.get(api.getReferenceNum, { refId: id }).then((res: any) => {
      if (res.success) {
        const replyNum = res.result || 0
        // 在响应式数组 dataList 中找到对应项并更新，确保触发视图更新
        dataList.value.forEach((item) => {
          if (item.id === id) {
            item.replyNum = replyNum
          }
        })
      }
    })
  }
}

const queryList = (pageNo, pageSize) => {
  // 数据库查询消息列表
  const params = {
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

  // 加载消息列表，判断是否有更多数据
  const data = [
    {
      id: 1,
      fromUserName: '顾平',
      sendTime: '1977-11-13',
      fromAvatar: 'https://dummyimage.com/100x100/000/fff&text=%E6%9D%8E%E5%9B%9B',
      type: 'friend',
      izTop: 1,
      status: 'offline',
      msgFrom: 4000,
      msgTo: 100,
      userId: '1678948772039729154',
      msgType: 'text',
      msgData:
        '可半达办外将物起算置知空子。上题务点条界思清法导集马为和计。始在形计各强可求开去手先下识极级育专。形子民委想己给号全维精道应。斯适般不拉个世被资提达须之多关。己除约确元则次同风平维音毛听。少验且内果论治量军们活展观情面元越。',
    },
    {
      id: 2,
      fromUserName: '熊艳',
      sendTime: '1977-11-13',
      fromAvatar: 'https://dummyimage.com/100x100/000/fff&text=%E6%9D%8E%E5%9B%9B',
      type: 'friend',
      izTop: 0,
      status: 'online',
      msgFrom: 4012,
      msgTo: 134,
      userId: '1678948772039729154',
      msgType: 'text',
      msgData:
        '斗取写也展需会于儿次只三自到界民品因。只代装细打三管规这前千器她她入音即准。必象和长使南资几时明因米多交极须空。',
    },
    {
      id: 3,
      fromUserName: '康娜',
      sendTime: '1977-11-13',
      fromAvatar: 'https://dummyimage.com/100x100/000/fff&text=%E6%9D%8E%E5%9B%9B',
      type: 'discussion',
      izTop: 1,
      status: 'offline',
      msgFrom: 4024,
      msgTo: 168,
      userId: '1678948772039729154',
      msgType: 'text',
      msgData:
        '图步把单增利老何列力道何认象。子各交群容产识一界边先式声。被思务共是圆音少际指王元压没任内共。养作包京何铁历属信战族再线理却来情料。能周内家术向建满思书温音太装。时她切调它论族温中三关且与志千。',
    },
    {
      id: 4,
      fromUserName: '石平',
      sendTime: '1977-11-13',
      fromAvatar: 'https://dummyimage.com/100x100/000/fff&text=%E6%9D%8E%E5%9B%9B',
      type: 'group',
      izTop: 1,
      status: 'offline',
      msgFrom: 4036,
      msgTo: 202,
      userId: '1678948772039729154',
      msgType: 'text',
      msgData:
        '民高价般直素划达期矿身更价律或支今。争局便工争相算则参调信斯。把清得完别青院阶火老先位包回速变。意温太合为这来物只我非象专型又加军。至取拉方毛眼例着大你这每相亲该元风。',
    },
    {
      id: 5,
      fromUserName: '马杰',
      sendTime: '1977-11-13',
      fromAvatar: 'https://dummyimage.com/100x100/000/fff&text=%E6%9D%8E%E5%9B%9B',
      type: 'group',
      izTop: 1,
      status: 'offline',
      msgFrom: 4048,
      msgTo: 236,
      userId: '1678948772039729154',
      msgType: 'text',
      msgData:
        '除命市与命成型两口接在及民志提能。需参处空容感学长革段易给分。始真结红型图处技界党非青机山。广直声从老照如写中么省风但。论斗展就积信区北形大报达据把青要。',
    },
    {
      id: 6,
      fromUserName: '沈艳',
      sendTime: '1977-11-13',
      fromAvatar: 'https://dummyimage.com/100x100/000/fff&text=%E6%9D%8E%E5%9B%9B',
      type: 'friend',
      izTop: 0,
      status: 'offline',
      msgFrom: 4060,
      msgTo: 270,
      userId: '1678948772039729154',
      msgType: 'text',
      msgData:
        '规响用其江众器老也成等听节电西。系石教建还厂文气要际长中电今。情素他头资风矿象非这经格老包问过。史期带之走北形历值从所因断八技。红行没众说共史张在任千物今老。传队命做打此无直转术直其门公。',
    },
    {
      id: 7,
      fromUserName: '崔芳',
      sendTime: '1977-11-13',
      fromAvatar: 'https://dummyimage.com/100x100/000/fff&text=%E6%9D%8E%E5%9B%9B',
      type: 'discussion',
      izTop: 0,
      status: 'online',
      msgFrom: 4072,
      msgTo: 304,
      userId: '1678948772039729154',
      msgType: 'text',
      msgData:
        '识保住并非先严间眼马级点叫识只管。写信为每下数集被料前号变很整合。收业后局看并太能决来二府展建片活即体。给史求音很三动作目重因质除提。法关活量管集求公又再时共小明个自确。集提支很也规入并我基照计最要飞院面。',
    },
    {
      id: 8,
      fromUserName: '郝超',
      sendTime: '1977-11-13',
      fromAvatar: 'https://dummyimage.com/100x100/000/fff&text=%E6%9D%8E%E5%9B%9B',
      type: 'discussion',
      izTop: 1,
      status: 'online',
      msgFrom: 4084,
      msgTo: 338,
      userId: '1678948772039729154',
      msgType: 'text',
      msgData:
        '状断只派器新以真业强说部多确料。始矿认要联清才权况况法色式。引办研角且百国路里还计走中细位。或温作经人周复技常位交文共没运。',
    },
  ]
  const records = analysis(data)
  paging.value.complete(records)
  if (isFirstLoad) {
    uni.$emit('chatList:unreadClear', chatItemData)
    unreadClear()
  }
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
      item.originalMsgData = item.msgData
      item.msgData = content
      item.replyNum = 0
      return item
    })
    const referenceIds = []
    for (let i = 0; i < list.length; i++) {
      if (list[i].msgType == 'revoke') {
        continue
      }
      if (list[i].referenceMsgId) {
        referenceIds.push(list[i].referenceMsgId)
        list[i] = handleReplyMsg(list[i], list)
      }
    }
  }
  return data
}
// 顯示用戶ID
const showUserIds = ref('')
const mentionUserNames = ref([])
// 是否群主
const isGroupOwner = ref(false)
// 获取群聊成员
const getGroupUser = () => {
  if (!['group', 'discussion'].includes(chatObj.value.type)) {
    return
  }
  http.get(`/eoa/im/api/getMembers?id=${chatto.value}`).then((res: any) => {
    if (res.code === 0 && res.data?.list) {
      mentionUserNames.value = res.data.list
        .filter((item) => item.id !== userStore.userInfo.userid)
        .map((item) => item.realname)
        .filter(Boolean)
      showUserIds.value =
        res.data.list
          ?.filter((item) => item.id !== userStore.userInfo.userid)
          .map((item) => item.id)
          .join(',') || ''
      isGroupOwner.value = res.data.owner?.id === userStore.userInfo.userid
    }
  })
}
// 加载历史消息
const getMsgList = (pageNo = 1, pageSize = 20) => {
  http
    .get(api.historyChatlog, {
      type: chatObj.value.type,
      pageNo,
      pageSize,
      msgTo: chatto.value,
    })
    .then((res: any) => {
      historyPageNo++
      if (res.success && res.result?.records) {
        if (res.result.records.length > 0) {
          const records = analysis(res.result.records)
          // 第一页合并数据，后续页直接覆盖
          const allData = pageNo === 1 ? [...dataList.value, ...records] : [...records]
          paging.value.complete(allData)
          getRefMsgNum(allData)
          if (isFirstLoad) {
            uni.$emit('chatList:unreadClear', chatItemData)
            unreadClear()
          }
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
  let replyContent = {}
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === tempId) {
      replyContent = {
        id: list[i].id,
        fromUserName: list[i].fromUserName,
        msgData: list[i].msgData,
        msgType: list[i].msgType,
        fileName: list[i].fileName,
        fileType: list[i].fileType,
      }
      break
    }
  }
  item.replyContent = replyContent
  // 获取引用消息
  if (item.reply && !item.replyContent.id) {
    const cacheReplyContent = cacheReply.value[tempId]
    if (cacheReplyContent) {
      item.replyContent = { ...cacheReplyContent }
    } else {
      // 复用已有的请求Promise，避免同一引用并发请求多次
      if (!pendingReplyRequests[tempId]) {
        pendingReplyRequests[tempId] = http
          .get(api.getReferenceMsg, { refId: tempId })
          .then((res: any) => {
            if (res.success) {
              cacheReply.value[tempId] = res.result || {}
            }
            return cacheReply.value[tempId] || {}
          })
          .finally(() => {
            delete pendingReplyRequests[tempId]
          })
      }
      pendingReplyRequests[tempId].then((result) => {
        item.replyContent = { ...result }
      })
    }
  }
  return item
}
const unreadClear = () => {
  http
    .post('/eoa/im/newApi/unreadClear', {
      type: chatObj.value.type,
      msgTo: chatObj.value.msgTo,
      msgFrom: chatObj.value.msgFrom,
    })
    .then((res: any) => {
      if (res.success) {
        // 更新角标数量
        // #ifndef H5
        appBadge()
        // #endif
        // _this.eventChannel.emit('toPrePageData', { data: 'data from chat page' })
      }
    })
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

// 监听键盘高度改变，请不要直接通过uni.onKeyboardHeightChange监听，否则可能导致z-paging内置的键盘高度改变监听失效（如果不需要切换表情面板则不用写）
const keyboardHeightChange = (res) => {
  inputBar.value.updateKeyboardHeightChange(res)
}
// 用户尝试隐藏键盘，此时如果表情面板在展示中，应当通知chatInputBar隐藏表情面板（如果不需要切换表情面板则不用写）
const hidedKeyboard = () => {
  inputBar.value.hidedKeyboard()
}
const doSend = (textMsg) => {
  // 发送
  sendMsg(textMsg, 'text')
}

const sendMsg = (content, type) => {
  // 实际应用中，此处应该提交长连接，模板仅做本地处理。
  const nowDate = new Date()
  // 发送消息
  const obj = {
    mine: {
      avatar: userStore.userInfo.avatar,
      content,
      id: myuid.value,
      mine: true,
      username: userStore.userInfo.username,
    },
    to: {
      avatar: chatObj.value.avatar,
      id: chatObj.value.msgTo,
      type: chatObj.value.type,
      username: chatObj.value.username,
    },
  }

  const sendData = {
    type: 'chatMessage',
    data: obj,
  }
  const params = {
    type: chatObj.value.type,
    msgTo: chatObj.value.msgTo,
    text: content,
    msgType: 'text',
    refId: replyObj.value?.id,
  }
  if (content.startsWith('@') && userModelValue.value.length > 0) {
    params.userIds = mentionAll.value ? 'all' : userModelValue.value.join(',')
  }
  http.post(api.sendMsg, params).then((res: any) => {
    console.log('消息发送结果：', res)
    if (!res.success) {
      toast.error(res.message)
    } else {
      userModelValue.value = []
      mentionAll.value = false
      replyObj.value = {}
    }
  })
}
/**
 * 发送语音消息
 * @param voiceMsg
 */
const doSendVoice = (voiceMsg) => {
  const userStore = useUserStore()
  const time = formatDate(new Date().getTime(), 'yyyy-MM-dd hh:mm:ss')
  const id = time.replace(/\:/g, '').replace(/\-/g, '').replace(' ', '')
  const formData = {
    type: chatItemData.type,
    msgTo: chatto.value,
    fileId: id,
    msgType: 'voice',
    length: voiceMsg.length,
  }
  uni.uploadFile({
    url: `${getEnvBaseUrl()}/eoa/im/newApi/sendFile`,
    filePath: voiceMsg.url,
    header: {
      'X-Access-Token': userStore.userInfo.token,
      'X-Tenant-Id': userStore.userInfo.tenantId,
    },
    name: 'file',
    formData,
    success: (res: any) => {
      if (res.data) {
        const data = JSON.parse(res.data)
        if (data.success) {
          replyObj.value = {}
        }
      }
    },
  })
}
const handleImage = (type) => {
  const time = formatDate(new Date().getTime(), 'yyyy-MM-dd hh:mm:ss')
  const id = time.replace(/\:/g, '').replace(/\-/g, '').replace(' ', '')
  const formData = {
    type: chatItemData.type,
    msgTo: chatto.value,
    fileId: id,
    msgType: 'images',
    fileName: '',
  }
  const { loading, data, error, run } = useUpload(
    { ...formData, name: 'image' },
    { url: api.uploadUrl, sourceType: [type] },
  )
  // H5 不能在 chooseImage 前 showLoading，遮罩会挡住选图且可能导致 loading 永不关闭
  if (stopWatch) stopWatch()
  // update-begin-author:liaozhiyang date:2026-08-03 for:【LHZP-1663】h5端聊天选择图片上传loading一直不消失
  stopWatch = watch(
    () => [loading.value, error.value, data.value],
    ([isLoading, err, uploadData]: any) => {
      console.log('loading, err, data', isLoading, err, uploadData)
      if (isLoading === true) {
        uni.showLoading({ title: '上传中...' })
        return
      }
      uni.hideLoading()
      if (err) {
        // 取消选图或上传失败
      } else if (uploadData) {
        if (uploadData.code === 200) {
          replyObj.value = {}
        } else {
          toast.warning(uploadData.message)
        }
      }
      stopWatch?.()
      stopWatch = null
    },
  )
  // update-begin-author:liaozhiyang date:2026-08-03 for:【LHZP-1663】h5端聊天选择图片上传loading一直不消失
  run()
}

// 处理文件上传
const handleFile = () => {
  if (!lFileRef.value) return
  lFileRef.value.upload({
    // #ifdef APP-PLUS
    currentWebview: getCurrentPages()[getCurrentPages().length - 1].$getAppWebview(),
    // #endif
    header: {
      'X-Access-Token': userStore.userInfo.token,
    },
    url: `${getEnvBaseUrl()}${api.sendFile}`,
    formData: {
      type: chatItemData.type,
      msgTo: chatto.value,
    },
    name: 'file',
  })
}

const handleFileSuccess = (res) => {
  let fileObj = res.data
  // #ifdef APP-PLUS
  fileObj = JSON.parse(res.data.id)
  // #endif
  if (fileObj.success) {
    replyObj.value = {}
  } else {
    toast.error(fileObj.message || '文件上传失败')
  }
}
// update-begin-author:liaozhiyang date:2025-11-18 for:【JHHB-1013】荣耀手机上聊天的输入框得到焦点时，输入框和键盘有较大的空白
const getWrapStyle = computed(() => {
  if (isHonor) {
    // 荣耀
    return {
      height: `${screenHeight - (statusBarHeight + navHeight) - keyboardHeight.value}px`,
    }
  }
  return {
    height: '100%',
  }
})
const handleFocus = (height) => {
  keyboardHeight.value = height
}
const handleBlur = () => {
  keyboardHeight.value = 0
}
// update-end-author:liaozhiyang date:2025-11-18 for:【JHHB-1013】荣耀手机上聊天的输入框得到焦点时，输入框和键盘有较大的空白

init()

const hideOptions = () => {
  uni.$emit('chat:hideOptions')
}

const handleNavBack = () => {
  uni.$emit('chatList:unreadClear', chatItemData)
  uni.$emit('chatList:reload')
}
const handleGoChatSetting = () => {
  paramsStore.setPageParams('chatSetting', {
    type: chatObj.value.type,
    chatto: chatto.value,
  })
  router.push({
    name: 'chatSetting',
  })
}
const handleGoChatRecord = () => {
  paramsStore.setPageParams('chatRecord', {
    type: chatObj.value.type,
    chatto: chatto.value,
  })
  router.push({
    name: 'chatRecord',
  })
}
// 撤回消息
const revokeMessage = (item) => {
  console.log('撤回消息:', item)
  http
    .post(api.revokeMessage, {
      id: item.id,
      msgData: '',
    })
    .then((res: any) => {
      if (res.success) {
        readMsg()
      }
    })
}
//* ****************阅读状态begin*********
const openReadDetail = (item) => {
  modalShow.value = true
  setTimeout(() => {
    readDetailRef.value?.open(item)
  }, 500)
}
//* ****************阅读状态end*********
//* ****************回复详情begin*********
const replyDetailShow = ref(false)
const replyDetailRef = ref(null)
const openReplyDetailModal = (item) => {
  replyDetailShow.value = true
  setTimeout(() => {
    replyDetailRef.value?.open(item, chatObj.value)
  }, 500)
}
const handleReplied = () => {
  // 回复成功后刷新回复数量
  readMsg()
}
//* ****************回复详情end*********
//* ****************@用户begin*********
const modalUserShow = ref(false)
const userModelValue = ref([])
const selectedUser = ref([])
const mentionAll = ref(false)
const readonlyUser = ref([userStore.userInfo.id])

const handleCallUser = () => {
  modalUserShow.value = true
}
const handleChange = (userData, isAll) => {
  selectedUser.value = userData
  mentionAll.value = isAll
  userModelValue.value = userData.map((item) => item.id)
}
//* ****************@用户end*********

//* ****************引用begin*********
const replyObj = ref({})
provide('replyObj', replyObj)
// 引用
const insertMessage = (recordData) => {
  replyObj.value = recordData
}
//* ****************引用用户end*********

//* ****************转发begin*********
const forwardModalShow = ref(false)
const forwardMsg = ref({})
provide('forwardMsg', forwardMsg)
// 转发
const openForwardModal = (msg) => {
  forwardMsg.value = msg
  forwardModalShow.value = true
}
//* ****************转发end***********

//* ****************快速回复begin***********
const quickReply = (item) => {
  doSend('[微笑]')
}
//* ****************快速回复end***********
//* ****************@提及回复begin***********
const handleReplyFocus = (item) => {
  inputBar.value?.focusInput()
}
//* ****************@提及回复end***********
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

<style lang="scss">
@import '../../style/chat/style.scss';
</style>

<style lang="scss" scoped>
//
.wrap {
  height: 100%;
  // update-begin-author:liaozhiyang date:2025-11-18 for:【JHHB-1013】荣耀手机上聊天的输入框得到焦点时，输入框和键盘有较大的空白
  &.honor {
    :deep(.zp-page-bottom-keyboard-placeholder-animate) {
      display: none;
    }
  }
  // update-begin-author:liaozhiyang date:2025-11-18 for:【JHHB-1013】荣耀手机上聊天的输入框得到焦点时，输入框和键盘有较大的空白
}
</style>
