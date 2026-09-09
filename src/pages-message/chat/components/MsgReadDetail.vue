<template>
  <wd-popup position="bottom" v-model="show">
    <PageLayout :navTitle="modalTitle" type="popup" @navBack="handleCancel">
      <view class="wrap">
        <view class="chat-unread-detail">
          <view class="tabs">
            <view
              class="tab"
              :class="{ active: activeTab === 'unread' }"
              @click="activeTab = 'unread'"
            >
              未读
            </view>
            <view class="tab" :class="{ active: activeTab === 'read' }" @click="activeTab = 'read'">
              已读
            </view>
          </view>
          <view class="scroll-container">
            <scroll-view scroll-y class="tab-content">
              <view v-if="activeTab === 'unread'" class="person-list">
                <view
                  v-for="person in unreadList"
                  :key="person.id"
                  class="person-item"
                  :class="{ selected: person.selected }"
                  @click="toggleSelect(person, 'unread')"
                >
                  <view class="avatar-container">
                    <wd-img
                      v-if="getAvatar(person.avatar)"
                      radius="50%"
                      width="40px"
                      height="40px"
                      :src="getAvatar(person.avatar)"
                    ></wd-img>
                    <view class="checkmark" v-if="person.selected">✓</view>
                  </view>
                  <view class="name">{{ person.realname }}</view>
                </view>
              </view>
              <view v-else class="person-list">
                <view
                  v-for="person in readList"
                  :key="person.id"
                  class="person-item"
                  :class="{ selected: person.selected }"
                  @click="toggleSelect(person, 'read')"
                >
                  <view class="avatar-container">
                    <wd-img
                      v-if="getAvatar(person.avatar)"
                      radius="50%"
                      width="40px"
                      height="40px"
                      :src="getAvatar(person.avatar)"
                    ></wd-img>
                    <view class="checkmark" v-if="person.selected">✓</view>
                  </view>
                  <view class="name">{{ person.realname }}</view>
                </view>
              </view>
            </scroll-view>
          </view>
          <view class="actions">
            <wd-button type="primary" :disabled="!isApp" @click="sendSmsReminder">
              短信提醒
            </wd-button>
            <wd-button type="primary" :disabled="!isApp" @click="makePhoneCall">电话提醒</wd-button>
          </view>
        </view>
      </view>
    </PageLayout>
  </wd-popup>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { cache, getFileAccessHttpUrl } from '@/common/uitls'
import defaultAvatar from '@/static/default-avatar.png'
import { http } from '@/utils/http'
import { isApp } from '@/utils/platform'
defineOptions({
  name: 'MsgReadDetail',
  options: {
    styleIsolation: 'shared',
  },
})
const props = defineProps({
  modalTitle: {
    type: String,
    default: '阅读状态',
  },
})
const emit = defineEmits(['change', 'close'])
const show = ref(true)
const activeTab = ref('unread')
const unreadList = ref([])
const readList = ref([])

// 单选：点同一人取消，点其他人切换
const toggleSelect = (person: any, listType: string) => {
  // const list = listType === 'unread' ? unreadList.value : readList.value
  const allPersons = [...unreadList.value, ...readList.value]
  allPersons.forEach((p: any) => {
    p.selected = p.id === person.id ? !p.selected : false
  })
}

// 获取选中的人员（单选，最多1人）
const getSelectedPersons = () => {
  const allPersons = [...unreadList.value, ...readList.value]
  return allPersons.filter((person: any) => person.selected)
}

const open = (item) => {
  getUserInfo(item)
}
const getUserInfo = (item) => {
  http
    .get('/eoa/im/newApi/getMsgReadInfo', {
      msgId: item.id,
    })
    .then((res: any) => {
      if (res.success) {
        readList.value = res.result.readUsers
        unreadList.value = res.result.unreadUsers
      }
    })
}
const sendSmsReminder = () => {
  const selectedPersons = getSelectedPersons()
  if (selectedPersons.length === 0) {
    uni.showToast({
      title: '请先选择要提醒的人员',
      icon: 'none',
    })
    return
  }
  if (selectedPersons.length > 1) {
    uni.showToast({
      title: '只能选择一人',
      icon: 'none',
    })
    return
  }
  const message = plus.messaging.createMessage(plus.messaging.TYPE_SMS)
  const phone = selectedPersons[0].phone
  message.to = [phone] // 这里数组中需要是字符串,否则ios会出现空白bug
  plus.messaging.sendMessage(message)
}

const makePhoneCall = () => {
  const selectedPersons = getSelectedPersons()
  if (selectedPersons.length === 0) {
    uni.showToast({
      title: '请先选择要提醒的人员',
      icon: 'none',
    })
    return
  }
  if (selectedPersons.length > 1) {
    uni.showToast({
      title: '只能选择一人',
      icon: 'none',
    })
    return
  }
  const platform = uni.getSystemInfoSync().platform
  const phone = selectedPersons[0].phone
  switch (platform) {
    case 'android':
      uni.showActionSheet({
        itemList: [phone, '呼叫'],
        success: function (res) {
          if (res.tapIndex === 1) {
            // 导入相关类
            const Intent = plus.android.importClass('android.content.Intent')
            const Uri = plus.android.importClass('android.net.Uri')

            // 获取当前 Activity
            const mainActivity = plus.android.runtimeMainActivity()

            // 创建 Intent - 使用 ACTION_DIAL
            const intent = new Intent(Intent.ACTION_DIAL)
            const uri = Uri.parse('tel:' + phone)
            intent.setData(uri)

            // 启动拨号界面
            mainActivity.startActivity(intent)
          }
        },
        complete: function (res) {
          console.log('安卓失败', res)
        },
      })
      break
    case 'ios':
      // 使用uni-app提供的借口
      uni.makePhoneCall({
        phoneNumber: phone,
      })
      break
    default:
      break
  }
}

const handleClose = () => {
  emit('close')
}

const handleCancel = () => {
  show.value = false
  handleClose()
}

const getAvatar = (url) => {
  const result = getFileAccessHttpUrl(url)
  if (result.length) {
    return result
  } else {
    return defaultAvatar
  }
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
.chat-unread-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* Tab 栏 */
.tabs {
  display: flex;
  background: #fff;
  margin: 12px 16px 0;
  border-radius: 10px;
  padding: 4px;
  flex-shrink: 0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}
.tab {
  flex: 1;
  text-align: center;
  padding: 8px 0;
  font-size: 14px;
  color: #999;
  border-radius: 8px;
  transition: all 0.2s;
}
.tab.active {
  background: #007aff;
  color: #fff;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0, 122, 255, 0.3);
}

/* 列表区 */
.scroll-container {
  flex: 1;
  overflow: hidden;
  margin: 12px 16px 0;
}
.tab-content {
  height: 100%;
}
.person-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  background: #fff;
  border-radius: 12px;
  padding: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

/* 人员卡片 */
.person-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 25%;
  padding: 10px 4px;
  border-radius: 10px;
  position: relative;
  transition: background 0.15s;
}
.person-item:active {
  background-color: #f0f4ff;
}
.person-item.selected {
  background-color: #e8f3ff;
}

/* 头像 */
.avatar-container {
  position: relative;
  width: 44px;
  height: 44px;
}
.avatar-container :deep(image),
.avatar-container :deep(.wd-img) {
  border-radius: 50%;
}

/* 选中角标 */
.checkmark {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 18px;
  height: 18px;
  background: #007aff;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  border: 2px solid #fff;
  box-shadow: 0 1px 4px rgba(0, 122, 255, 0.4);
}

.name {
  margin-top: 6px;
  font-size: 11px;
  color: #555;
  text-align: center;
  max-width: 56px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.person-item.selected .name {
  color: #007aff;
  font-weight: 500;
}

/* 操作区 */
.actions {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
  padding: 12px 16px;
  background: #fff;
  border-top: 1px solid #f0f0f0;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.04);
}
.actions :deep(.wd-button) {
  flex: 1;
}
</style>
