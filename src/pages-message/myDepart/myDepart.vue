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
  <PageLayout navTitle="我的部门" backRouteName="message" routeMethod="pushTab">
    <view class="wrap">
      <wd-search
        hide-cancel
        placeholder="请输入姓名/部门"
        v-model="searchText"
        @search="handleSearch"
        @clear="handleSearch"
      />
      <view class="main-content">
        <scroll-view scroll-y class="scroll-view" @scrolltolower="loadMoreUsers">
          <!-- 搜索结果 -->
          <template v-if="searchResult.depart.length || searchResult.user.length">
            <view class="search-result">
              <template v-if="searchResult.user.length">
                <view class="search-user solid-top">
                  <text class="search-user-title">人员</text>
                  <template v-for="item in searchResult.user" :key="item.id">
                    <view class="search-user-item solid-top" @tap="handleUserTap(item)">
                      <view @click.stop></view>
                      <view class="right">
                        <view class="search-user-item-circle">
                          <wd-img
                            width="36"
                            height="36px"
                            v-if="item.avatar"
                            :src="getFileAccessHttpUrl(item.avatar)"
                          />
                        </view>
                        <view class="search-user-item-info">
                          <view class="search-user-item-name">{{ item.realname }}</view>
                          <view class="search-user-item-org">{{ item.orgCodeTxt }}</view>
                        </view>
                      </view>
                    </view>
                  </template>
                </view>
              </template>
              <template v-if="searchResult.depart.length">
                <view class="search-depart solid-top">
                  <text class="search-depart-title">部门</text>
                  <template v-for="item in searchResult.depart" :key="item.id">
                    <view class="search-depart-item solid-top" @click="handleDepartTreeClick(item)">
                      <view class="cIcon depart-icon cuIcon-taoxiaopu"></view>
                      <view class="search-depart-item-name">{{ item.departName }}</view>
                      <wd-icon custom-class="icon-arrow" name="arrow-right" size="16px"></wd-icon>
                    </view>
                  </template>
                </view>
              </template>
            </view>
          </template>
          <template v-else>
            <view v-if="breadcrumb.length" class="breadcrumb-wrap solid-top">
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
            </view>
            <!-- 当前部门树 -->
            <div v-if="currentDepartTree.length" class="depart-tree">
              <template v-for="item in currentDepartTree" :key="item.id">
                <div class="depart-tree-item solid-top" @click="handleDepartTreeClick(item)">
                  <view class="cIcon depart-icon cuIcon-taoxiaopu"></view>
                  <div class="depart-tree-item-name">{{ item.departName }}</div>
                  <wd-icon custom-class="icon-arrow" name="arrow-right" size="16px"></wd-icon>
                </div>
              </template>
            </div>
            <!-- 当前部门的用户 -->
            <view v-if="currentDepartUsers.length" class="depart-users-tree">
              <view class="title">全部成员</view>
              <template v-for="item in currentDepartUsers" :key="item.id">
                <view class="depart-users-tree-item solid-top" @tap="handleUserTap(item)">
                  <view @click.stop>
                    <view class="depart-users-tree-item-circle">
                      <wd-img
                        width="36"
                        height="36px"
                        v-if="item.avatar"
                        :src="getFileAccessHttpUrl(item.avatar) ?? defaultAvatar"
                      />
                    </view>
                  </view>
                  <view class="right">
                    <view class="depart-users-tree-item-name">{{ item.realname }}</view>
                  </view>
                </view>
              </template>
              <!-- 分页加载更多 -->
              <view class="load-more-wrap solid-top">
                <template v-if="userLoading">
                  <wd-loading size="20px" />
                  <text class="load-more-text">加载中...</text>
                </template>
                <template v-else-if="userFinished">
                  <text class="load-more-text">没有更多了</text>
                </template>
              </view>
            </view>
            <view
              v-if="currentDepartTree.length === 0 && currentDepartUsers.length === 0"
              class="no-data"
            >
              <wd-status-tip url-prefix="/static/wot-assets/" image="content" tip="无内容" />
            </view>
          </template>
          <view class="scroll-bottom-safe"></view>
        </scroll-view>
      </view>
    </view>
  </PageLayout>
</template>

<script lang="ts" setup>
import { ref, reactive, computed } from 'vue'
import { onShow, onHide, onLoad, onReady } from '@dcloudio/uni-app'
import { useMessage, useToast } from 'wot-design-uni'
import { useRouter } from '@/plugin/uni-mini-router'
import { useUserStore } from '@/store/user'
import { http } from '@/utils/http'
import { useParamsStore } from '@/store/page-params'
import { getFileAccessHttpUrl } from '@/common/uitls'
import defaultAvatar from '@/static/default-avatar.png'

defineOptions({
  name: 'myDepart',
  options: {
    styleIsolation: '‌shared‌',
  },
})
const router = useRouter()
const paramsStore = useParamsStore()
const userStore = useUserStore()
const toast = useToast()
const message = useMessage()

const api = {
  getDepart: '/sys/sysDepart/queryDepartTreeSync',
  getDepartUsers: '/sys/user/queryDepartPostByOrgCode',
  getUserList: '/sys/user/listAll',
  searchByDepart: '/sys/sysDepart/searchBy',
}
// 搜索文本
const searchText = ref('')
// 面包屑
const breadcrumb = ref<any[]>([])
// 当前部门树
const currentDepartTree = ref<any[]>([])
// 当前部门用户
const currentDepartUsers = ref([])
// 分页状态
const userPageNo = ref(1)
const userPageSize = 10
const userTotal = ref(0)
const userLoading = ref(false)
const userFinished = computed(() => userTotal.value > 0 && currentDepartUsers.value.length >= userTotal.value)
const currentDepartOrgCode = ref('')

// 搜索结构
const searchResult: any = reactive({
  depart: [],
  user: [],
})

// 搜索人员/部门
const handleSearch = () => {
  if (searchText.value) {
    reqSearch({ keyWord: searchText.value })
    reqSearchUser({ realname: searchText.value })
    currentDepartTree.value = []
    currentDepartUsers.value = []
  } else {
    searchResult.user = []
    searchResult.depart = []
    reqDepart()
  }
}

const handleSearchUserCheck = (item: any, event: any) => {}

// 面包屑
const handleBreadcrumbClick = (item?) => {
  // 先清空
  currentDepartUsers.value = []
  if (item) {
    const findIndex = breadcrumb.value.findIndex((o) => o.id === item.id)
    if (findIndex != -1) {
      breadcrumb.value = breadcrumb.value.filter((item, index) => {
        console.log(item)
        return index <= findIndex
      })
    }
    reqDepart({ pid: item.id })
  } else {
    // 根节点
    reqDepart()
    breadcrumb.value = []
  }
}

// 点击部门树
const handleDepartTreeClick = (item: any) => {
  searchResult.depart = []
  searchResult.user = []
  if (item.isLeaf) {
    currentDepartTree.value = []
  } else {
    reqDepart({ pid: item.id })
  }
  userPageNo.value = 1
  userTotal.value = 0
  currentDepartUsers.value = []
  currentDepartOrgCode.value = item.orgCode
  reqDepartUsers({ orgCode: item.orgCode, pageNo: 1 })
  breadcrumb.value = [...breadcrumb.value, item]
}
// 搜索部门
const reqSearch = (params: any = {}) => {
  Object.assign(params, {
    column: 'createTime',
    order: 'desc',
  })
  return http.get(api.searchByDepart, params).then((res: any) => {
    if (res.success) {
      searchResult.depart = res.result ?? []
    } else {
      searchResult.depart = []
    }
  })
}
// 搜索用户
const reqSearchUser = (params: any = {}) => {
  Object.assign(params, {
    column: 'createTime',
    order: 'desc',
    pageNo: 1,
    pageSize: 100,
    realname: `*${params.realname}*`,
  })
  return http.get(api.getUserList, params).then((res: any) => {
    if (res.success) {
      searchResult.user = res.result?.records ?? []
    } else {
      searchResult.user = []
    }
  })
}
// 点击人员
const handleUserTap = (data: any) => {
  paramsStore.setPageParams('personPage', { backRouteName: 'myDepart', data })
  router.push({ name: 'personPage' })
}
// 获取部门
const reqDepart = (params: any = {}) => {
  Object.assign(params, {
    column: 'createTime',
    order: 'desc',
  })
  return http.get(api.getDepart, params).then((res: any) => {
    if (res.success) {
      currentDepartTree.value = res.result
    } else {
      toast.warning(res.message)
    }
  })
}
// 获取部门用户
const reqDepartUsers = (params: any = {}) => {
  if (userLoading.value) return
  userLoading.value = true
  const pageNo = params.pageNo ?? userPageNo.value
  Object.assign(params, {
    column: 'createTime',
    order: 'desc',
    pageNo,
    pageSize: userPageSize,
  })
  return http
    .get(api.getDepartUsers, params)
    .then((res: any) => {
      userLoading.value = false
      if (res.success) {
        const records = res.result?.records ?? []
        if (pageNo === 1) {
          currentDepartUsers.value = records
        } else {
          currentDepartUsers.value = [...currentDepartUsers.value, ...records]
        }
        userTotal.value = res.result?.total ?? 0
        userPageNo.value = pageNo
      }
    })
    .catch(() => {
      userLoading.value = false
    })
}
// 滚动到底部加载更多
const loadMoreUsers = () => {
  if (userLoading.value || userFinished.value || !currentDepartOrgCode.value) return
  reqDepartUsers({ orgCode: currentDepartOrgCode.value, pageNo: userPageNo.value + 1 })
}
const init = () => {
  reqDepart()
}

init()
</script>

<style lang="scss" scoped>
.wrap {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.main-content {
  flex: 1;
  min-height: 0;
  position: relative;
  overflow: hidden;
  color: #555;
  .scroll-view {
    height: 100%;
  }
  .scroll-bottom-safe {
    height: constant(safe-area-inset-bottom);
    height: env(safe-area-inset-bottom);
    min-height: 16px;
  }
  :deep(.icon-arrow) {
    color: rgba(0, 0, 0, 0.25);
  }
  .cIcon {
    width: 30px;
    height: 30px;
    line-height: 30px;
    font-size: 15px;
    color: #fff;
    background-color: var(--color-orange);
    text-align: center;
    border-radius: 50%;
  }
  .breadcrumb-wrap {
    background-color: #fff;
  }
  .selected-user {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: #fff;
  }
  .no-data {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .depart-tree {
    .depart-tree-item {
      background-color: #fff;
      padding: 0 16px;
      line-height: 50px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      &:hover {
        background-color: #f4f6fa;
      }
    }
    .depart-tree-item-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin: 0 8px;
    }
  }
  .depart-users-tree {
    .title {
      padding-left: 16px;
      line-height: 40px;
      font-size: 15px;
      color: #888;
    }
    .depart-users-tree-item {
      line-height: 50px;
      padding: 0 16px;
      display: flex;
      align-items: center;
      cursor: pointer;
      background-color: #fff;
      &:hover {
        background-color: #f4f6fa;
      }
      .right {
        flex: 1;
        display: flex;
        align-items: center;
        margin: 0 8px;
      }
      .depart-users-tree-item-circle {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background-color: #aaa;
        overflow: hidden;
        :deep(image) {
          display: block;
          width: 100%;
          height: 100%;
        }
      }
    }
    .load-more-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px 0;
      background-color: #fff;
      .load-more-text {
        font-size: 13px;
        color: #999;
        margin-left: 6px;
      }
    }
  }
  .search-depart {
    margin-bottom: 8px;
    .search-depart-title {
      padding-left: 16px;
      line-height: 50px;
      font-size: 16px;
      font-weight: 500;
      margin-bottom: 8px;
      color: var(--UI-FG-1);
    }
    .search-depart-item {
      line-height: 50px;
      display: flex;
      align-items: center;
      padding: 0 16px;
      cursor: pointer;
      &:hover {
        background-color: #f4f6fa;
      }
      .search-depart-item-name {
        margin-left: 8px;
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }
  .search-result {
    background-color: #fff;
    min-height: 100%;
  }
  .search-user {
    margin-bottom: 8px;
    .search-user-title {
      font-size: 16px;
      font-weight: 500;
      margin-bottom: 8px;
      padding-left: 16px;
      line-height: 50px;
      color: var(--UI-FG-1);
    }
    .search-user-item {
      display: flex;
      align-items: center;
      padding: 8px 16px;
      cursor: pointer;
      &:hover {
        background-color: #f4f6fa;
      }
      .right {
        flex: 1;
        display: flex;
        align-items: center;
        margin: 0 8px;
      }
      .search-user-item-info {
        display: flex;
        flex-direction: column;
        justify-content: center;
        margin-left: 8px;
      }
      .search-user-item-circle {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        overflow: hidden;
        background-color: #aaa;
      }
      .search-user-item-name {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .search-user-item-org {
        color: #999;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }
}
</style>
