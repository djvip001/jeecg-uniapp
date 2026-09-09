<template>
  <template v-if="searchResult.post.length || searchResult.user.length">
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
      <template v-if="searchResult.post.length">
        <view class="search-depart solid-top">
          <text class="search-depart-title">岗位</text>
          <template v-for="item in searchResult.post" :key="item.id">
            <view class="search-depart-item solid-top">
              <view @click.stop>
                <wd-checkbox
                  shape="square"
                  v-model="item.checked"
                  @change="($event) => handlePostTreeCheck($event, item)"
                />
              </view>
              <view class="search-depart-item-name">
                {{ item.title }}
              </view>
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
        })),
      ]"
          @click="(item, index) => handleBreadcrumbClick(index === 0 ? undefined : item)"
      >
        <template #item-0>
          <wd-icon name="home" size="18px"></wd-icon>
        </template>
      </Breadcrumb>
    </view>
    <!-- 当前岗位的用户信息 -->
    <div v-if="currentOrgCode" class="group-users-wrap">
      <z-paging
          ref="paging"
          :fixed="false"
          v-model="currentUsers"
          @query="queryList"
          :default-page-size="100"
          :auto-init="true"
      >
        <template #default>
          <div class="group-users solid-top">
            <template v-for="item in currentUsers" :key="item.id">
              <div class="group-users-item solid-top">
                <view @click.stop>
                  <wd-checkbox
                      shape="square"
                      v-model="item.checked"
                      @change="($event) => handleUsersTreeCheck(item, $event)"
                  />
                </view>
                <div class="right">
                  <div class="group-users-item-circle">
                    <wd-img
                        width="36"
                        height="36px"
                        v-if="item.avatar"
                        :src="getFileAccessHttpUrl(item.avatar)"
                    />
                  </div>
                  <div class="group-users-item-name">
                    {{ item.realname }}
                  </div>
                </div>
              </div>
            </template>
          </div>
        </template>
      </z-paging>
    </div>
    <!-- 岗位信息 -->
    <div v-if="currentPostData.length" class="depart-tree">
      <template v-for="item in currentPostData" :key="item.id">
        <div class="depart-tree-item solid-top" @click="handleItemClick(item)">
          <view @click.stop>
            <wd-checkbox
                shape="square"
                v-model="item.checked"
                @change="($event) => handlePostTreeCheck($event, item)"
            />
          </view>
          <div class="depart-tree-item-name">
            {{ item.title }}
          </div>
          <wd-icon custom-class="icon-arrow" name="arrow-right" size="16px"></wd-icon>
        </div>
      </template>
    </div>
    <div v-if="postData.length === 0 && postData.length === 0" class="no-data">
      <wd-status-tip url-prefix="/static/wot-assets/" image="content" tip="暂无内容" />
    </div>
  </template>
</template>

<script lang="ts" setup>
import { ref, inject } from 'vue'
import { http } from '@/utils/http'
import { isArray } from '@/utils/is'
import { getFileAccessHttpUrl, uuid } from '@/common/uitls'
import { useToast } from 'wot-design-uni'
const selector = uuid()
const toast = useToast(selector)
const paging = ref(null)

const breadcrumb = ref<any[]>([])
const currentOrgCode = ref<string>('')
const currentPostData = ref<any>([])
const selectedUsers = inject('selectedUsers')
const searchResult = inject('searchResult')
const postData = inject('postData')
currentPostData.value = JSON.parse(JSON.stringify(postData.value))
const currentUsers = inject('currentUsers')
const currentAllUsers = inject('currentAllUsers')

// 根据部门id获取用户列表（包含子孙部门）
const getUserList = (params = {}) => {
  return http.get('/sys/user/queryDepartPostByOrgCode', { ...params })
}
// 点击岗位节点触发
const handleItemClick = (item) => {
  breadcrumb.value = [...breadcrumb.value, item]
  currentUsers.value = []
  currentOrgCode.value = item.orgCode
  if (item.children?.length) {
    currentPostData.value = item.children
  } else {
    // 没有子节点，则显示用户
    currentPostData.value = []
    getUserList({
      orgCode: item.orgCode,
    }).then((res: any) => {
      if (res.success) {
        if (res?.result.records) {
          let checked = true
          res.result.records.forEach((item) => {
            const findItem = selectedUsers.value.find((user) => user.id == item.id)
            if (findItem) {
              // 能在右侧找到说明选中了，左侧同样需要选中。
              item.checked = true
            } else {
              item.checked = false
              checked = false
            }
          })
          currentAllUsers.value = checked
          currentUsers.value = res.result.records.sort((a, b) => a.sort - b.sort)
          paging.value.complete(res.result.records)
        } else {
          toast.warning(res.message)
        }
      }
    })
  }
}
// 点击用户复选框触发
const queryList = (pageNo, pageSize) => {
  const pararms = { pageNo, pageSize, column: 'sort', order: 'asc', orgCode: currentOrgCode.value }
  getUserList(pararms).then((res: any) => {
    if (res.success) {
      if (res?.result.records) {
        let checked = true
        res.result.records.forEach((item) => {
          const findItem = selectedUsers.value.find((user) => user.id == item.id)
          if (findItem) {
            // 能在右侧找到说明选中了，左侧同样需要选中。
            item.checked = true
          } else {
            item.checked = false
            checked = false
          }
        })
        currentAllUsers.value = checked
        currentUsers.value = res.result.records.sort((a, b) => a.sort - b.sort)
        paging.value.complete(res.result.records ?? [])
      } else {
        paging.value.complete(false)
      }
    } else {
      paging.value.complete(false)
    }
  })
}
// 点击部门用户树复选框触发
const handleUsersTreeCheck = (item, e?) => {
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
// 根据id获取部门树当前节点数据
const getDepartTreeNodeById = (id: string, tree = postData.value): any => {
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
// 面包屑
const handleBreadcrumbClick = (item?) => {
  // 先清空
  currentUsers.value = []
  if (item) {
    const findIndex = breadcrumb.value.findIndex((o) => o.id === item.id)
    if (findIndex !== -1) {
      breadcrumb.value = breadcrumb.value.filter((item, index) => {
        console.log(item)
        return index <= findIndex
      })
    }
    const data = getDepartTreeNodeById(item.id, postData.value)
    currentPostData.value = data?.children || []
    currentOrgCode.value = data?.orgCode || ''
  } else {
    // 根节点
    currentPostData.value = postData.value
    breadcrumb.value = []
    currentOrgCode.value = ''
  }
}
// 部门树复选框
const checkedUserIds = ref([])
// 获取当前岗位直属人员（排除下级岗位人员）
const getDirectPostUsers = (records: any[] = [], postItem: any) => {
  if (!postItem?.children?.length) return records
  const childOrgCodes = new Set<string>()
  const childPostIds = new Set<string>()
  const walk = (node: any) => {
    node.children?.forEach((child: any) => {
      if (child.orgCode) childOrgCodes.add(child.orgCode)
      if (child.id) childPostIds.add(String(child.id))
      if (child.children?.length) walk(child)
    })
  }
  walk(postItem)
  return records.filter((user) => {
    if (user.mainDepPostId && childPostIds.has(String(user.mainDepPostId))) return false
    if (user.orgCode && childOrgCodes.has(user.orgCode)) return false
    return true
  })
}
const clearChildPostChecked = (node: any) => {
  if (!node?.children?.length) return
  node.children.forEach((child: any) => {
    child.checked = false
    const idx = checkedUserIds.value.indexOf(child.id)
    if (idx !== -1) checkedUserIds.value.splice(idx, 1)
    clearChildPostChecked(child)
  })
}
// 部门树点击复选框
const handlePostTreeCheck = ({ value }, item) => {
  item.checked = value
  const fullNode = getDepartTreeNodeById(item.id, postData.value) || item
  if (value) {
    clearChildPostChecked(fullNode)
    getUserList({ orgCode: item.orgCode, pageSize: 100 }).then((res) => {
      if (res.success) {
        const records = getDirectPostUsers(res.result.records ?? [], fullNode)
        addUsers(records)
        currentUsers.value.forEach((user: any) => {
          user.checked = !!selectedUsers.value.find((u) => u.id == user.id)
        })
      }
    })
    if (!checkedUserIds.value.includes(item.id)) {
      checkedUserIds.value.push(item.id)
    }
  } else {
    const findIndex = checkedUserIds.value.indexOf(item.id)
    if (findIndex !== -1) checkedUserIds.value.splice(findIndex, 1)
    getUserList({ orgCode: item.orgCode, pageSize: 100 }).then((res) => {
      if (res.success) {
        const records = getDirectPostUsers(res.result.records ?? [], fullNode)
        const removeIds = records.map((user) => user.id)
        selectedUsers.value = selectedUsers.value.filter((user) => !removeIds.includes(user.id))
        currentUsers.value.forEach((user: any) => {
          user.checked = !!selectedUsers.value.find((u) => u.id == user.id)
        })
      }
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
  .group-users-wrap {
    height: 100%;
    overflow: hidden;
  }
  .group-users {
    .allChecked {
      padding: 0 16px;
      padding-bottom: 16px;
      padding-top: 12px;
      background-color: #fff;
      :deep(.ant-checkbox-wrapper) {
        font-size: 12px;
      }
    }
    .group-users-item {
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
      .group-users-item-circle {
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
      .group-users-item-name {
        margin-left: 8px;
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
