<template>
  <view class="reply-content-container">
    <view class="reply-left">
      <text class="chat-user-name">{{ reply.fromUserName }}：</text>
    </view>
    <view class="reply-main">
      <scroll-view scroll-y class="reply-scroll">
        <view class="reply-body">
          <!---文字-->
          <template v-if="['text'].includes(reply.msgType)">
            <rich-text :nodes="reply.msgData" class="reply-text"></rich-text>
          </template>
          <!--图片-->
          <template v-else-if="['image'].includes(reply.msgType)">
            <wd-img
              class="reply-image"
              :enable-preview="true"
              :radius="6"
              mode="widthFix"
              :src="getFileAccessHttpUrl(reply.msgData)"
            ></wd-img>
          </template>
          <!--语音-->
          <template v-else-if="['voice'].includes(reply.msgType)">
            <view
              :class="{
                'chat-voice-container': true,
                play: playMsgid == (uniqueId || reply.id),
              }"
              @click="handlePlayVoice"
            >
              <view class="length">{{ getVoiceLength(reply.msgData) }}</view>
              <view class="icon my-voice"></view>
            </view>
          </template>
          <!--文件-->
          <template v-else-if="['file'].includes(reply.msgType)">
            <view class="chat-file-name" @click="handleDownload(reply)">{{ reply.fileName }}</view>
          </template>
        </view>
      </scroll-view>
    </view>
    <view
      v-if="showClear"
      class="u-iconfont u-icon-close reply-close-btn"
      @click.stop="clearReply"
    ></view>
  </view>
</template>
<script setup lang="ts">
import { downloadFile, getFileAccessHttpUrl } from '@/common/uitls'
import { useUserStore } from '@/store'
import { http } from '@/utils/http'

const props = defineProps({
  replyContent: {
    type: Object,
    default: () => {},
  },
  referenceMsgId: {
    type: String,
    default: '',
  },
  playMsgid: {
    type: String,
    default: '',
  },
  // 父消息的唯一标识，用于播放状态匹配，避免相同引用id全部高亮
  uniqueId: {
    type: String,
    default: '',
  },
  showClear: {
    type: Boolean,
    default: false,
  },
})
const emit = defineEmits(['playVoice', 'clearReply'])
const userStore = useUserStore()
const reply = ref(props.replyContent)
console.log('reply.value', reply.value)
const initContent = () => {
  if (props.replyContent.id) {
    reply.value = props.replyContent
  } else {
    http
      .get('/eoa/im/newApi/getReferenceMsg', {
        refId: props.referenceMsgId,
      })
      .then((res: any) => {
        if (res.success) {
          reply.value = res.result || {}
        }
      })
  }
}
// 监听位置变化
watchEffect(() => {
  props.referenceMsgId && initContent()
})

// 播放语音时使用uniqueId作为标识，避免相同引用全部高亮
const handlePlayVoice = () => {
  const voiceItem = { ...reply.value, id: props.uniqueId || reply.value.id }
  emit('playVoice', voiceItem)
}
// 获取语音时长显示，兼容msgData为JSON字符串或对象的情况
const getVoiceLength = (msgData: any) => {
  let data = msgData
  // msgData可能是未解析的JSON字符串
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data)
    } catch (e) {
      return data
    }
  }
  if (data && data.length) {
    return data.length
  }
  return '00:00'
}
// 下载文件（兼容 fileId 与 filedId 拼写差异）
const handleDownload = (item) => {
  const fid = item.fileId || item.filedId || item.id
  const url =
    import.meta.env.VITE_SERVER_BASEURL +
    '/eoa/im/newApi/download?fileId=' +
    fid +
    '&token=' +
    userStore.userInfo.token
  downloadFile(url)
}
const clearReply = () => {
  emit('clearReply')
}
</script>
<style scoped lang="scss">
.reply-content-container {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  padding: 6px 8px 6px 10px;
  margin-top: 6px;
  background-color: #f0f4ff;
  border-radius: 8px;
  gap: 6px;
  /* 关键：不超出父容器宽度 */
  min-width: 0;
  overflow: hidden;
}

.reply-left {
  flex-shrink: 0;
}

.chat-user-name {
  font-size: 22upx;
  color: #55aaff;
  font-weight: 600;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.reply-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.reply-scroll {
  max-height: 80px;
}

.reply-body {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  min-width: 0;
}

/* Text reply */
.reply-text {
  font-size: 22upx;
  color: #888;
  line-height: 1.4;
  word-break: break-all;
}

/* Image in reply */
.reply-image {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
}

/* Voice bubble */
.chat-voice-container {
  display: flex;
  align-items: center;
  background: #e8f4ff;
  border-radius: 12px;
  padding: 4px 8px;
  cursor: pointer;
}
.chat-voice-container .length {
  font-size: 22upx;
  color: #55aaff;
  margin-right: 6px;
}
.chat-voice-container .icon {
  width: 14px;
  height: 14px;
  background-size: contain;
  background-repeat: no-repeat;
}
.chat-voice-container.play {
  background: #d0edff;
}

.chat-file-name {
  font-size: 22upx;
  color: #888;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reply-close-btn {
  flex-shrink: 0;
  color: #aaa;
  font-size: 14px;
  padding: 2px;
}
</style>
