<!-- z-paging聊天输入框 -->

<template>
  <view class="chat-input-bar-container">
    <view class="chat-input-bar">
      <!-- #ifndef H5 -->
      <view class="voice">
        <view class="icon" :class="isVoice ? 'jianpan' : 'yuyin'" @tap="switchVoice"></view>
      </view>
      <!-- #endif -->
      <view class="chat-input-container">
        <!-- 当处于语音模式时展示按住录音按钮，否则显示文本输入 -->
        <template v-if="!isVoice">
          <!-- :adjust-position="false"必须设置，防止键盘弹窗自动上顶，交由z-paging内部处理 -->
          <view class="voice-container">
            <input
              ref="inputRef"
              :focus="focus"
              class="chat-input"
              v-model="msg"
              :adjust-position="false"
              confirm-type="send"
              :confirm-hold="true"
              type="text"
              placeholder="请输入内容"
              @focus="handleFocus"
              @blur="handleBlur"
              @confirm="sendClick"
              @input="handleInputChange"
              @keydown="handleKeydown"
              @selectionchange="handleSelectionChange"
            />
            <ReplyContent
              v-if="replyObj.id"
              :replyContent="replyObj"
              showClear
              :playMsgid="playMsgid"
              @playVoice="playVoice"
              @clearReply="replyObj = {}"
            ></ReplyContent>
          </view>
        </template>
        <template v-else>
          <view
            class="record-btn"
            @touchstart="voiceBegin"
            @touchmove.stop.prevent="voiceIng"
            @touchend="voiceEnd"
            @touchcancel="voiceCancel"
          >
            <text class="voice-tip">{{ voiceTips }}</text>
          </view>
          <!-- H5 支持鼠标事件作为兼容（如需启用可添加 @mousedown/@mousemove/@mouseup） -->
        </template>
      </view>
      <template v-if="!isVoice">
        <!-- 表情图标（如果不需要切换表情面板则不用写） -->
        <view class="emoji-container">
          <image class="emoji-img" :src="getEmoji" @click="tooglePanl('emoji')"></image>
        </view>
        <view
          v-if="msg"
          class="chat-input-send"
          @touchstart.prevent="sendClick"
          @click.prevent="sendClick"
        >
          <text class="chat-input-send-text">发送</text>
        </view>
        <view v-else class="add-container" @click="tooglePanl('more')">
          <view class="icon add"></view>
        </view>
      </template>
    </view>
    <!--  表情面板，这里使用height控制隐藏显示是为了有高度变化的动画效果（如果不需要切换表情面板则不用写） -->
    <view
      class="emoji-panel-container"
      :style="[{ height: ['emoji', 'more'].includes(chatBarType) ? '320rpx' : '0px' }]"
    >
      <scroll-view scroll-y style="height: 100%; flex: 1">
        <template v-if="['emoji'].includes(chatBarType)">
          <!-- 表情 -->
          <view class="emoji-panel">
            <swiper class="emoji-swiper zdybq" :indicator-dots="true" :duration="150">
              <swiper-item class="swiperItem" v-for="(page, pid) in emojiArray" :key="pid">
                <view class="item" v-for="(em, eid) in page" :key="eid" @tap="emojiClick(em)">
                  <image mode="scaleToFill" :src="em.url" style="width: 28px; height: 28px"></image>
                </view>
              </swiper-item>
            </swiper>
          </view>
        </template>
        <template v-if="['more'].includes(chatBarType)">
          <!-- 相册、照相、文件 -->
          <view class="more-panel">
            <view
              class="box"
              v-if="['group', 'discussion'].includes(chatObj.type)"
              @tap="handleCallUser"
            >
              <view class="icon">@</view>
            </view>
            <view class="box" @tap="getImage('album')"><view class="icon tupian2"></view></view>
            <view class="box" @tap="getImage('camera')"><view class="icon paizhao"></view></view>
            <view class="box" @tap="handleFileUpload"><view class="cuIcon-file"></view></view>
            <view class="box" @tap="handleGoChatRecord">
              <view class="cuIcon-commentfill" style="font-size: 26px"></view>
            </view>
          </view>
        </template>
      </scroll-view>
    </view>

    <!-- 录音UI效果 -->
    <view class="record" :class="recording ? '' : 'hidden'">
      <view class="ing" :class="willStop ? 'hidden' : ''"><view class="icon luyin2"></view></view>
      <view class="cancel" :class="willStop ? '' : 'hidden'">
        <view class="icon chehui"></view>
      </view>
      <view class="tis" :class="willStop ? 'change' : ''">{{ recordTips }}</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { emojiList, getEmojiImageUrl } from '../emojis'
import { computed, ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import ReplyContent from '@/pages-message/chat/components/ReplyContent.vue'
defineOptions({
  name: 'chat-input-bar',
  options: {
    // apply-shared‌：当前页面样式会影响到子组件样式.(小程序)
    // shared‌：当前页面样式影响到子组件，子组件样式也会影响到当前页面.(小程序)
    styleIsolation: '‌apply-shared‌',
  },
})
const props = defineProps({
  // @选择的用户
  selectedUser: {
    type: [Array, String],
    default: () => [],
  },
  // @All
  mentionAll: {
    type: Boolean,
    default: false,
  },
  playMsgid: {
    type: String,
    default: '',
  },
  chatObj: {
    type: Object,
    default: () => {},
  },
})
// include 'send-voice' for explicit voice-send events; we still emit 'send' for backward compatibility
const emit = defineEmits([
  'emojiTypeChange',
  'send',
  'image',
  'file',
  'focus',
  'blur',
  'send-voice',
  'callUser',
  'chatRecord',
  'playVoice',
])
const emojiArray = getEmojiImageUrl()
const msg = ref('')
// 当前input focus
const focus = ref(false)
// 输入框ref
const inputRef = ref<HTMLInputElement | null>(null)
// 光标位置
const cursorPosition = ref(0)
// 选中的文本范围
const selectionStart = ref(0)
const selectionEnd = ref(0)
// emoji、more
const chatBarType = ref('')
// 回复内容
const replyObj = inject('replyObj')
//* ***************语音消息begin*********************
// #ifndef H5
const RECORDER = ref<any>()
// #endif
const isVoice = ref<boolean>(false)
const voiceTips = ref<string>('按住 说话')
const recordTips = ref<string>('手指上滑 取消发送')
const recording = ref<boolean>(false)
const willStop = ref<boolean>(false)
const initPoint = ref<{ identifier: number; Y: number }>({ identifier: 0, Y: 0 })
let recordTimer: ReturnType<typeof setInterval> | null = null
const recordLength = ref<number>(0) // seconds

// format seconds => mm:ss
const formatDuration = (sec: number) => {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  const mm = m < 10 ? '0' + m : '' + m
  const ss = s < 10 ? '0' + s : '' + s
  return `${mm}:${ss}`
}

// 初始化记录器（H5上不可用）
const initRecorder = () => {
  // #ifndef H5
  try {
    RECORDER.value = uni.getRecorderManager()
    RECORDER.value.onStart((e) => {
      recordBegin(e)
    })
    RECORDER.value.onStop((res) => {
      console.log('录音结束', res)
      recordEnd(res)
    })
    RECORDER.value.onError((err) => {
      console.error('录音错误', err)
      console.error('录音错误', JSON.stringify(err))
    })
  } catch (e) {
    console.error('initRecorder error', e)
  }
  // #endif
}

// Helper to safely prevent default only if event is cancelable
const safePrevent = (ev: any) => {
  try {
    if (ev && typeof ev.preventDefault === 'function' && ev.cancelable) ev.preventDefault()
  } catch (e) {
    // ignore non-cancelable or platform errors
  }
}
/**
 * 开始录音
 */
const voiceBegin = (e: any) => {
  if (e.touches.length > 1) {
    return
  }
  willStop.value = false
  initPoint.value.Y = e.touches[0].clientY
  initPoint.value.identifier = e.touches[0].identifier
  RECORDER.value.start({ format: 'mp3' }) // 录音开始,
}
// 录音开始UI效果
const recordBegin = (e: any) => {
  console.log('recordBegin', JSON.stringify(e))
  recording.value = true
  voiceTips.value = '松开 结束'
  recordLength.value = 0
  recordTimer = setInterval(() => {
    recordLength.value++
  }, 1000)
}
// 录音中(判断是否触发上滑取消发送)
const voiceIng = (e: any) => {
  if (!recording.value) {
    return
  }
  const touch = e.touches[0]
  const currentY = touch.clientY
  // 上滑超出阈值则取消发送
  try {
    if (initPoint.value.Y - currentY >= uni.upx2px(100)) {
      willStop.value = true
      recordTips.value = '松开手指 取消发送'
    } else {
      willStop.value = false
      recordTips.value = '手指上滑 取消发送'
    }
  } catch (err) {
    console.error('voiceIng error', err)
  }
}
// 结束录音
const voiceEnd = async (e?: any) => {
  if (!recording.value) {
    return
  }
  recording.value = false
  voiceTips.value = '按住 说话'
  recordTips.value = '手指上滑 取消发送'
  // #ifndef H5
  RECORDER.value.stop()
  // #endif
}
// 录音被打断
const voiceCancel = () => {
  recording.value = false
  voiceTips.value = '按住 说话'
  recordTips.value = '手指上滑 取消发送'
  willStop.value = true // 不发送录音
  RECORDER.value.stop() // 录音结束
}
// 录音结束(回调文件)
const recordEnd = async (e?: any) => {
  if (recordTimer) {
    clearInterval(recordTimer)
    recordTimer = null
  }
  if (!willStop.value) {
    const tempFilePaths = e.tempFilePath
    const msg = {
      length: formatDuration(recordLength.value),
      url: e.tempFilePath,
    }
    emit('send-voice', msg)
  }
  willStop.value = false
}

onLoad(() => {
  // #ifndef H5
  initRecorder()
  // #endif
})

//* ***************语音消息end*********************
const playVoice = (item) => {
  emit('playVoice', item)
}
//* ***************@消息begin*********************

watch(
  () => props.selectedUser,
  (newVal, oldVal) => {
    if (Array.isArray(newVal) && newVal.length > 0) {
      let atUsers = ''
      if (props.mentionAll) {
        // @所有人 只插入一次
        if (!msg.value.includes('@所有人')) {
          atUsers = `@所有人 `
        }
      } else {
        // 过滤掉已经在输入框中@过的用户，避免重复插入
        const newUsers = newVal.filter((item) => !msg.value.includes(`@${item.realname}`))
        if (newUsers.length > 0) {
          atUsers = newUsers.map((item) => `@${item.realname} `).join('')
        }
      }

      if (atUsers) {
        isInsertingMention = true
        let currentPos = cursorPosition.value
        let beforeCursor = msg.value.slice(0, currentPos)
        let afterCursor = msg.value.slice(currentPos)

        // 如果是输入@触发的弹窗，替换掉用户输入的@符号
        if (pendingAtPosition >= 0 && msg.value.charAt(pendingAtPosition) === '@') {
          beforeCursor = msg.value.slice(0, pendingAtPosition)
          afterCursor = msg.value.slice(pendingAtPosition + 1)
          currentPos = pendingAtPosition
        }
        pendingAtPosition = -1

        msg.value = beforeCursor + atUsers + afterCursor
        prevMsg = msg.value

        // Update cursor position to the end of the inserted @mention
        cursorPosition.value = currentPos + atUsers.length

        // Focus the input and set the cursor position after a short delay
        setTimeout(() => {
          if (inputRef.value) {
            inputRef.value?.focus()
            inputRef.value?.setSelectionRange(cursorPosition.value, cursorPosition.value)
          }
          isInsertingMention = false
        }, 100)
      }
    }
  },
  { deep: true },
)
// 提取文本中所有@mention（如 "@张三 " => {start:0, end:4, text:"@张三 "}）
const getAtMentions = (text: string) => {
  const mentions: { start: number; end: number; text: string }[] = []
  // 匹配 @非空白字符 后跟一个空格（或到末尾）
  const regex = /@[^\s@]+\s?/g
  let match
  while ((match = regex.exec(text)) !== null) {
    mentions.push({ start: match.index, end: match.index + match[0].length, text: match[0] })
  }
  return mentions
}

// 上一次的消息内容，用于检测删除操作
let prevMsg = ''
// 标记是否正在程序插入@mention，避免重复触发弹窗
let isInsertingMention = false
// 记录用户输入@触发弹窗时的@符号位置，选人后用于替换
let pendingAtPosition = -1

// 处理输入变化，更新光标位置 & 整体删除@mention
const handleInputChange = (e: any) => {
  const newMsg = msg.value
  const oldMsg = prevMsg

  // 检测是否为删除操作（新消息比旧消息短）
  if (newMsg.length < oldMsg.length) {
    // 获取旧消息中的@mention列表
    const oldMentions = getAtMentions(oldMsg)
    for (const mention of oldMentions) {
      // 如果某个@mention在新消息中被部分删除（不完整了），则整体删除它
      const mentionName = mention.text.trim() // 如 "@张三"
      if (oldMsg.includes(mentionName) && !newMsg.includes(mentionName)) {
        // 该@mention被部分删除，需要把残留部分也删掉
        // 找到残留的@或名字部分并清除
        const nameWithoutAt = mentionName.slice(1) // "张三"
        // 可能残留 "@"、"@张"、"张三" 等片段
        let cleaned = newMsg
        // 清除可能的残留片段：从最长到最短尝试匹配
        for (let len = nameWithoutAt.length; len >= 0; len--) {
          const partial = '@' + nameWithoutAt.slice(0, len)
          if (partial.length > 0 && cleaned.includes(partial)) {
            cleaned = cleaned.replace(partial, '')
            break
          }
        }
        // 如果没有@开头的残留，检查名字片段残留
        if (cleaned === newMsg) {
          for (let len = nameWithoutAt.length; len >= 1; len--) {
            const partial = nameWithoutAt.slice(0, len)
            if (cleaned.includes(partial) && !oldMsg.replace(mentionName, '').includes(partial)) {
              cleaned = cleaned.replace(partial, '')
              break
            }
          }
        }
        // 清除可能多出的连续空格
        cleaned = cleaned.replace(/  +/g, ' ')
        msg.value = cleaned
        break
      }
    }
  }

  // 检测用户是否刚输入了"@"字符，触发@选人弹窗（仅群聊/讨论组）
  if (
    !isInsertingMention &&
    ['group', 'discussion'].includes(props.chatObj?.type) &&
    newMsg.length > oldMsg.length
  ) {
    // 找到新增的字符位置
    const pos = inputRef.value?.selectionStart || newMsg.length
    const newChar = newMsg.charAt(pos - 1)
    if (newChar === '@') {
      // 判断@前面的字符：如果是字母、数字、点号等（邮箱前缀特征），则不触发
      const charBefore = pos >= 2 ? newMsg.charAt(pos - 2) : ''
      const isEmailLike = /[a-zA-Z0-9._\-]/.test(charBefore)
      if (!isEmailLike) {
        // 保留用户输入的@，记录位置，选人后替换；关闭弹窗则@原样保留
        prevMsg = msg.value
        pendingAtPosition = pos - 1
        cursorPosition.value = pos
        // 收起键盘，避免遮挡选人弹窗
        focus.value = false
        uni.hideKeyboard()
        emit('callUser')
        // 更新光标位置后返回，不再执行后续逻辑
        return
      }
    }
  }

  prevMsg = msg.value

  // 更新光标位置
  if (inputRef.value) {
    cursorPosition.value = inputRef.value.selectionStart || msg.value.length
    selectionStart.value = inputRef.value.selectionStart || 0
    selectionEnd.value = inputRef.value.selectionEnd || 0
  }
}
// Handle selection change
const handleSelectionChange = (e: any) => {
  if (inputRef.value) {
    selectionStart.value = inputRef.value.selectionStart || 0
    selectionEnd.value = inputRef.value.selectionEnd || 0
  }
}
// 处理键盘事件，实现整体删除@用户（H5端）
const handleKeydown = (e: any) => {
  if (e.key === 'Backspace') {
    const currentPos = cursorPosition.value
    if (currentPos > 0) {
      const mentions = getAtMentions(msg.value)
      for (const mention of mentions) {
        // 光标在@mention内部或尾部
        if (currentPos > mention.start && currentPos <= mention.end) {
          e.preventDefault()
          const beforeMention = msg.value.slice(0, mention.start)
          const afterMention = msg.value.slice(mention.end)
          msg.value = beforeMention + afterMention
          prevMsg = msg.value
          cursorPosition.value = mention.start
          setTimeout(() => {
            if (inputRef.value) {
              inputRef.value.setSelectionRange(mention.start, mention.start)
            }
          }, 10)
          return
        }
      }
    }
  }
}
// Method to manually insert @mention (can be called externally)
const insertAtMention = (user: { realname: string; id: string }) => {
  isInsertingMention = true
  const atText = `@${user.realname} `

  // Insert @mention at the current cursor position
  const currentPos = cursorPosition.value
  const beforeCursor = msg.value.slice(0, currentPos)
  const afterCursor = msg.value.slice(currentPos)
  msg.value = beforeCursor + atText + afterCursor
  prevMsg = msg.value

  // Update cursor position
  cursorPosition.value = currentPos + atText.length

  // Focus and set cursor position
  setTimeout(() => {
    if (inputRef.value) {
      inputRef.value.focus()
      inputRef.value.setSelectionRange(cursorPosition.value, cursorPosition.value)
    }
    isInsertingMention = false
  }, 100)
}
//* ***************@消息end*********************
const getEmoji = computed(() => {
  let img
  if (['', 'more'].includes(chatBarType.value)) {
    img = 'emoji'
  } else if (['emoji'].includes(chatBarType.value)) {
    img = 'keyboard'
  }
  return `/static/chat/${img}.png`
})

const updateKeyboardHeightChange = (res: any) => {
  if (res.height > 0) {
    chatBarType.value = ''
  }
}
const hidedKeyboard = () => {
  if (['emoji', 'more'].includes(chatBarType.value)) {
    chatBarType.value = ''
  }
}
// 点击了切换表情面板/键盘（如果不需要切换表情面板则不用写）
const tooglePanl = (val: string) => {
  if (chatBarType.value === val) {
    // 点击了键盘，展示键盘
    focus.value = true
    chatBarType.value = ''
  } else {
    // 点击了切换表情面板
    focus.value = false
    // 隐藏键盘
    uni.hideKeyboard()
    chatBarType.value = val
  }
}
// 点击了某个表情，将其插入输入内容中（如果不需要切换表情面板则不用写）
const emojiClick = (em: any) => {
  msg.value += em.alt
  prevMsg = msg.value
}

// update-begin--author:liaozhiyang---date:20260813---for：【LHZP-1642】聊天只发表情不聚焦
// 消息去掉所有已定义的表情标记后为空，才属于纯表情消息
const isEmojiOnlyMessage = (content: string) => {
  let remainingContent = content.trim()
  let hasEmoji = false
  Object.keys(emojiList.emojis).forEach((emoji) => {
    if (remainingContent.includes(emoji)) {
      hasEmoji = true
      remainingContent = remainingContent.split(emoji).join('')
    }
  })
  return hasEmoji && remainingContent.trim().length === 0
}

// 标记是否正在发送，防止发送时blur导致键盘收起
let isSending = false
// 点击了发送按钮
const sendClick = () => {
  if (!msg.value.length) return
  const shouldBlurAfterSend = isEmojiOnlyMessage(msg.value)
  isSending = true
  emit('send', msg.value)
  msg.value = ''
  prevMsg = ''
  // 纯表情发送后失焦，包含文字的消息发送后保持聚焦
  nextTick(() => {
    if (shouldBlurAfterSend) {
      focus.value = false
      inputRef.value?.blur?.()
    } else {
      focus.value = true
    }
    setTimeout(() => {
      isSending = false
    }, 150)
  })
}
// update-end--author:liaozhiyang---date:20260813---for：【LHZP-1642】聊天只发表情不聚焦
// 点击了发送按钮
const getImage = (type: string) => {
  emit('image', type)
}

// 文件上传
const handleFileUpload = () => {
  emit('file')
}

const handleFocus = (event: any) => {
  emit('focus', event.detail.height)
}

const handleBlur = () => {
  // 发送消息时不处理blur，避免键盘收起
  if (isSending) return
  focus.value = false
  emit('blur', 0)
}

const handleCallUser = () => {
  // 通过更多面板点@按钮时，清除输入@的位置记录
  pendingAtPosition = -1
  emit('callUser')
}
const handleGoChatRecord = () => {
  emit('chatRecord')
}
// add switchVoice function (was referenced from template and defineExpose)
function switchVoice(): void {
  hidedKeyboard()
  isVoice.value = !isVoice.value
}

const focusInput = () => {
  focus.value = true
}

defineExpose({
  updateKeyboardHeightChange,
  hidedKeyboard,
  voiceIng,
  voiceEnd,
  voiceCancel,
  switchVoice,
  focusInput,
})
</script>

<style lang="scss" scoped>
.chat-input-bar {
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  border-top: solid 1px #f5f5f5;
  background-color: #f8f8f8;
  padding: 10rpx 20rpx;
}
.add-container {
  flex-shrink: 0;
  align-self: center;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 54rpx;
  height: 54rpx;
  margin-left: 20rpx;
  .icon {
    font-size: 45rpx;
    width: 54rpx;
    height: 54rpx;
    line-height: 54rpx;
  }
}
.chat-input-container {
  flex: 1;
  min-width: 0;
  /* #ifndef APP-NVUE */
  display: flex;
  /* #endif */
  padding: 15rpx;
  background-color: white;
  border-radius: 10rpx;
}
.voice-container {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.chat-input {
  flex: 1;
  font-size: 28rpx;
}
.emoji-container {
  width: 54rpx;
  height: 54rpx;
  margin-left: 20rpx;
  align-self: center;
  display: flex;
  align-items: center;
  justify-content: center;
}
.emoji-img {
  width: 54rpx;
  height: 54rpx;
}
.chat-input-send {
  background-color: #007aff;
  margin-left: 20rpx;
  border-radius: 10rpx;
  width: 110rpx;
  height: 60rpx;
  /* #ifndef APP-NVUE */
  display: flex;
  /* #endif */
  justify-content: center;
  align-items: center;
  align-self: center;
  flex-shrink: 0;
}
.chat-input-send-text {
  color: white;
  font-size: 26rpx;
}
.emoji-panel-container {
  border-top: 1px solid #e8e8e8;
  background-color: #f8f8f8;
  overflow: hidden;
  transition-property: height;
  transition-duration: 0.15s;
}
.emoji-panel {
  height: 100%;
  padding: 0 8vw;
  .swiperItem {
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    .item {
      width: 12vw;
      height: 12vw;
      display: flex;
      justify-content: center;
      align-items: center;
    }
  }
}
.more-panel {
  display: flex;
  padding-top: 3vw;
  .box {
    width: 18vw;
    height: 18vw;
    border-radius: 10px;
    background-color: #fff;
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 0 3vw 2vw 3vw;
    .icon {
      font-size: 30px;
    }
    .cuIcon-file {
      font-size: 30px;
      color: #333;
    }
  }
}
.record-btn {
  flex: 1;
  height: 50rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: #fff;
  position: relative;
}
.voice-tip {
  font-size: 28rpx;
  color: #666;
}
.record-tip {
  font-size: 20rpx;
  color: #999;
}
.voice {
  align-self: center;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 54rpx;
  height: 54rpx;
  flex-shrink: 0;
  .icon {
    font-size: 45rpx;
    width: 54rpx;
    height: 54rpx;
    line-height: 54rpx;
  }
}
.record-btn-h5 {
  flex: 1;
  height: 60rpx;
  margin: 10rpx 20rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: #f1f1f1;
  border-radius: 10rpx;
  position: relative;
}

/* Recording HUD styles */
.record-hud {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.7);
  z-index: 9999;
}
.record-hud-box {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
.hud-circle {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  border: 8px solid rgba(255, 255, 255, 0.8);
  margin-bottom: 10rpx;
}
.hud-timer {
  font-size: 28rpx;
  color: white;
  margin-bottom: 5rpx;
}
.hud-tip {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.9);
}

/* Warning styles for ending soon state */
.hud-circle-soon {
  animation: pulse 1s infinite;
  border-color: #ff3b30;
}
.hud-timer-soon {
  color: #ff3b30;
}
.hud-tip-soon {
  color: #ff3b30;
}

/* Pulse animation */
@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

/* Recording HUD waveform styles */
.wave-container {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  height: 80rpx;
  margin-bottom: 10rpx;
}
.wave-bar {
  width: 10px;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.8);
  margin: 0 2px;
  border-radius: 2px;
  animation: wave-animation 1.2s infinite;
}
.wave-soon .wave-bar {
  background-color: #ff3b30;
}

/* Wave animation */
@keyframes wave-animation {
  0% {
    transform: scaleY(0.8);
  }
  50% {
    transform: scaleY(1.2);
  }
  100% {
    transform: scaleY(0.8);
  }
}

/* Countdown styles */
.hud-countdown {
  font-size: 48rpx;
  color: #ff3b30;
  margin-bottom: 5rpx;
}
.hud-countdown-soon {
  animation: countdown-pulse 1s infinite;
}

/* Countdown pulse animation */
@keyframes countdown-pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

.record {
  width: 40vw;
  height: 40vw;
  position: fixed;
  top: 55%;
  left: 30%;
  background-color: rgba(0, 0, 0, 0.6);
  border-radius: 20upx;
  .ing {
    width: 100%;
    height: 30vw;
    display: flex;
    justify-content: center;
    align-items: center;
    // 模拟录音音效动画
    @keyframes volatility {
      0% {
        background-position: 0% 130%;
      }
      20% {
        background-position: 0% 150%;
      }
      30% {
        background-position: 0% 155%;
      }
      40% {
        background-position: 0% 150%;
      }
      50% {
        background-position: 0% 145%;
      }
      70% {
        background-position: 0% 150%;
      }
      80% {
        background-position: 0% 155%;
      }
      90% {
        background-position: 0% 140%;
      }
      100% {
        background-position: 0% 135%;
      }
    }
    .icon {
      background-image: linear-gradient(to bottom, #f09b37, #fff 50%);
      background-size: 100% 200%;
      animation: volatility 1.5s ease-in-out -1.5s infinite alternate;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      font-size: 150upx;
      color: #f09b37;
    }
  }
  .cancel {
    width: 100%;
    height: 30vw;
    display: flex;
    justify-content: center;
    align-items: center;
    .icon {
      color: #fff;
      font-size: 150upx;
    }
  }
  .tis {
    width: 100%;
    height: 10vw;
    display: flex;
    justify-content: center;
    font-size: 28upx;
    color: #fff;
    &.change {
      color: #f09b37;
    }
  }
}
</style>
