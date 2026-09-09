<!-- z-paging聊天item -->

<template>
  <view class="chat-item">
    <!-- 普通消息：平铺（不区分左右） -->
    <view class="chat-flat">
      <view class="chat-meta" :style="{ color: isMe(item) ? '#28874D' : '#31aefd' }">
        <view class="chat-user-name">
          <text>
            {{ item.fromUserName }}
            <text v-if="isMe(item)">』</text>
          </text>
          <text
            v-if="
              item.sendTime && item.sendTime.length && !['systemMessage'].includes(item.msgType)
            "
          >
            {{ item.sendTime?.substring(0, 19) }}
          </text>
        </view>
      </view>
      <view class="chat-body">
        <!---文字-->
        <template v-if="['text'].includes(item.msgType)">
          <view class="chat-text-container">
            <view class="chat-text"><rich-text :nodes="item.msgData"></rich-text></view>
          </view>
        </template>
        <!--图片-->
        <template v-else-if="['image'].includes(item.msgType)">
          <wd-img
            width="200"
            height="200"
            :enable-preview="true"
            :radius="10"
            :src="getFileAccessHttpUrl(item.msgData)"
          ></wd-img>
        </template>
        <!--语音-->
        <template v-else-if="['voice'].includes(item.msgType)">
          <view
            class="chat-voice-container"
            :class="{ play: playMsgid == item.id }"
            @click="playVoice(item)"
          >
            <view class="length mr-2" style="color: #31aefd">{{ item.msgData.length }}</view>
            <view class="icon my-voice" style="color: #31aefd"></view>
          </view>
        </template>
        <!--文件-->
        <template v-else-if="['file'].includes(item.msgType)">
          <view class="chat-file-container">
            <view class="chat-file-content">
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
    </view>
  </view>
</template>

<script setup lang="ts">
import { useUserStore } from '@/store/user'
import { getFileAccessHttpUrl, downloadFile } from '@/common/uitls'
import { ref } from 'vue'
defineOptions({ name: 'chat-item' })

const api = {
  doPreview: '/eoa/im/newApi/doPreview',
}
const userStore = useUserStore()
const emit = defineEmits(['playVoice', 'open', 'insertMessage', 'openForwardModal'])
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
})

const isMe = (item) => {
  return item.msgFrom == userStore.userInfo.userid
}
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
</script>

<style lang="scss" scoped>
.chat-item {
  display: flex;
  flex-direction: column;
  padding: 20upx;
}
.chat-flat {
  display: flex;
  flex-direction: column;
  gap: 10upx;
}
.chat-meta {
  display: flex;
  align-items: center;
  gap: 12upx;
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
.chat-icon {
  width: 80upx;
  height: 80upx;
  border-radius: 8px;
  background-color: #eeeeee;
}
.chat-user-name {
  font-size: 26upx;
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
.chat-voice-container {
  background-color: #fff;
}
.chat-voice-container {
  display: flex;
  align-items: center;
  color: #fff;
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
</style>
