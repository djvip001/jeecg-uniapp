<route lang="json5" type="page">
{
  layout: 'default',
  style: {
    navigationBarTitleText: '',
    navigationStyle: 'custom',
    disableScroll: true, // 微信禁止页面滚动
    'app-plus': {
      bounce: 'none', // 禁用 iOS 弹性效果
    },
  },
}
</route>

<template>
  <PageLayout navTitle="详情" :backRouteName="backRouteName" :routeMethod="routeMethod">
    <scroll-view scroll-y>
      <view class="p-15px">
        <view class="mb-15px">
          <wd-text custom-class="title font-size-20px" :text="annotation.titile"></wd-text>
        </view>
        <view class="flex mb-24px">
          <view class="flex-1">
            <wd-text custom-class="sender mr-20px" :text="annotation.sender"></wd-text>
            <wd-text class="sendTime" :text="annotation.sendTime"></wd-text>
          </view>
          <wd-text
            custom-class="cIcon cuIcon-attentionfill mr-15px"
            :text="annotation.visitsNum || 1"
          ></wd-text>
        </view>
        <view class="content mb-24px">
          <view class="text-content">
            <mp-html :content="annotation.msgContent" :tag-style="mpHtmlTagStyle"></mp-html>
          </view>
        </view>
        <view class="file-list">
          <template v-for="item in file" :key="item">
            <view class="file-content" @click="downloadFile(item)">
              <wd-icon name="download" size="15px" color="#007AFF"></wd-icon>
              <view class="text ml-4px">{{ getFileName(item) }}</view>
            </view>
          </template>
        </view>
      </view>
    </scroll-view>
  </PageLayout>
</template>

<script lang="ts" setup>
import { reactive } from 'vue'
import { onLaunch, onShow, onHide, onLoad, onReady } from '@dcloudio/uni-app'
import { http } from '@/utils/http'
import { useParamsStore } from '@/store/page-params'
import { useUserStore } from '@/store/user'
import { downloadFile } from '@/common/uitls'
import { isString } from '@/common/is'
import appBadge from "@/common/appBadge";
//
const annotation = reactive({
  id: '',
  titile: '',
  startTime: '',
  sender: '',
  msgContent: '',
  anntId: '',
  busId: '',
  sendTime: '',
  visitsNum: 0,
})
const api = {
  addVisitsNumber: '/sys/annountCement/addVisitsNumber',
  // update-begin--author:liaozhiyang---date:20260811---for:【LHZP-1679】发布人需翻译
  userList: '/sys/user/listAll',
  // update-end--author:liaozhiyang---date:20260811---for:【LHZP-1679】发布人需翻译
}
const userStore = useUserStore()
const paramsStore = useParamsStore()
const goodNumber = ref(null)
const flg = ref(true)
const pageParams = paramsStore.getPageParams('annotationDetail') ?? {}
const backRouteName = ref(pageParams.backRouteName ?? 'annotationList')
const routeMethod = ref(pageParams.routeMethod ?? 'replace')
const mpHtmlTagStyle = {
  table: 'border-collapse:collapse;width:100%;border:1px solid #ccc',
  td: 'border:1px solid #ccc;padding:5px',
  th: 'border:1px solid #ccc;padding:5px;font-weight:bold',
}
const file = ref([])
const init = async (option) => {
  const annItem = option
  if (isString(annItem.files)) {
    file.value = annItem.files.split(',')
  }
  Object.assign(annotation, annItem)
  annotation.visitsNum = annItem?.visitsNum || 0
  // update-begin--author:liaozhiyang---date:20260811---for:【LHZP-1679】发布人需翻译
  await Promise.all([translateSender(), getVisitsNum(), readOk()])
  // update-end--author:liaozhiyang---date:20260811---for:【LHZP-1679】发布人需翻译
}
// update-begin--author:liaozhiyang---date:20260811---for:【LHZP-1679】发布人需翻译
const translateSender = async () => {
  const sender = annotation.sender
  if (!sender) {
    return
  }
  try {
    const result: any = await http.get(api.userList, {
      pageNo: 1,
      pageSize: 1,
      username: sender,
    })
    const realname = result.success ? result.result?.records?.[0]?.realname : ''
    if (realname && annotation.sender === sender) {
      annotation.sender = realname
    }
  } catch (error) {
    // 用户查询失败时保留原账号，不影响公告详情加载
  }
}
// update-end--author:liaozhiyang---date:20260811---for:【LHZP-1679】发布人需翻译
const getFileName = (path = '') => {
  let str = path.split('/').pop()
  const extension = str.split('.').pop()
  const nameWithoutExtension = str.substring(0, str.lastIndexOf('.'))
  const len = 30 // 文件名最大长度
  str =
    nameWithoutExtension.length > len
      ? nameWithoutExtension.substring(0, len) + '.' + extension
      : str
  return str
}
const readOk = async () => {
  const param = { anntId: annotation.anntId || annotation.id }
  await http.put('/sys/sysAnnouncementSend/editByAnntIdAndUserId', param)
  if (!annotation.busId) {
    const result: any = await http.get(api.addVisitsNumber, { id: annotation.id })
    if (result.success) {
      annotation.visitsNum = Number(annotation?.visitsNum || 0) + 1
    }
  }
  // 更新角标数量
  await appBadge()
}
// 获取阅读数量
const getVisitsNum = async () => {
  if (!annotation.busId) {
    const res: any = await http.get('/sys/annountCement/queryById', { id: annotation.id })
    if (res.success) {
      annotation.visitsNum = Number(res?.result?.visitsNum || 1)
    }
  }
}
init(pageParams.data)
</script>

<style lang="scss" scoped>
//

:deep(.pageLayout) {
  .pageContent {
    background-color: #fff;
  }
}
:deep(._root) {
  overflow-y: visible !important;
}
// 修复 CSS Grid 子像素渲染导致的左侧边框断裂
// box-shadow 是元素渲染的固有部分，始终覆盖元素完整高度，不受 background-size 计算影响
:deep(._table) {
  box-shadow: inset 1px 0 0 0 #ccc;
}
:deep(.wd-text) {
  --wot-text-info-color: #999;
  &.sender {
    color: var(--UI-FG-0);
  }
  &.sendTime {
    color: var(--color-gray);
  }
  &.cIcon {
    &::before {
      margin-right: 4px;
    }
  }
}
:deep(.title) {
  --wot-text-info-color: #333;
  margin-bottom: 10px;
  font-family: '宋体';
}
.file-content {
  display: flex;
  justify-content: left;
  line-height: 36px;
  color: var(--color-blue);
  font-size: 14px;
  .cuIcon-download {
    font-size: 16px;
  }
}
</style>
