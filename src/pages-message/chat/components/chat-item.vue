<!-- z-paging聊天item -->

<template>
  <view class="chat-item" @click="hideOptions">
    <text
      class="chat-time"
      v-if="item.sendTime && item.sendTime.length && !['systemMessage'].includes(item.msgType)"
    >
      {{ item.sendTime?.substring(0, 19) }}
    </text>
    <!--系统消息-->
    <template v-if="['systemMessage'].includes(item.msgType)">
      <view class="chat-systemMessage">{{ item.msgData }}</view>
    </template>
    <template v-else-if="['revoke'].includes(item.msgType)">
      <view class="chat-systemMessage">
        {{ isMe(item) ? '你' : item.type == 'friend' ? '对方' : item.fromUserName }}撤回了一条消息
      </view>
    </template>
    <view v-else :class="{ 'chat-container': true, 'chat-location-me': isMe(item) }">
      <view class="chat-icon-container">
        <image class="chat-icon" :src="getFileAccessHttpUrl(item.fromAvatar)" mode="aspectFill" />
      </view>
      <view class="chat-content-container">
        <text :class="{ 'chat-user-name': true, 'chat-location-me': isMe(item) }">
          {{ item.fromUserName }}
        </text>
        <view
          :class="{
            'chat-text-container-super': true,
            'flex-end': isMe(item),
            'flex-start': !isMe(item),
          }"
        >
          <!---文字-->
          <template v-if="['text'].includes(item.msgType)">
            <view
              v-if="isMe(item) || !item.originalMsgData.startsWith('@')"
              :class="{ 'chat-text-container': true, 'chat-text-container-me': isMe(item) }"
              @longpress="handleLongPress(item)"
              @touchstart="handleTouchStart(item)"
              @touchend="handleTouchEnd"
              @touchcancel="handleTouchCancel"
            >
              <view :class="{ 'chat-text': true, 'chat-text-me': isMe(item) }">
                <rich-text :nodes="item.msgData"></rich-text>
              </view>
            </view>
            <!---@信息-->
            <view
              v-else
              class="chat-mention-container"
              @longpress="handleLongPress(item)"
              @touchstart="handleTouchStart(item)"
              @touchend="handleTouchEnd"
              @touchcancel="handleTouchCancel"
            >
              <view class="mention-badge-row">
                <text class="mention-at-badge">@</text>
                <text class="mention-at-label">有人@了你</text>
              </view>
              <view class="mention-body">
                <rich-text class="mention-text" :nodes="item.msgData"></rich-text>
                <view class="mention-actions">
                  <view class="mention-action receive" @click="handleReceive(item)">
                    <image
                      class="mention-emoji-img"
                      src="https://jeecgos.oss-cn-beijing.aliyuncs.com/files/appimg/chat_emoticon/1-1.png"
                      mode="aspectFit"
                    />
                    <text class="mention-action-text">收到</text>
                  </view>
                  <view class="mention-separator"></view>
                  <view class="mention-action reply" @click="handleReply(item)">
                    <text class="mention-action-text mention-reply-text">回复</text>
                  </view>
                </view>
              </view>
            </view>
          </template>
          <!--图片-->
          <template v-else-if="['image'].includes(item.msgType)">
            <!-- update-begin--author:liaozhiyang---date:20260814---for：【LHZP-1954】聊天图片比例要合适展示 -->
            <wd-img
              :width="imageSize.width"
              :height="imageSize.height"
              :enable-preview="true"
              :radius="10"
              mode="aspectFit"
              :src="getFileAccessHttpUrl(item.msgData)"
              @load="handleImageLoad"
              @longpress="handleLongPress(item)"
              @touchstart="handleTouchStart(item)"
              @touchend="handleTouchEnd"
              @touchcancel="handleTouchCancel"
            ></wd-img>
            <!-- update-end--author:liaozhiyang---date:20260814---for：【LHZP-1954】聊天图片比例要合适展示 -->
          </template>
          <!--语音-->
          <template v-else-if="['voice'].includes(item.msgType)">
            <view
              :class="{
                'chat-voice-container': true,
                'chat-voice-container-me': isMe(item),
                play: playMsgid == item.id,
              }"
              @click="playVoice(item)"
              @longpress="handleLongPress(item)"
              @touchstart="handleTouchStart(item)"
              @touchend="handleTouchEnd"
              @touchcancel="handleTouchCancel"
            >
              <view class="length mr-2" v-if="item.msgData.length">
                {{ getShortLength(item.msgData.length) }}
              </view>
              <view class="icon my-voice"></view>
            </view>
          </template>
          <!--文件-->
          <template v-else-if="['file'].includes(item.msgType)">
            <view :class="{ 'chat-file-container': true, 'chat-file-container-me': isMe(item) }">
              <view
                class="chat-file-content"
                @longpress="handleLongPress(item)"
                @touchstart="handleTouchStart(item)"
                @touchend="handleTouchEnd"
                @touchcancel="handleTouchCancel"
              >
                <view class="chat-file-icon">
                  <text class="chat-file-type">{{ getFileTypeText(item.fileType) }}</text>
                </view>
                <view class="chat-file-info">
                  <view class="chat-file-name">{{ item.fileName }}</view>
                  <view class="chat-file-size">({{ formatFileSize(item.fileSize) }})</view>
                  <view class="chat-file-status">文件已成功发送</view>
                </view>
              </view>
              <view class="chat-file-actions">
                <text class="chat-file-action-btn" @click="handleDownload(item)">下载</text>
              </view>
            </view>
          </template>
        </view>
        <ReplyContent
          v-if="item.reply && item.referenceMsgId"
          :referenceMsgId="item.referenceMsgId"
          :replyContent="item.replyContent"
          :playMsgid="playMsgid"
          :uniqueId="item.id"
          @playVoice="playVoice"
        ></ReplyContent>
        <view class="chat-status" v-if="isMe(item)">
          <text class="chat-read" v-if="item.type == 'friend' && item.izRead == false">未读</text>
          <text
            class="chat-read"
            v-if="item.type !== 'friend' && item.unreadCount > 0 && item.userIds"
            @click="openReadDetail(item)"
          >
            {{ item.unreadCount }}人未读
          </text>
          <text class="chat-read" v-if="item.replyNum > 0" @click="openReplyDetail(item)">
            {{ item.replyNum }}条回复
          </text>
        </view>
      </view>
    </view>
    <view
      v-if="showOptionsForMessage === item.id"
      class="message-options-overlay"
      @click="hideOptions"
    >
      <view class="message-options" :class="{ 'options-me': isMe(item) }" @click.stop="">
        <view class="option-item" v-if="canRevoke(item)" @click.stop="revokeMessage(item)">
          <text class="cIcon cuIcon-back_android text-white" style="font-size: 20px"></text>
          <text class="option-text">撤回</text>
        </view>
        <view class="option-item" @click.stop="replyToMessage(item)">
          <text class="cIcon cuIcon-repeal text-white" style="font-size: 20px"></text>
          <text class="option-text">引用</text>
        </view>
        <view
          v-if="item.msgType == 'text'"
          class="option-item"
          @click.stop="copyMessage(item.originalMsgData)"
        >
          <text class="cIcon cuIcon-copy text-white" style="font-size: 20px"></text>
          <text class="option-text">复制</text>
        </view>
        <view class="option-item" @click.stop="forwardMessage(item)">
          <text class="cIcon cuIcon-forwardfill text-white" style="font-size: 20px"></text>
          <text class="option-text">转发</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { useUserStore } from '@/store/user'
import { getFileAccessHttpUrl, downloadFile } from '@/common/uitls'
import { ref, onMounted, onBeforeUnmount } from 'vue'
import ReplyContent from './ReplyContent.vue'
defineOptions({ name: 'chat-item' })

const api = {
  doPreview: '/eoa/im/newApi/doPreview',
}
const userStore = useUserStore()
const emit = defineEmits([
  'playVoice',
  'open',
  'insertMessage',
  'openForwardModal',
  'quickReply',
  'reply',
  'openReplyDetail',
  'revokeMessage',
])
const props = defineProps({
  playMsgid: {
    type: String,
    default: '',
  },
  item: {
    type: Object,
    default: function () {
      return {
        sendTime: '',
        fromAvatar: '',
        fromUserName: '',
        msgData: '',
      }
    },
  },
  isGroupOwner: {
    type: Boolean,
    default: false,
  },
})
const isMe = (item) => {
  return item.msgFrom === userStore.userInfo.userid
}
// update-begin--author:liaozhiyang---date:20260814---for：【LHZP-1954】聊天图片比例要合适展示
const MAX_IMAGE_SIZE = 200
const imageSize = ref({ width: MAX_IMAGE_SIZE, height: MAX_IMAGE_SIZE })
const handleImageLoad = (event) => {
  const { width, height } = event.detail || {}
  if (!width || !height) return

  const scale = Math.min(MAX_IMAGE_SIZE / width, MAX_IMAGE_SIZE / height)
  imageSize.value = {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  }
}
// update-end--author:liaozhiyang---date:20260814---for：【LHZP-1954】聊天图片比例要合适展示
const playVoice = (item) => {
  emit('playVoice', item)
}

// 获取文件类型显示文本
const getFileTypeText = (fileType) => {
  if (!fileType) return 'FILE'
  return fileType.toUpperCase()
}

// 格式化文件大小
const formatFileSize = (size) => {
  if (!size) return '0B'
  const sizeNum = parseFloat(size)
  if (sizeNum < 1024) {
    return `${sizeNum}B`
  } else if (sizeNum < 1024 * 1024) {
    const kb = sizeNum / 1024
    return `${kb.toFixed(2)}KB`
  } else {
    const mb = sizeNum / 1024 / 1024
    return `${mb.toFixed(2)}MB`
  }
}

// 下载文件
const handleDownload = (item) => {
  const url =
    import.meta.env.VITE_SERVER_BASEURL +
    '/eoa/im/newApi/download?fileId=' +
    item.filedId +
    '&token=' +
    userStore.userInfo.token
  downloadFile(url)
}
// 获取短时间格式，去掉小时部分：00:00:18 => 00:18，已经是 mm:ss 格式则不处理
const getShortLength = (duration) => {
  if (!duration) return '00:00'
  const str = String(duration)
  // 匹配 hh:mm:ss 格式（含小时），去掉小时部分
  const match = str.match(/^\d{2}:(\d{2}:\d{2})$/)
  return match ? match[1] : str
}
// 查看未读详情
const openReadDetail = (item) => {
  emit('open', item)
}
// 查看回复详情
const openReplyDetail = (item) => {
  emit('openReplyDetail', item)
}
// 查看回复详情
const copyMessage = (item) => {
  uni.setClipboardData({
    data: item,
    success: () => {
      uni.showToast({
        title: '复制成功',
        icon: 'success',
      })
      hideOptions()
    },
  })
}

//* ***引用和转发begin***************************************************
const showOptionsForMessage = ref(null)
const longPressTimer = ref(null)
const touchStartTime = ref(0)
// 触摸开始
const handleTouchStart = (item) => {
  touchStartTime.value = Date.now()
  longPressTimer.value = setTimeout(() => {
    handleLongPress(item)
  }, 500) // 500ms长按触发
}
// 触摸结束
const handleTouchEnd = () => {
  clearTimeout(longPressTimer.value)
  longPressTimer.value = null
}
// 触摸取消
const handleTouchCancel = () => {
  clearTimeout(longPressTimer.value)
  longPressTimer.value = null
}
// 长按处理
const handleLongPress = (item) => {
  showOptionsForMessage.value = item.id
  // 不要震动
  if (uni.vibrateShort) {
    // uni.vibrateShort()
  }
}
// 隐藏操作菜单
const hideOptions = () => {
  clearTimeout(longPressTimer.value)
  longPressTimer.value = null
  showOptionsForMessage.value = null
}
// 引用消息
const replyToMessage = (item) => {
  console.log('引用消息:', item)
  emit('insertMessage', item)
  hideOptions()
}
// 撤回消息：群主在群组/讨论组中不受2分钟限制
const canRevoke = (item) => {
  if (['group', 'discussion'].includes(item.type) && props.isGroupOwner) {
    return true
  }
  return Date.now() - new Date(item.sendTime).getTime() < 2 * 60 * 1000
}
// 撤回消息
const revokeMessage = (item) => {
  console.log('撤回消息:', item)
  emit('revokeMessage', item)
  hideOptions()
}
// 转发消息
const forwardMessage = (item) => {
  console.log('转发消息:', item)
  emit('openForwardModal', item)
  hideOptions()
}
// 快速回复消息-收到
const handleReceive = (item) => {
  console.log('快速回复消息:', item)
  emit('quickReply', item)
  hideOptions()
}
// @提及消息-回复
const handleReply = (item) => {
  emit('reply', item)
}
//* ***引用和转发end***************************************************

onMounted(() => {
  uni.$on('chat:hideOptions', hideOptions)
})
onBeforeUnmount(() => {
  uni.$off('chat:hideOptions', hideOptions)
})

defineExpose({
  hideOptions,
})
</script>

<style lang="scss" scoped>
.chat-item {
  display: flex;
  flex-direction: column;
  padding: 20upx;
}
.chat-time {
  padding: 4upx 0upx;
  text-align: center;
  font-size: 22upx;
  color: #aaaaaa;
}
.chat-systemMessage {
  padding: 4upx 0upx;
  text-align: center;
  font-size: 22upx;
  color: #979191;
}
.chat-container {
  display: flex;
  flex-direction: row;
}
.chat-location-me {
  flex-direction: row-reverse;
  text-align: right;
}
.chat-icon-container {
  margin-top: 12upx;
}
.chat-icon {
  width: 80upx;
  height: 80upx;
  border-radius: 8px;
  background-color: #eeeeee;
}
.chat-content-container {
  margin: 0upx 15upx;
}
.chat-user-name {
  font-size: 26upx;
  color: #888888;
}
.chat-text-container,
.chat-voice-container {
  text-align: left;
  background-color: #fff;
  border-radius: 8upx;
  padding: 7px 10px;
  margin-top: 10upx;
  /* #ifndef APP-NVUE */
  max-width: 500upx;
  /* #endif */
}
.chat-text-container-me,
.chat-voice-container {
  background-color: #55aaff;
}
.chat-voice-container {
  display: flex;
  align-items: center;
  color: #fff;
}
.chat-text-container-super {
  display: flex;
  flex-direction: row;
  &.flex-end {
    justify-content: flex-end;
  }
  &.flex-start {
    justify-content: flex-start;
  }
}
.chat-text {
  font-size: 28upx;
  /* #ifndef APP-NVUE */
  word-break: break-all;
  /* #endif */
  /* #ifdef APP-NVUE */
  max-width: 500upx;
  /* #endif */
}
.chat-text-me {
  color: white;
}
.chat-file-container {
  background-color: #fff;
  border-radius: 8upx;
  padding: 20upx;
  margin-top: 10upx;
  width: 500upx;
}
.chat-file-content {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  margin-bottom: 16upx;
}
.chat-file-icon {
  width: 80upx;
  height: 80upx;
  background-color: var(--wot-color-theme);
  border-radius: 8upx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20upx;
  flex-shrink: 0;
}
.chat-file-type {
  color: #fff;
  font-size: 24upx;
  font-weight: bold;
}
.chat-file-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  text-align: left;
}
.chat-file-name {
  font-size: 28upx;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 8upx;
}
.chat-file-size {
  font-size: 24upx;
  color: #999;
  margin-bottom: 8upx;
}
.chat-file-status {
  font-size: 24upx;
  color: #999;
}
.chat-file-actions {
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  gap: 30upx;
}
.chat-file-action-btn {
  font-size: 26upx;
  color: var(--wot-color-theme);
  cursor: pointer;
}
.chat-status {
  font-size: 24upx;
  margin-top: 8upx;
  .chat-read {
    color: var(--wot-color-theme);
  }
}
.message-options {
  position: absolute;
  top: -40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
  background: #fff;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 5px;
  z-index: 10;
}

/* 长按操作菜单遮罩 */
.message-options-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: transparent;
  z-index: 999;
}
/* 操作菜单 */
.message-options {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  background: rgba(0, 0, 0, 0.85);
  border-radius: 12px;
  padding: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  animation: fadeIn 0.02s ease;
}
.message-options.options-me {
  left: auto;
  right: 50%;
  transform: translate(50%, -50%);
}
/* 操作项 */
.option-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 16px;
  border-radius: 8px;
  min-width: 60px;
  cursor: pointer;
  transition: background-color 0.2s;
}
.option-item:active {
  background-color: rgba(255, 255, 255, 0.1);
}
.option-icon {
  font-size: 24px;
  margin-bottom: 4px;
}
.option-text {
  font-size: 12px;
  color: white;
  white-space: nowrap;
}
/* 动画效果 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.8);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}
/* 长按反馈效果 */
.chat-text-container:active {
  opacity: 0.7;
  transition: opacity 0.1s;
}

/* @提及消息卡片样式 */
.chat-mention-container {
  margin-top: 10upx;
  max-width: 520upx;
  width: 520upx;
  box-sizing: border-box;
}
/* 顶部 @标签行 */
.mention-badge-row {
  display: flex;
  align-items: center;
  gap: 6upx;
  margin-bottom: 10upx;
}
.mention-at-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34upx;
  height: 34upx;
  border-radius: 50%;
  background: linear-gradient(135deg, #55aaff, #2b83ff);
  color: #fff;
  font-size: 20upx;
  font-weight: 700;
  line-height: 1;
}
.mention-at-label {
  font-size: 22upx;
  color: #2b83ff;
  font-weight: 500;
}
/* 主卡片 */
.mention-body {
  background: #ffffff;
  border-radius: 14upx;
  border-left: 6upx solid #55aaff;
  box-shadow: 0 2upx 12upx rgba(85, 170, 255, 0.15);
  overflow: hidden;
}
/* 消息文本区域 */
.mention-text {
  display: block;
  font-size: 28upx;
  color: #333333;
  padding: 20upx 20upx 20upx;
  min-height: 80upx;
  /* #ifndef APP-NVUE */
  word-break: break-all;
  /* #endif */
}
/* 操作栏 */
.mention-actions {
  display: flex;
  align-items: center;
  background: #f7f8fa;
  border-top: 1upx solid #ebebeb;
  height: 52upx;
}
.mention-action {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8upx;
  height: 100%;
}
.mention-action:active {
  background: rgba(0, 0, 0, 0.04);
}
.mention-emoji-img {
  width: 34upx;
  height: 34upx;
  flex-shrink: 0;
}
.mention-action-text {
  font-size: 24upx;
  color: #555555;
}
.mention-reply-text {
  color: #2b83ff;
  font-weight: 500;
}
.mention-separator {
  width: 1upx;
  height: 32upx;
  background: #dedede;
  flex-shrink: 0;
}

/* 自己发出时不显示 @提及样式（当前逻辑中只对方消息会触发，保留兜底） */
.chat-location-me .chat-mention-container {
  margin-left: auto;
}
.chat-location-me .mention-body {
  border-left: none;
  border-right: 6upx solid #55aaff;
}
</style>
