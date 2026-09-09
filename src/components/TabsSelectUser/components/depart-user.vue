<template>
  <template v-if="searchResult.depart.length || searchResult.user.length">
    <view class="search-result">
      <template v-if="searchResult.user.length">
        <view class="search-user solid-top">
          <text class="search-user-title">人员</text>
          <template v-for="item in searchResult.user" :key="item.id">
            <view class="search-user-item solid-top" @click="handleSearchUserCheck(item)">
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
                  <view class="search-user-item-name">
                    {{ item.realname }}
                  </view>
                  <view class="search-user-item-org">
                    {{ item.orgCodeTxt }}
                  </view>
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
            <view class="search-depart-item solid-top" @click="handleSearchDepartClick(item)">
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
          ...breadcrumb.map((item) => ({
            ...item,
            title: getDepartName(item.departName, item.departNameAbbr),
          })),
        ]"
        @click="(item, index) => handleBreadcrumbClick(index === 0 ? undefined : item)"
      >
        <template #item-0>
          <wd-icon name="home" size="18px"></wd-icon>
        </template>
      </Breadcrumb>
    </view>
    <div v-if="currentUsers.length">
      <!-- 当前部门用户树 -->
      <div class="depart-users-tree solid-top">
        <div v-if="!currentDepartTree.length" class="allChecked">
          <wd-checkbox shape="square" v-model="currentAllUsers" @change="handleAllUsers">
            全选
          </wd-checkbox>
        </div>
        <template v-for="item in currentUsers" :key="item.id">
          <div class="depart-users-tree-item solid-top" @click="handleDepartUsersTreeCheck(item)">
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
              <div class="depart-users-tree-item-name">
                {{ item.realname }}
              </div>
            </div>
          </div>
        </template>
        <!-- 分页加载更多 -->
        <div
          v-if="!currentDepartHasChildren && currentUsers.length > 0"
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
    <div v-if="currentDepartTree.length === 0 && currentUsers.length === 0" class="no-data">
      <wd-status-tip url-prefix="/static/wot-assets/" image="content" tip="暂无内容" />
    </div>
  </template>
</template>

<script lang="ts" setup>
import { ref, inject, computed } from 'vue'
import { http } from '@/utils/http'
import { isArray } from '@/utils/is'
import { getFileAccessHttpUrl, uuid } from '@/common/uitls'
import { useToast } from 'wot-design-uni'
const selector = uuid()
const toast = useToast(selector)
const breadcrumb = ref<any[]>([])
// 选中的部门节点
const searchResult = inject('searchResult')
const currentUsers = inject('currentUsers')
const currentAllUsers = inject('currentAllUsers')

const checkedDepartIds = ref<string[]>([])
const selectedUsers = inject('selectedUsers')

// 分页相关状态
const userPageNo = ref(1)
const userPageSize = ref(10)
const userTotal = ref(0)
const userLoading = ref(false)
const userFinished = computed(() => currentUsers.value.length >= userTotal.value)
// 当前部门id（用于分页加载）
const currentDepartId = ref('')
// 当前部门是否有子节点（有子节点时不分页）
const currentDepartHasChildren = ref(false)
const currentDepartTree = inject('currentDepartTree')
const departTree = inject('departTree')
// 映射部门和人员的关系
const cacheDepartUser = {}
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
    currentAllUsers.value = false
  }
}
// 解析参数
const parseParams = (params) => {
  return params
}
// 全选
const handleAllUsers = (e) => {
  const { value: checked } = e
  if (checked) {
    currentUsers.value.forEach((item: any) => (item.checked = true))
    addUsers(currentUsers.value)
  } else {
    currentUsers.value.forEach((item: any) => (item.checked = false))
    selectedUsers.value = selectedUsers.value.filter((user) => {
      const userId = user.id
      const findItem = currentUsers.value.find((item: any) => item.id === userId)
      if (findItem) {
        return false
      } else {
        return true
      }
    })
  }
}
// 面包屑
const handleBreadcrumbClick = (item?) => {
  // 先清空
  currentUsers.value = []
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
  const result = currentUsers.value.every((item: any) => !!item.checked)
  currentAllUsers.value = result
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
// 根据部门id获取用户列表（包含子孙部门）
const getTableListOrigin = (params = {}) => {
  return http.get('/sys/user/queryDepartPostByOrgCode', { ...params })
}
// 根据部门id获取用户
const getTableList = (params) => {
  params = parseParams(params)
  return getTableListOrigin({ ...params })
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
            currentUsers.value = newRecords
          } else {
            currentUsers.value = [...currentUsers.value, ...newRecords]
          }
          userTotal.value = res.result.total || 0
          userPageNo.value = pageNo
          // 只有全部加载完才判断全选
          if (currentUsers.value.length >= userTotal.value) {
            currentAllUsers.value = currentUsers.value.every((item: any) => !!item.checked)
          } else {
            currentAllUsers.value =
              checked && currentUsers.value.every((item: any) => !!item.checked)
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
  loadUsersByPage(currentDepartId.value, userPageNo.value + 1)
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
      .get('/sys/user/queryDepartPostByOrgCode', {
        orgCode: item.orgCode,
        column: 'createTime',
        order: 'desc',
        pageNo: 1,
        pageSize: 10,
      })
      .then((res: any) => {
        const result = res.result?.records ?? []
        result.forEach((user) => {
          const findItem = selectedUsers.value.find((u) => u.id == user.id)
          user.checked = !!findItem || !!item.checked
        })
        currentAllUsers.value = result.length > 0 && result.every((user) => user.checked)
        currentUsers.value = result.sort((a, b) => a.sort - b.sort)
      })
  } else {
    // 没有子节点，则显示用户（分页加载）
    currentDepartTree.value = []
    currentDepartId.value = item.orgCode
    currentDepartHasChildren.value = false
    userPageNo.value = 1
    userTotal.value = 0
    currentUsers.value = []
    loadUsersByPage(item.orgCode, 1, item.checked)
  }
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

// 获取部门名称（如果启用公司简称且公司简称不为空，则返回公司简称）
function getDepartName(departName, departNameAbbr) {
  return departNameAbbr || departName
}
</script>

<style lang="scss" scoped>
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
</style>
