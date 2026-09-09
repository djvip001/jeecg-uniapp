<template>
  <view class="wrap">
    <template v-if="breadcrumb.length">
      <Breadcrumb
        separator="/"
        :items="[
          { title: '首页', icon: 'home' },
          ...breadcrumb.map((item) => ({ title: item.departName, ...item })),
        ]"
        @click="(item, index) => handleBreadcrumbClick(index === 0 ? undefined : item)"
      >
        <template #item-0="{ item }">
          <wd-icon name="home" size="18px"></wd-icon>
        </template>
      </Breadcrumb>
    </template>
    <view class="content">
      <scroll-view class="scrollArea" scroll-y>
        <template v-if="dataSource.length">
          <template v-for="(item, index) in dataSource" :key="index">
            <wd-cell border clickable @click="handleClick(item)">
              <template #icon>
                <view :class="[item.username ? 'avatar-wrap' : '', 'mr2']">
                  <wd-img
                    :radius="getRadius(item)"
                    :width="30"
                    :height="30"
                    :src="getImg(item)"
                  ></wd-img>
                </view>
              </template>
              <template #title>
                <view class="content text-gray-4">
                  <text>{{ getName(item) }}</text>
                </view>
              </template>
            </wd-cell>
          </template>
        </template>
        <template v-else>
          <wd-status-tip url-prefix="/static/wot-assets/" image="content" tip="暂无内容" />
        </template>
      </scroll-view>
    </view>
  </view>
  <wd-toast />
</template>

<script lang="ts" setup>
import { onLaunch, onShow, onHide, onLoad, onReady } from '@dcloudio/uni-app'
import { nextTick, onMounted, ref } from 'vue'
import { useUserStore } from '@/store/user'
import { http } from '@/utils/http'
import { useToast, useMessage, useNotify, dayjs } from 'wot-design-uni'
import { useRouter } from '@/plugin/uni-mini-router'
import { useParamsStore } from '@/store/page-params'
import defaultAvatar from '@/static/default-avatar.png'
import folderImg from '@/static/folder.png'
import { getFileAccessHttpUrl } from '@/common/uitls'

const router = useRouter()
const userStore = useUserStore()
const toast = useToast()
const props = defineProps(['tenantId'])
const dataSource: any = ref([])
const paramsStore = useParamsStore()
const breadcrumb = ref([])
const api = {
  depTree: '/sys/sysDepart/queryBookDepTreeSync',
  list: '/sys/user/list',
}
const getImg = (item) => {
  if (item.parentId != null) {
    return folderImg
  } else {
    return getFileAccessHttpUrl(item.avatar)
  }
}
const getName = (item) => {
  if (item.parentId != null) {
    return item.departName
  } else {
    return item.realname
  }
}
const getRadius = (item) => {
  return item.parentId != null ? null : '50%'
}

const handleClick = (item) => {
  if (item.parentId != null) {
    query({ id: item.id, item })
  } else {
    paramsStore.setPageParams('personPage', { data: item })
    router.push({ name: 'personPage' })
  }
}
const handleBreadcrumbClick = (item) => {
  if (item) {
    query({ id: item.id })
    breadcrumb.value = [...breadcrumb.value, item]
    const findIndex = breadcrumb.value.findIndex((o) => o.id === item.id)
    if (findIndex != -1) {
      breadcrumb.value = breadcrumb.value.filter((item, index) => {
        return index <= findIndex
      })
    }
  } else {
    query()
    breadcrumb.value = []
  }
}
const query = (params: any = {}) => {
  const pararms = { pid: params.id ?? '', departId: params.id, tenantId: props.tenantId }
  Promise.all([
    http.get(api.depTree, pararms),
    pararms.pid
      ? http.get(api.list, pararms)
      : Promise.resolve({ success: true, result: { records: [] } }),
  ])
    .then((res: any) => {
      if (res[0].success == true && res[1].success == true) {
        const result = res[0]?.result ?? []
        const records = res[1]?.result?.records ?? []
        const data = [...result, ...records]
        if (params.id) {
          // 证明是点击
          if (data.length) {
            dataSource.value = data
            if (params.item) {
              breadcrumb.value = [...breadcrumb.value, params.item]
            }
          } else {
            toast.warning('下一级无数据~')
          }
        } else {
          dataSource.value = data
        }
      }
    })
    .catch((res) => {})
}
query()
</script>

<style lang="scss" scoped>
.wrap {
  height: 100%;
  display: flex;
  flex-direction: column;
  .content {
    flex: 1;
    overflow: hidden;
  }
}
.avatar-wrap {
  background-color: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}
:deep(.wd-cell) {
  .wd-cell__right {
    display: none;
  }
}
</style>
