<template>
  <wd-popup position="bottom" v-model="show" :close-on-click-modal="!showRemarkDialog">
    <PageLayout
      :navTitle="modalTitle"
      type="popup"
      navRightText="确定"
      @navRight="handleConfirm"
      @navBack="handleCancel"
    >
      <view class="wrap">
        <z-paging
          ref="paging"
          :fixed="false"
          v-model="dataList"
          @query="queryList"
          :default-page-size="15"
        >
          <template #top>
            <view class="search-wrap">
              <wd-search
                hide-cancel
                :placeholder="search.placeholder"
                v-model="search.keyword"
                @search="handleSearch"
                @clear="handleClear"
              />
            </view>
          </template>
          <wd-checkbox-group shape="square" v-model="checkedValue">
            <view class="chat-list">
              <template v-for="(item, index) in dataList" :key="index">
                <view
                  :class="{ 'chat-item': true, 'solid-top': true, 'is-top': item.izTop == 1 }"
                  @click="handleCheck(index, item[rowKey])"
                >
                  <!-- 头像区域 -->
                  <view class="avatar-container">
                    <template
                      v-if="['group', 'discussion'].includes(item.type) && !item.fromAvatar"
                    >
                      <view class="avatar group-avatar">
                        <text class="text-white">{{ getFirstStr(item.fromUserName) }}</text>
                      </view>
                    </template>
                    <template v-else>
                      <image
                        v-if="getAvatar(item.fromAvatar)"
                        :src="getAvatar(item.fromAvatar)"
                        class="avatar user-avatar"
                        mode="aspectFill"
                      />
                      <view v-else class="avatar user-avatar">
                        <text class="text-white">{{ getFirstStr(item.fromUserName) }}</text>
                      </view>
                    </template>
                  </view>
                  <!-- 内容区域 -->
                  <view class="content">
                    <view class="content-header">
                      <text class="title">{{ item.fromUserName }}</text>
                      <!--                      <text class="time">{{ beautifyTime(item.sendTime) }}</text>-->
                    </view>
                    <view class="content-body">
                      <text class="note">{{ getChatType(item) }}</text>
                      <view class="checkbox-wrap" @click.stop>
                        <wd-checkbox ref="checkboxRef" :modelValue="item[rowKey]"></wd-checkbox>
                      </view>
                    </view>
                  </view>
                </view>
              </template>
            </view>
          </wd-checkbox-group>
        </z-paging>
      </view>
    </PageLayout>
  </wd-popup>

  <!-- 补充留言弹窗 -->
  <view v-if="showRemarkDialog" class="remark-mask" @click.self="showRemarkDialog = false">
    <view class="remark-dialog" @click.stop>
      <text class="remark-title">补充留言</text>
      <view class="remark-dialog-body">
        <textarea
          v-model="remarkMsg"
          class="remark-textarea"
          placeholder="可输入补充留言（选填）"
          maxlength="200"
          auto-height
        />
        <text class="remark-count">{{ remarkMsg.length }}/200</text>
      </view>
      <view class="remark-footer">
        <text class="remark-btn remark-btn-cancel" @click="showRemarkDialog = false">取消</text>
        <view class="remark-divider"></view>
        <text class="remark-btn remark-btn-confirm" @click="doSubmit">确认转发</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, nextTick } from 'vue'
import { useToast, useMessage, useNotify, dayjs } from 'wot-design-uni'
import { http } from '@/utils/http'
import { beautifyTime, cache, getFileAccessHttpUrl } from '@/common/uitls'
import { useUserStore } from '@/store/user'
import defaultAvatar from '@/static/default-avatar.png'
defineOptions({
  name: 'SelectChatMsgModal',
  options: {
    styleIsolation: 'shared',
  },
})
const props = defineProps({
  multi: {
    type: Boolean,
    default: true,
  },
  modalTitle: {
    type: String,
    default: '选择转发对象',
  },
  rowKey: {
    type: String,
    default: 'id',
  },
  chatListUrl: {
    type: String,
    default: '/eoa/im/newApi/getChatList',
  },
  msgId: {
    type: String,
    default: '',
  },
})
const emit = defineEmits(['change', 'close'])
const forwardMsg = inject('forwardMsg')
const toast = useToast()
const userStore = useUserStore()
// 留言弹窗
const showRemarkDialog = ref(false)
const remarkMsg = ref('')
// 缓存待提交的 receiveIds，等留言确认后使用
const pendingReceiveIds = ref<string[]>([])
const pendingReceiveChatObj = ref<any[]>([])
const show = ref(true)
const api = {
  chatListUrl: props.chatListUrl,
}
const paging = ref(null)
const dataList = ref([])
const checkedValue: any = ref([])
const checkboxRef = ref(null)
const search = reactive({
  keyword: '',
  placeholder: '输入姓名可搜索',
  field: 'realname',
})
const getFirstStr = (val) => {
  return val ? val.substr(0, 1) : val
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
      return item.status == 'online' ? '[在线]' : '[离线]'
    case 'group':
      return '[群消息]'
    default:
      return ''
  }
}
/**
 * 转发消息
 * @param receiveIds
 * @param remark 补充留言
 */
const sendMsg = async (receiveIds: string[], remark: string) => {
  if (remark) {
    for (const id of receiveIds) {
      const find = pendingReceiveChatObj.value.find((item) => item.msgTo === id)
      if (find) {
        const params = {
          type: find.type,
          msgTo: id,
          text: remark,
          msgType: 'text',
        }
        const res: any = await http.post('/eoa/im/newApi/sendMessage', params)
        console.log('消息发送结果：', res)
        if (!res.success) {
          toast.error(res.message)
        }
      }
    }
  }
  if (receiveIds && receiveIds.length > 0) {
    const params: any = {
      messageId: forwardMsg.value.id,
      receiveIds: receiveIds.join(','),
    }
    const forwardRes: any = await http.post('/eoa/im/newApi/forward', params)
    if (!forwardRes.success) {
      toast.error(forwardRes.message)
    } else {
      toast.success(forwardRes.message)
    }
  }
}

const handleClose = () => {
  setTimeout(() => {
    pendingReceiveIds.value = []
    pendingReceiveChatObj.value = []
    emit('close')
  }, 400)
}
// 第一步：校验选择，弹出留言框
const handleConfirm = () => {
  if (checkedValue.value.length === 0) {
    toast.warning('还没选择转发对象~')
    return
  }
  const receiveIds: string[] = []
  const receiveChatObj: string[] = []
  checkedValue.value.forEach((id) => {
    const chatObj = dataList.value.find((data) => data[props.rowKey] === id)
    if (chatObj) {
      receiveIds.push(chatObj.msgTo)
      receiveChatObj.push(chatObj)
    }
  })
  pendingReceiveIds.value = receiveIds
  pendingReceiveChatObj.value = receiveChatObj
  remarkMsg.value = ''
  showRemarkDialog.value = true
}
// 第二步：留言确认后真正提交
const doSubmit = () => {
  showRemarkDialog.value = false
  sendMsg(pendingReceiveIds.value, remarkMsg.value)
  show.value = false
  handleClose()
}
const handleCancel = () => {
  show.value = false
  handleClose()
  console.log('取消了~')
}

const handleCheck = (index: number, id: string) => {
  if (props.multi) {
    const refs = checkboxRef.value
    if (Array.isArray(refs) && refs[index]) {
      refs[index].toggle()
    }
  } else {
    checkedValue.value = checkedValue.value === id ? '' : id
  }
}

// 搜索
function handleSearch() {
  paging.value.reload()
}
// 清除搜索条件
function handleClear() {
  search.keyword = ''
  handleSearch()
}
// 获取头像
const getAvatar = (url) => {
  const result = getFileAccessHttpUrl(url)
  if (result.length) {
    return result
  } else {
    return defaultAvatar
  }
}
// 排除当前登录人（如与自己的会话）
const filterCurrentUser = (records) => {
  const currentUserId = userStore.userInfo.userid
  if (!currentUserId) return records
  return records.filter((item) => item.msgTo !== currentUserId)
}

// 获取列表
const queryList = (pageNo, pageSize) => {
  const pararms = { pageNo, pageSize, column: 'sort', order: 'asc' }
  if (search.keyword) {
    pararms[search.field] = `*${search.keyword}*`
  }
  http
    .get(`${api.chatListUrl}`, pararms)
    .then((res: any) => {
      if (res.success && res.result.logVoList) {
        let records = res.result.logVoList.filter((item) => ['group', 'friend'].includes(item.type))
        if (records && records.length > 0) {
          records = records.filter((item) => item.id !== props.msgId)
        }
        records = filterCurrentUser(records)
        paging.value.complete(records ?? [])
      } else {
        paging.value.complete(false)
      }
    })
    .catch((err) => {})
}

const init = () => {
  dataList.value = []
}
init()
</script>

<style lang="scss" scoped>
.search-wrap {
  display: flex;
  align-items: center;
  background-color: #fff;
  padding-left: 10px;
  :deep(.wd-search) {
    flex: 1;
  }
}

.wrap {
  height: 100%;
}
:deep(.wd-popup-wrapper) {
  .wd-popup {
    top: 100px;
  }
}
.chat-list {
  background-color: #fff;
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

/* 留言弹窗 */
.remark-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}
.remark-dialog {
  width: 80vw;
  background: #fff;
  border-radius: 14px;
  overflow: hidden;
}
.remark-title {
  display: block;
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  padding: 18px 16px 0;
}
.remark-dialog-body {
  padding: 14px 16px 4px;
}
.remark-textarea {
  width: 100%;
  min-height: 80px;
  font-size: 14px;
  color: #333;
  background-color: #f7f8fa;
  border-radius: 8px;
  padding: 10px;
  box-sizing: border-box;
  line-height: 1.5;
}
.remark-count {
  display: block;
  text-align: right;
  font-size: 12px;
  color: #bbb;
  margin-top: 4px;
}
.remark-footer {
  display: flex;
  flex-direction: row;
  align-items: center;
  border-top: 1px solid #eee;
  margin-top: 12px;
}
.remark-btn {
  flex: 1;
  text-align: center;
  padding: 14px 0;
  font-size: 15px;
}
.remark-btn-cancel {
  color: #999;
}
.remark-btn-confirm {
  color: #007aff;
  font-weight: 500;
}
.remark-divider {
  width: 1px;
  height: 20px;
  background: #eee;
}
</style>
