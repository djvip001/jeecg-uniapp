<template>
  <wd-popup position="bottom" v-model="show">
    <PageLayout navTitle="回复详情" type="popup" @navBack="handleCancel">
      <view class="wrap">
        <view class="reply-detail">
          <!-- 原始引用消息 -->
          <view class="origin-msg">
            <view class="origin-msg-header">
              <view class="chat-icon-container">
                <image
                  class="chat-icon"
                  :src="getFileAccessHttpUrl(originMsg.fromAvatar)"
                  mode="aspectFill"
                />
              </view>
              <view class="origin-info">
                <text class="origin-name">{{ originMsg.fromUserName }}</text>
                <text class="origin-time">{{ originMsg.sendTime?.substring(0, 19) }}</text>
              </view>
            </view>
            <view class="origin-msg-body">
              <!---文字-->
              <template v-if="['text'].includes(originMsg.msgType)">
                <view class="chat-text-container">
                  <view class="chat-text">
                    <rich-text :nodes="originMsg.msgData"></rich-text>
                  </view>
                </view>
              </template>
              <!--图片-->
              <template v-else-if="['image'].includes(originMsg.msgType)">
                <wd-img
                  width="200"
                  height="200"
                  :enable-preview="true"
                  :radius="10"
                  mode="widthFix"
                  :src="getFileAccessHttpUrl(originMsg.msgData)"
                ></wd-img>
              </template>
              <!--语音-->
              <template v-else-if="['voice'].includes(originMsg.msgType)">
                <view class="chat-voice-container" @click="playVoice(originMsg)">
                  <view class="length mr-2">{{ originMsg.msgData.length }}</view>
                  <view class="icon my-voice"></view>
                </view>
              </template>
              <!--文件-->
              <template v-else-if="['file'].includes(originMsg.msgType)">
                <view class="chat-file-container">
                  <view class="chat-file-content">
                    <view class="chat-file-icon">
                      <text class="chat-file-type">{{ getFileTypeText(originMsg.fileType) }}</text>
                    </view>
                    <view class="chat-file-info">
                      <view class="chat-file-name">{{ originMsg.fileName }}</view>
                      <view class="chat-file-size">({{ formatFileSize(originMsg.fileSize) }})</view>
                    </view>
                  </view>
                </view>
              </template>
            </view>
          </view>

          <!-- 回复列表 -->
          <view class="reply-list-container">
            <scroll-view
              scroll-y
              class="reply-scroll"
              :scroll-into-view="scrollToId"
              scroll-with-animation
              v-if="!loading"
            >
              <view class="reply-list">
                <view v-if="replyList.length === 0 && !loading" class="empty-tip">暂无回复</view>
                <view
                  v-for="(item, index) in replyList"
                  :key="item.id || index"
                  :id="'reply-' + index"
                  class="reply-item"
                >
                  <view class="chat-icon-container reply-icon-container">
                    <image
                      class="chat-icon reply-icon"
                      :src="getFileAccessHttpUrl(item.fromAvatar)"
                      mode="aspectFill"
                    />
                  </view>
                  <view class="reply-content">
                    <view class="reply-header">
                      <text class="reply-name">{{ item.fromUserName }}</text>
                      <text class="reply-time">{{ item.sendTime?.substring(0, 19) }}</text>
                    </view>
                    <view class="reply-body">
                      <!---文字-->
                      <template v-if="['text'].includes(item.msgType)">
                        <view class="chat-text-container">
                          <view class="chat-text">
                            <rich-text :nodes="item.msgData"></rich-text>
                          </view>
                        </view>
                      </template>
                      <!--图片-->
                      <template v-else-if="['image'].includes(item.msgType)">
                        <wd-img
                          width="150"
                          height="150"
                          :enable-preview="true"
                          :radius="10"
                          mode="widthFix"
                          :src="getFileAccessHttpUrl(item.msgData)"
                        ></wd-img>
                      </template>
                      <!--语音-->
                      <template v-else-if="['voice'].includes(item.msgType)">
                        <view class="chat-voice-container" @click="playVoice(item)">
                          <view class="length mr-2">{{ item.msgData.length }}</view>
                          <view class="icon my-voice"></view>
                        </view>
                      </template>
                      <!--文件-->
                      <template v-else-if="['file'].includes(item.msgType)">
                        <view class="chat-file-container">
                          <view class="chat-file-content">
                            <view class="chat-file-icon">
                              <text class="chat-file-type">
                                {{ getFileTypeText(item.fileType) }}
                              </text>
                            </view>
                            <view class="chat-file-info">
                              <view class="chat-file-name">{{ item.fileName }}</view>
                              <view class="chat-file-size">
                                ({{ formatFileSize(item.fileSize) }})
                              </view>
                            </view>
                          </view>
                        </view>
                      </template>
                    </view>
                  </view>
                </view>
              </view>
            </scroll-view>
          </view>

          <!-- 底部输入框 -->
          <view
            class="input-bar"
            :style="{ paddingBottom: keyboardHeight > 0 ? keyboardHeight + 'px' : '' }"
          >
            <input
              class="input-field"
              v-model="inputText"
              placeholder="输入回复内容..."
              confirm-type="send"
              :confirm-hold="true"
              :adjust-position="false"
              @confirm="handleSend"
              @focus="onInputFocus"
              @blur="onInputBlur"
            />
            <view class="send-btn" :class="{ active: inputText.trim() }" @click="handleSend">
              <text class="send-text">发送</text>
            </view>
          </view>
        </view>
      </view>
    </PageLayout>
  </wd-popup>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import { getFileAccessHttpUrl } from '@/common/uitls'
import { http } from '@/utils/http'
import { useUserStore } from '@/store/user'
import { textReplaceEmoji } from '@/pages-message/chat/emojis'

defineOptions({
  name: 'ReplyDetailModal',
  options: {
    styleIsolation: 'shared',
  },
})

const emit = defineEmits(['close', 'replied', 'playVoice'])
const show = ref(true)
const loading = ref(false)
const keyboardHeight = ref(0)

const onInputFocus = (e: any) => {
  keyboardHeight.value = e.detail?.height || 0
}
const onInputBlur = () => {
  keyboardHeight.value = 0
}

// 监听键盘高度变化，实时更新（H5端不支持此API）
const onKbHeightChange = (res: any) => {
  keyboardHeight.value = res.height || 0
}
// #ifndef H5
uni.onKeyboardHeightChange(onKbHeightChange)
// #endif
onBeforeUnmount(() => {
  // #ifndef H5
  // @ts-ignore
  uni.offKeyboardHeightChange(onKbHeightChange)
  // #endif
})
const originMsg = ref<any>({})
const replyList = ref<any[]>([])
const inputText = ref('')
const scrollToId = ref('')
const userStore = useUserStore()
let chatObjData: any = null
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

const replaceEmoji = (str: string) => {
  const temp = textReplaceEmoji(str)
  return '<div style="display:inline-block">' + temp + '</div>'
}

const open = (item: any, chatObj: any) => {
  originMsg.value = item
  chatObjData = chatObj
  show.value = true
  loadReplyList(item.id)
}

const loadReplyList = (refId: string) => {
  loading.value = true
  http
    .get('/eoa/im/newApi/getReferenceList', { refId })
    .then((res: any) => {
      if (res.success) {
        const list = (res.result || []).map((item: any) => {
          if (item.msgType === 'text') {
            item.msgData = replaceEmoji(item.msgData)
          }
          return item
        })
        // 按发送时间正序排列（旧消息在前，新消息在后）
        replyList.value = list.sort(
          (a, b) => new Date(a.sendTime).getTime() - new Date(b.sendTime).getTime(),
        )
        // 滚动到底部
        if (list.length > 0) {
          scrollToId.value = ''
          setTimeout(() => {
            scrollToId.value = 'reply-' + (list.length - 1)
          }, 100)
        }
      }
    })
    .finally(() => {
      loading.value = false
    })
}

const handleSend = () => {
  const text = inputText.value.trim()
  if (!text) return
  const params = {
    type: chatObjData.type,
    msgTo: chatObjData.msgTo,
    text,
    msgType: 'text',
    refId: originMsg.value.id,
  }
  http.post('/eoa/im/newApi/sendMessage', params).then((res: any) => {
    if (res.success) {
      inputText.value = ''
      // 重新加载回复列表
      loadReplyList(originMsg.value.id)
      emit('replied')
    } else {
      uni.showToast({ title: res.message || '发送失败', icon: 'none' })
    }
  })
}

const handleCancel = () => {
  show.value = false
  emit('close')
}

defineExpose({
  open,
})
</script>

<style scoped lang="scss">
.wrap {
  height: 100vh;
  background-color: #f5f6fa;
  display: flex;
  flex-direction: column;
}
.reply-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* 头像 - 与 chat-item 一致 */
.chat-icon-container {
  margin-top: 2px;
  flex-shrink: 0;
}
.chat-icon {
  width: 80upx;
  height: 80upx;
  border-radius: 8px;
  background-color: #eeeeee;
}

/* 原始消息 */
.origin-msg {
  background: #fff;
  margin: 12px 16px 0;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
}
.origin-msg-header {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}
.origin-info {
  margin-left: 15upx;
  display: flex;
  flex-direction: column;
}
.origin-name {
  font-size: 15px;
  color: #333;
  font-weight: 600;
}
.origin-time {
  font-size: 22upx;
  color: #999;
  margin-top: 4upx;
}
.origin-msg-body {
  margin-top: 10upx;
}

/* 文字容器 - 与 chat-item 一致 */
.chat-text-container {
  text-align: left;
  background-color: #fff;
  border-radius: 8upx;
  padding: 7px 10px;
  max-width: 500upx;
}
.chat-text {
  font-size: 28upx;
  word-break: break-all;
}

/* 语音容器 - 与 chat-item 一致 */
.chat-voice-container {
  display: flex;
  align-items: center;
  background-color: #55aaff;
  border-radius: 8upx;
  padding: 7px 10px;
  color: #fff;
}

/* 文件容器 - 与 chat-item 一致 */
.chat-file-container {
  background-color: #fff;
  border-radius: 8upx;
  padding: 20upx;
  margin-top: 10upx;
}
.chat-file-content {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
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
}

/* 回复列表 */
.reply-list-container {
  flex: 1;
  overflow: hidden;
  margin: 12px 16px 0;
}
.reply-scroll {
  height: 100%;
}
.reply-list {
  background: #fff;
  border-radius: 12px;
  padding: 8px 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}
.empty-tip {
  text-align: center;
  color: #999;
  font-size: 14px;
  padding: 40px 0;
}
.reply-item {
  display: flex;
  padding: 12px 0;
  border-bottom: 1px solid #f5f5f5;
}
.reply-item:last-child {
  border-bottom: none;
}
.reply-icon-container {
  margin-top: 0;
}
.reply-icon {
  width: 70upx;
  height: 70upx;
}
.reply-content {
  flex: 1;
  margin-left: 15upx;
  min-width: 0;
}
.reply-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.reply-name {
  font-size: 26upx;
  color: #888;
  font-weight: 600;
}
.reply-time {
  font-size: 22upx;
  color: #bbb;
}
.reply-body {
  margin-top: 6upx;
}

/* 底部输入框 */
.input-bar {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  background: #fff;
  border-top: 1px solid #f0f0f0;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.04);
  flex-shrink: 0;
  gap: 10px;
}
.input-field {
  flex: 1;
  height: 36px;
  background: #f5f6fa;
  border-radius: 18px;
  padding: 0 16px;
  font-size: 14px;
  color: #333;
}
.send-btn {
  width: 60px;
  height: 36px;
  background: #ccc;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.send-btn.active {
  background: #007aff;
}
.send-text {
  color: #fff;
  font-size: 14px;
  font-weight: 600;
}
</style>
