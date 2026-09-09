<template>
  <wd-popup position="bottom" v-model="show">
    <PageLayout :navTitle="modalTitle" type="popup" @navBack="handleCancel">
      <view class="wrap">
        <view class="wrap-content">
          <wd-search
            hide-cancel
            placeholder="请输入姓名/部门"
            v-model="searchText"
            @search="handleSearch"
            @clear="handleSearch"
          />
          <view class="main-content">
            <scroll-view scroll-y>
              <template v-if="searchResult.depart.length || searchResult.user.length">
                <view class="search-result">
                  <template v-if="searchResult.user.length">
                    <view class="search-user solid-top">
                      <text class="search-user-title">人员</text>
                      <template v-for="item in searchResult.user" :key="item.id">
                        <view
                          class="search-user-item solid-top"
                          @click="handleSearchUserCheck(item)"
                        >
                          <view @click.stop>
                            <wd-checkbox
                              shape="square"
                              v-model="item.checked"
                              @change="($event) => handleSearchUserCheck(item, $event)"
                            />
                          </view>
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
                        <view
                          class="search-depart-item solid-top"
                          @click="handleSearchDepartClick(item)"
                        >
                          <view @click.stop>
                            <wd-checkbox
                              shape="square"
                              v-model="item.checked"
                              @change="($event) => handleSearchDepartCheck($event, item)"
                            />
                          </view>
                          <view class="search-depart-item-name">
                            {{ getDepartName(item.departName, item.departNameAbbr) }}
                          </view>
                          <wd-icon
                            custom-class="icon-arrow"
                            name="arrow-right"
                            size="16px"
                          ></wd-icon>
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
                      ...breadcrumb.map((item) => ({
                        ...item,
                        title: getDepartName(item.departName, item.departNameAbbr),
                      })),
                    ]"
                    @click="(item, index) => handleBreadcrumbClick(index === 0 ? undefined : item)"
                  >
                    <template #item-0="{ item }">
                      <wd-icon name="home" size="18px"></wd-icon>
                    </template>
                  </Breadcrumb>
                </view>
                <div v-if="currentDepartUsers.length">
                  <!-- 当前部门用户树 -->
                  <div class="depart-users-tree solid-top">
                    <div v-if="!currentDepartTree.length" class="allChecked">
                      <wd-checkbox
                        shape="square"
                        v-model="currentDepartAllUsers"
                        @change="handleAllUsers"
                      >
                        全选
                      </wd-checkbox>
                    </div>
                    <template v-for="item in currentDepartUsers" :key="item.id">
                      <div
                        class="depart-users-tree-item solid-top"
                        @click="handleDepartUsersTreeCheck(item)"
                      >
                        <view @click.stop>
                          <wd-checkbox
                            shape="square"
                            v-model="item.checked"
                            @change="($event) => handleDepartUsersTreeCheck(item, $event)"
                          />
                        </view>
                        <div class="right">
                          <div class="depart-users-tree-item-circle">
                            <wd-img
                              width="36"
                              height="36px"
                              v-if="item.avatar"
                              :src="getFileAccessHttpUrl(item.avatar)"
                            />
                          </div>
                          <div class="depart-users-tree-item-name">{{ item.realname }}</div>
                        </div>
                      </div>
                    </template>
                    <!-- 分页加载更多 -->
                    <div
                      v-if="!currentDepartHasChildren && currentDepartUsers.length > 0"
                      class="load-more-wrap solid-top"
                    >
                      <template v-if="userLoading">
                        <wd-loading size="20px" />
                        <text class="load-more-text">加载中...</text>
                      </template>
                      <template v-else-if="userFinished">
                        <text class="load-more-text">没有更多了</text>
                      </template>
                      <template v-else>
                        <text class="load-more-text load-more-btn" @click="loadMoreUsers">点击加载更多</text>
                      </template>
                    </div>
                  </div>
                </div>
                <!-- 部门树 -->
                <div v-if="currentDepartTree.length" class="depart-tree">
                  <template v-for="item in currentDepartTree" :key="item.id">
                    <div class="depart-tree-item solid-top" @click="handleDepartTreeClick(item)">
                      <view @click.stop>
                        <wd-checkbox
                          shape="square"
                          v-model="item.checked"
                          @change="($event) => handleDepartTreeCheck($event, item)"
                        />
                      </view>
                      <div class="depart-tree-item-name">
                        {{ getDepartName(item.departName, item.departNameAbbr) }}
                      </div>
                      <wd-icon custom-class="icon-arrow" name="arrow-right" size="16px"></wd-icon>
                    </div>
                  </template>
                </div>
                <div
                  v-if="currentDepartTree.length === 0 && currentDepartUsers.length === 0"
                  class="no-data"
                >
                  <wd-status-tip url-prefix="/static/wot-assets/" image="content" tip="暂无内容" />
                </div>
              </template>
            </scroll-view>
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
import { ref, reactive, computed, nextTick } from 'vue'
import { useToast, useMessage, useNotify, dayjs } from 'wot-design-uni'
import { http } from '@/utils/http'
import { isArray, isString } from '@/utils/is'
import { cache, getFileAccessHttpUrl, uuid } from '@/common/uitls'
import defaultAvatar from '@/static/default-avatar.png'
import SelectedUser from './SelectedUser.vue'

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
}
const emit = defineEmits(['change', 'close'])
const selector = uuid()
const toast = useToast(selector)
const show = ref(true)
// 搜索文本
const searchText = ref('')
const breadcrumb = ref<any[]>([])
// 部门树(整颗树)
const departTree = ref([])
// 当前部门树
const currentDepartTree = ref<any[]>([])
// 选中的部门节点
const checkedDepartIds = ref<string[]>([])
// 当前部门用户
const currentDepartUsers = ref([])
// 已选用户
const selectedUsers = ref<any[]>([])
// 全选
const currentDepartAllUsers = ref(false)
// 搜索结构
const searchResult: any = reactive({
  depart: [],
  user: [],
})
// 映射部门和人员的关系
const cacheDepartUser = {}
// 是否显示已选用户
const showSelectedUser = ref(false)
// 分页相关状态
const userPageNo = ref(1)
const userPageSize = ref(10)
const userTotal = ref(0)
const userLoading = ref(false)
const userFinished = computed(() => currentDepartUsers.value.length >= userTotal.value)
// 当前部门id（用于分页加载）
const currentDepartOrgCode = ref('')
// 当前部门是否有子节点（有子节点时不分页）
const currentDepartHasChildren = ref(false)
const handleClose = () => {
  setTimeout(() => {
    emit('close')
  }, 400)
}
const handleConfirm = () => {
  if (selectedUsers.value.length == 0) {
    toast.warning('还没选择用户~')
    return
  }
  if (props.multi == false && selectedUsers.value.length > 1) {

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
  show.value = false
  handleClose()
  console.log('取消了~')
}
const getAvatar = (url) => {
  let result = getFileAccessHttpUrl(url)
  if (result.length) {
    return result
  } else {
    return defaultAvatar
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
    showSelectedUser.value = false
  } else {
    searchResult.user = []
    searchResult.depart = []
  }
}
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
    const data = getDepartTreeNodeById(item.id, departTree.value)
    currentDepartTree.value = data.children
  } else {
    // 根节点
    currentDepartTree.value = departTree.value
    breadcrumb.value = []
  }
}
// 点击部门树复选框触发
const handleDepartTreeCheck = ({ value }, item) => {
  const target = { checked: value }
  if (target.checked) {
    // 选中
    getUsersByDeptId(item.orgCode).then((users) => {
      addUsers(users)
    })
    checkedDepartIds.value.push((item as any).id)
    // 检查父节点下所有子节点是否选中
    const parentItem = getDepartTreeParentById(item.id)
    if (parentItem?.children) {
      const isChildAllChecked = parentItem.children.every((item) => item.checked)
      if (isChildAllChecked) {
        parentItem.checked = true
      } else {
        parentItem.checked = false
      }
    }
  } else {
    // 取消选中
    const findIndex = checkedDepartIds.value.findIndex((o: any) => o.id === item.id)
    if (findIndex != -1) {
      checkedDepartIds.value.splice(findIndex, 1)
    }
    // 如果父节点是选中，则需要取消
    const parentItem = getDepartTreeParentById(item.id)
    if (parentItem) {
      parentItem.checked = false
    }
    getUsersByDeptId(item.orgCode).then((users) => {
      users.forEach((item) => {
        const findIndex = selectedUsers.value.findIndex((user) => user.id === item.id)
        if (findIndex != -1) {
          selectedUsers.value.splice(findIndex, 1)
        }
      })
    })
  }
}
// 点击部门树节点触发
const handleDepartTreeClick = (item) => {
  breadcrumb.value = [...breadcrumb.value, item]
  if (item.children) {
    // 有子节点，则显示部门
    currentDepartHasChildren.value = true
    if (item.checked) {
      // 父节点勾选，则子节点全部勾选
      item.children.forEach((item) => {
        item.checked = true
      })
    }
    currentDepartTree.value = item.children
    http
      .get('/sys/sysDepart/getUsersByDepartId', {
        id: item['id'],
      })
      .then((res: any) => {
        const result = res.result ?? []
        if (item.checked) {
          // 父节点勾选，则默认勾选
          result.forEach((item) => {
            item.checked = true
          })
        }
        currentDepartUsers.value = result.sort((a, b) => a.sort - b.sort)
      })
  } else {
    // 没有子节点，则分页加载用户
    currentDepartTree.value = []
    currentDepartOrgCode.value = item.orgCode
    currentDepartHasChildren.value = false
    userPageNo.value = 1
    userTotal.value = 0
    currentDepartUsers.value = []
    loadUsersByPage(item.orgCode, 1, item.checked)
  }
}
// 分页加载用户
const loadUsersByPage = (orgCode: string, pageNo: number, parentChecked = false) => {
  userLoading.value = true
  getTableList({
    orgCode,
    pageNo,
    pageSize: userPageSize.value,
  })
    .then((res: any) => {
      userLoading.value = false
      if (res.success) {
        if (res?.result?.records) {
          let checked = true
          res.result.records.forEach((item) => {
            const findItem = selectedUsers.value.find((user) => user.id == item.id)
            if (findItem || parentChecked) {
              item.checked = true
            } else {
              item.checked = false
              checked = false
            }
          })
          const newRecords = res.result.records.sort((a, b) => a.sort - b.sort)
          if (pageNo === 1) {
            currentDepartUsers.value = newRecords
          } else {
            currentDepartUsers.value = [...currentDepartUsers.value, ...newRecords]
          }
          userTotal.value = res.result.total || 0
          userPageNo.value = pageNo
          if (currentDepartUsers.value.length >= userTotal.value) {
            currentDepartAllUsers.value = currentDepartUsers.value.every((item: any) => !!item.checked)
          } else {
            currentDepartAllUsers.value =
              checked && currentDepartUsers.value.every((item: any) => !!item.checked)
          }
        } else {
          toast.warning(res.message)
        }
      }
    })
    .catch(() => {
      userLoading.value = false
    })
}
// 加载更多用户
const loadMoreUsers = () => {
  if (userLoading.value || userFinished.value) return
  loadUsersByPage(currentDepartOrgCode.value, userPageNo.value + 1)
}
// 点击部门用户树复选框触发
const handleDepartUsersTreeCheck = (item, e?) => {
  if (e) {
    // 点击复选框时
    item.checked = e.value
  } else {
    // 点击整条数据时
    item.checked = !item.checked
  }
  if (item.checked) {
    addUsers(item)
  } else {
    selectedUsers.value = selectedUsers.value.filter((user) => user.id !== item.id)
  }
  if (item.checked == false) {
    // 有一个是false，则全选false
    currentDepartAllUsers.value = false
  }
}
// 全选
const handleAllUsers = (e) => {
  const { value: checked } = e
  if (checked) {
    currentDepartUsers.value.forEach((item: any) => (item.checked = true))
    addUsers(currentDepartUsers.value)
  } else {
    currentDepartUsers.value.forEach((item: any) => (item.checked = false))
    selectedUsers.value = selectedUsers.value.filter((user) => {
      const userId = user.id
      const findItem = currentDepartUsers.value.find((item: any) => item.id === userId)
      if (findItem) {
        return false
      } else {
        return true
      }
    })
  }
}
// 删除人员
const handleDelUser = (item) => {
  const findIndex = selectedUsers.value.findIndex((user) => user.id === item.id)
  if (findIndex != -1) {
    selectedUsers.value.splice(findIndex, 1)
  }
  const findItem: any = currentDepartUsers.value.find((user: any) => user.id === item.id)
  if (findItem) {
    findItem.checked = false
    currentDepartAllUsers.value = false
  }
}
// 点击搜索用户复选框
const handleSearchUserCheck = (item, e?) => {
  if (!e) {
    item.checked = !item.checked
  }
  if (item.checked) {
    addUsers(item)
  } else {
    selectedUsers.value = selectedUsers.value.filter((user) => user.id !== item.id)
  }
}
// 点击搜索部门复选框
const handleSearchDepartCheck = (e, item) => {
  handleDepartTreeCheck(e, item)
}
// 点击搜索部门
const handleSearchDepartClick = (item) => {
  searchResult.depart = []
  searchResult.user = []
  breadcrumb.value = getPathToNodeById(item.id)
  handleDepartTreeClick(item)
}
// 添加人员到右侧
const addUsers = (users) => {
  let newUsers: any = []
  if (isArray(users)) {
    // selectedUsers里面没有才添加（防止重复）
    newUsers = users.filter((user: any) => !selectedUsers.value.find((item) => item.id === user.id))
  } else {
    if (!selectedUsers.value.find((user) => user.id === users.id)) {
      // selectedUsers里面没有才添加（防止重复）
      newUsers = [users]
    }
  }
  selectedUsers.value = [...selectedUsers.value, ...newUsers]
  const result = currentDepartUsers.value.every((item: any) => !!item.checked)
  currentDepartAllUsers.value = result
}
// 解析参数
const parseParams = (params) => {
  return params
}
const getQueryTreeList = (params?) => {
  params = parseParams(params)
  queryTreeList({ ...params }).then((res: any) => {
    if (res.success) {
      departTree.value = res.result
      currentDepartTree.value = res.result
    } else {
      toast.warning(res.message)
    }
  })
}
// 根据部门id获取用户
const getTableList = (params) => {
  params = parseParams(params)
  return getTableListOrigin({ ...params })
}
const getUsersByDeptId = (orgCode: string) => {
  return new Promise<any[]>((resolve) => {
    if (cacheDepartUser[orgCode]) {
      resolve(cacheDepartUser[orgCode])
    } else {
      getTableList({
        orgCode,
      }).then((res: any) => {
        if (res.success) {
          cacheDepartUser[orgCode] = res?.result?.records ?? []
          if (res?.result?.records?.length) {
            resolve(res.result.records ?? [])
          }
        } else {
          toast.warning(res.message)
        }
      })
    }
  })
}
// 根据id获取根节点到当前节点路径
const getPathToNodeById = (id: string, tree = departTree.value, path = []): any[] => {
  for (const node of tree) {
    if ((node as any).id === id) {
      return [...path]
    }
    if ((node as any).children) {
      const foundPath = getPathToNodeById(id, (node as any).children, [...path, node])
      if (foundPath.length) {
        return foundPath
      }
    }
  }
  return []
}
// 根据id获取部门树父节点数据
const getDepartTreeParentById = (id: string, tree = departTree.value, parent = null): any => {
  for (const node of tree) {
    if ((node as any).id === id) {
      return parent
    }
    if ((node as any).children) {
      const found = getDepartTreeParentById(id, (node as any).children, node)
      if (found) {
        return found
      }
    }
  }
  return null
}
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
// 根据id获取部门树当前节点数据
const getDepartTreeNodeById = (id: string, tree = departTree.value): any => {
  for (const node of tree) {
    if ((node as any).id === id) {
      return node
    }
    if ((node as any).children) {
      const found = getDepartTreeNodeById(id, (node as any).children)
      if (found) {
        return found
      }
    }
  }
  return null
}
// 获取部门树列表
const queryTreeList = (params = {}) => {
  return http.get(api.queryTreeList, { ...params })
}
// 根据部门id获取用户列表（包含子孙部门）
const getTableListOrigin = (params = {}) => {
  return http.get(api.getTableList, { ...params })
}
// 获取部门名称（如果启用公司简称且公司简称不为空，则返回公司简称）
function getDepartName(departName, departNameAbbr) {
  if (props.useCompanyShortName && departNameAbbr) {
    return departNameAbbr
  }
  return departName
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
  position: relative;
  overflow: hidden;
  color: #555;
  :deep(.icon-arrow) {
    color: rgba(0, 0, 0, 0.25);
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
    .allChecked {
      padding: 0 16px;
      padding-bottom: 16px;
      padding-top: 12px;
      background-color: #fff;
      :deep(.ant-checkbox-wrapper) {
        font-size: 12px;
      }
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
      .depart-users-tree-item-name {
        margin-left: 8px;
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
      .load-more-btn {
        color: #1989fa;
        margin-left: 0;
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
</style>
