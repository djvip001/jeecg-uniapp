<template>
  <wd-popup position="bottom" v-model="show">
    <PageLayout :navTitle="modalTitle" type="popup" @navBack="handleCancel">
      <view class="wrap">
        <view class="wrap-content">
          <wd-search
            hide-cancel
            :placeholder="placeholder"
            v-model="searchText"
            @search="handleSearch"
            @clear="handleSearch"
          />
          <view class="main-content">
            <template v-if="!showSelectedUser">
              <!-- Tabs: 部门 / 岗位 / 用户组 -->
              <view class="tabs-row">
                <view
                  :class="['tab-item', { active: activeTab === 'department' }]"
                  @click="switchTab('department')"
                >
                  部门
                </view>
                <view
                  :class="['tab-item', { active: activeTab === 'position' }]"
                  @click="switchTab('position')"
                >
                  岗位
                </view>
                <view
                  :class="['tab-item', { active: activeTab === 'usergroup' }]"
                  @click="switchTab('usergroup')"
                >
                  用户组
                </view>
              </view>
              <view class="tab-content">
                <scroll-view scroll-y class="tab-scroll-view">
                  <view v-if="loadingTab" class="tab-loading">加载中...</view>
                  <template v-else>
                    <depart-user v-if="activeTab === 'department'" />
                    <position-user v-if="activeTab === 'position'" />
                    <UserGroupUser v-if="activeTab === 'usergroup'" />
                  </template>
                </scroll-view>
              </view>
            </template>
            <view v-if="showSelectedUser" class="selected-user">
              <SelectedUser :selectedUsers="selectedUsers" @del="handleDelUser"></SelectedUser>
            </view>
          </view>
        </view>
        <view class="wrap-footer">
          <view class="text" @click="() => (showSelectedUser = !showSelectedUser)">
            <view>已选</view>
            <view class="num">{{ selectedUsers.length }}</view>
            <view>人</view>
            <text class="tip">(查看选中用户)</text>
          </view>
          <wd-button type="primary" @click="handleConfirm">确定</wd-button>
        </view>
      </view>
    </PageLayout>
    <wd-toast :selector="selector"></wd-toast>
  </wd-popup>
</template>

<script setup lang="ts">
import { ref, reactive, nextTick, provide } from 'vue'
import { useToast } from 'wot-design-uni'
import { http } from '@/utils/http'
import { getFileAccessHttpUrl, uuid } from '@/common/uitls'
import SelectedUser from './SelectedUser.vue'
import DepartUser from './depart-user.vue'
import UserGroupUser from './usergroup-user.vue'
import PositionUser from './position-user.vue'

defineOptions({
  name: 'SelectUserModal',
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
    default: '选择用户',
  },
  maxSelectCount: {
    type: Number,
  },
  // 这是用户全数据（项包含id，username、realname）
  selectedUser: {
    type: Array,
    default: () => [],
  },
  rowKey: {
    type: String,
    default: 'username',
  },
  // 是否启用公司简称
  useCompanyShortName: {
    type: Boolean,
    default: true,
  },
})
const api = {
  selectUserList: '/sys/user/selectUserList',
  userlist: '/sys/user/list',
  queryTreeList: '/sys/sysDepart/queryTreeList',
  getTableList: '/sys/user/queryDepartPostByOrgCode',
  // add likely endpoints for positions and user groups (may be adjusted by backend)
  postList: '/sys/sysDepart/getALLRankRelation',
  queryDepartPostByOrgCode: '/sys/user/queryDepartPostByOrgCode',

  groupList: '/sys/ugroup/list',
  userGroupList: '/sys/user/groupUserList',
}
const placeholder = ref('请输入姓名/部门')
const emit = defineEmits(['change', 'close'])
const selector = uuid()
const toast = useToast(selector)
const show = ref(true)
// 搜索文本
const searchText = ref('')
// 是否显示已选用户
const showSelectedUser = ref(false)
// 搜索结构
const searchResult: any = reactive({
  depart: [],
  user: [],
  group: [],
  post: [],
})
// 已选用户
const selectedUsers = ref<any[]>([])
//* *****部门选择逻辑begin*******
// 当前部门用户
const currentUsers = ref([])
// 全选
const currentAllUsers = ref(false)
// 部门树(整颗树)
const departTree = ref([])
// 当前部门树
const currentDepartTree = ref<any[]>([])
provide('currentDepartTree', currentDepartTree)
provide('departTree', departTree)
provide('selectedUsers', selectedUsers)
provide('searchResult', searchResult)
provide('currentUsers', currentUsers)
provide('currentAllUsers', currentAllUsers)

watch(
    () => searchText.value,
    () => {
      !searchText.value && handleSearch()
    },
)
// 通过名称搜索部门支持模糊
const getDepartByName = (name: string, tree = departTree.value): any[] => {
  const result: any[] = []
  const search = (nodes: any[]) => {
    for (const node of nodes) {
      if (
        getDepartName(node.departName, node.departNameAbbr)
          ?.toLowerCase()
          .includes(name.toLowerCase())
      ) {
        result.push(node)
      }
      if (node.children?.length) {
        search(node.children)
      }
    }
  }
  search(tree)
  return result
}
// 通过名称搜索部门支持模糊
const getPostByName = (name: string, tree = postData.value): any[] => {
  const result: any[] = []
  const search = (nodes: any[]) => {
    for (const node of nodes) {
      if (node.title?.toLowerCase().includes(name.toLowerCase())) {
        result.push(node)
      }
      if (node.children?.length) {
        search(node.children)
      }
    }
  }
  search(tree)
  return result
}
// 通过名称搜索用户组支持模糊
const getGroupByName = (name: string, tree = groupData.value): any[] => {
  const result: any[] = []
  const search = (nodes: any[]) => {
    for (const node of nodes) {
      if (node.groupName?.toLowerCase().includes(name.toLowerCase())) {
        result.push(node)
      }
    }
  }
  search(tree)
  return result
}
// 获取部门名称（如果启用公司简称且公司简称不为空，则返回公司简称）
function getDepartName(departName, departNameAbbr) {
  if (props.useCompanyShortName && departNameAbbr) {
    return departNameAbbr
  }
  return departName
}
const getQueryTreeList = (params?) => {
  queryTreeList({ ...params })
    .then((res: any) => {
      loadingTab.value = false
      if (res.success) {
        departTree.value = res.result
        currentDepartTree.value = res.result
      } else {
        toast.warning(res.message)
      }
    })
    .finally(() => {
      loadingTab.value = false
    })
}
// 获取部门树列表
const queryTreeList = (params = {}) => {
  return http.get(api.queryTreeList, { ...params })
}
//* *****部门选择逻辑end**************************

//* *****用户组选择逻辑end**************************
const groupData = ref([])
provide('groupData', groupData)
//* *****用户组选择逻辑end**************************

//* *****岗位组选择逻辑begin**************************
const postData = ref([])
provide('postData', postData)
//* *****岗位组选择逻辑end**************************
// Tab相关
const activeTab = ref('department')
const loadingTab = ref(false)
const handleClose = () => {
  setTimeout(() => {
    emit('close')
  }, 400)
}
const handleConfirm = () => {
  if (selectedUsers.value.length === 0) {
    toast.warning('还没选择用户~')
    return
  }
  show.value = false
  let result = []
  let value = selectedUsers.value
  if (!Array.isArray(selectedUsers.value)) {
    value = [selectedUsers.value]
  }
  result = value
  emit('change', result)
  handleClose()
}
const handleCancel = () => {
  if (showSelectedUser.value) {
    showSelectedUser.value = false
  } else {
    show.value = false
    handleClose()
    console.log('取消了~')
  }
}
// 搜索人员/部门
const handleSearch = () => {
  if (searchText.value) {
    http
      .get(`/sys/user/listAll`, {
        column: 'createTime',
        order: 'desc',
        pageNo: 1,
        pageSize: 100,
        realname: `*${searchText.value}*`,
      })
      .then((res: any) => {
        if (res.success) {
          res.result.records?.forEach((item) => {
            const findItem = selectedUsers.value.find((user) => user.id == item.id)
            if (findItem) {
              // 能在右侧找到说明选中了，左侧同样需要选中。
              item.checked = true
            } else {
              item.checked = false
            }
          })
          searchResult.user = res.result.records ?? []
        } else {
          toast.warning(res.message)
        }
      })
    searchResult.depart = getDepartByName(searchText.value) ?? []
    searchResult.post = getPostByName(searchText.value) ?? []
    searchResult.group = getGroupByName(searchText.value) ?? []
    showSelectedUser.value = false
  } else {
    searchResult.user = []
    searchResult.depart = []
    searchResult.post = []
    searchResult.group = []
  }
}

// 初始化
const init = () => {
  if (props.selectedUser.length) {
    // 编辑时，传进来已选中的数据
    selectedUsers.value = props.selectedUser
  }
  getQueryTreeList()
}
init()
// 删除人员
const handleDelUser = (item) => {
  const findIndex = selectedUsers.value.findIndex((user) => user.id === item.id)
  if (findIndex !== -1) {
    selectedUsers.value.splice(findIndex, 1)
  }
  const findItem: any = currentUsers.value.find((user: any) => user.id === item.id)
  if (findItem) {
    findItem.checked = false
    currentAllUsers.value = false
  }
}
// Tab相关
const switchTab = async (tab) => {
  activeTab.value = tab
  loadingTab.value = true
  currentUsers.value = []
  // 根据不同的tab切换请求不同的接口
  if (tab === 'department') {
    placeholder.value = '请输入姓名/部门'
    getQueryTreeList()
  } else {
    placeholder.value = tab === 'position' ? '请输入姓名/岗位' : '请输入姓名/用户组'
    http
      .get(tab === 'position' ? api.postList : api.groupList, { pageSize: 100 })
      .then((res: any) => {
        loadingTab.value = false
        if (res.success) {
          if (tab === 'position') {
            postData.value = res.result ?? []
          } else if (tab === 'usergroup') {
            groupData.value = res.result.records ?? []
          }
        } else {
          toast.warning(res.message)
        }
      })
      .catch((err) => {
        loadingTab.value = false
        toast.warning('获取列表失败')
      })
  }
}
</script>

<style lang="scss" scoped>
.wrap {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.wrap-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.wrap-footer {
  padding: 10px;
  padding-bottom: calc(constant(safe-area-inset-bottom) + 10px);
  padding-bottom: calc(env(safe-area-inset-bottom) + 10px);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #e5e5e5;
  background-color: #fff;
  .text {
    display: flex;
    align-items: center;
    .num {
      font-size: 18px;
      margin: 0 5px;
      color: var(--wot-color-theme);
    }
  }
  .tip {
    font-size: 11px;
    color: #999;
  }
}
.home-icon {
  margin-right: 4px;
  font-size: 16px;
}
.tabs-row {
  display: flex;
  background-color: #f4f6fa;
  padding: 8px 0;
}
.tab-item {
  flex: 1;
  text-align: center;
  padding: 10px 0;
  cursor: pointer;
  &.active {
    font-weight: 500;
    color: var(--wot-color-theme);
    background-color: #fff;
    border-radius: 4px;
  }
}
.tab-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: #fff;
  border-top: 1px solid #e5e5e5;
  .tab-scroll-view {
    flex: 1;
    height: 1px; // uni-app 跨端兼容：让 scroll-view 遵循 flex:1
  }
  .tab-loading {
    padding: 16px;
    text-align: center;
    color: #999;
  }
  .tab-empty {
    padding: 16px;
    text-align: center;
    color: #999;
  }
  .tab-item-row {
    padding: 12px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    &:hover {
      background-color: #f4f6fa;
    }
    .tab-item-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-right: 8px;
    }
  }
}
.selected-user {
  background-color: #ffffff;
}
</style>
