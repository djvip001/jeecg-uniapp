<template>
  <template v-if="searchResult.group.length || searchResult.user.length">
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
      <template v-if="searchResult.group.length">
        <view class="search-depart solid-top">
          <text class="search-depart-title">用户组</text>
          <template v-for="item in searchResult.group" :key="item.id">
            <view class="search-depart-item solid-top">
              <view @click.stop>
                <wd-checkbox
                    shape="square"
                    v-model="item.checked"
                    @change="($event) => handleGroupTreeCheck($event, item)"
                />
              </view>
              <view class="search-depart-item-name">
                {{ item.groupName }}
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
            title: item.groupName,
          })),
        ]"
        @click="handleBreadcrumbClick"
      >
        <template #item-0>
          <wd-icon name="home" size="18px"></wd-icon>
        </template>
      </Breadcrumb>
    </view>
    <!-- 当前用户组的用户信息 -->
    <div v-if="currentGroupId" class="group-users-wrap">
      <z-paging
        ref="paging"
        :fixed="false"
        v-model="currentUsers"
        @query="queryList"
        :default-page-size="15"
        :auto-init="true"
      >
        <template #default>
          <div class="group-users solid-top">
            <!--          <div v-if="!groupData.length" class="allChecked">-->
            <!--            <wd-checkbox shape="square" v-model="currentAllUsers">全选</wd-checkbox>-->
            <!--          </div>-->
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
    <!-- 用户组信息 -->
    <div v-if="groupData.length && !currentGroupId" class="depart-tree">
      <template v-for="item in groupData" :key="item.id">
        <div class="depart-tree-item solid-top" @click="handleItemClick(item)">
          <view @click.stop>
            <wd-checkbox
              shape="square"
              v-model="item.checked"
              @change="($event) => handleGroupTreeCheck($event, item)"
            />
          </view>
          <div class="depart-tree-item-name">
            {{ item.groupName }}
          </div>
          <wd-icon custom-class="icon-arrow" name="arrow-right" size="16px"></wd-icon>
        </div>
      </template>
    </div>
    <div v-if="groupData.length === 0 && groupData.length === 0" class="no-data">
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
const currentGroupId = ref<string>('')
const selectedUsers = inject('selectedUsers')
const searchResult = inject('searchResult')
const groupData = inject('groupData')
const currentUsers = inject('currentUsers')
const currentAllUsers = inject('currentAllUsers')

// 根据部门id获取用户列表（包含子孙部门）
const getUserList = (params = {}) => {
  return http.get('/sys/user/groupUserList', { ...params })
}
// 点击用户组节点触发
const handleItemClick = (item) => {
  const has = breadcrumb.value.some((crumb) => crumb.id == item.id)
  if (has) return
  breadcrumb.value = [...breadcrumb.value, item]
  currentGroupId.value = item.id
}
// 点击用户复选框触发
const queryList = (pageNo, pageSize) => {
  const pararms = { pageNo, pageSize, column: 'sort', order: 'asc', groupId: currentGroupId.value }
  // if (search.keyword) {
  //   pararms[search.field] = `*${search.keyword}*`
  // }
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
        console.log('currentUsers.value', currentUsers.value)
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
// 面包屑
const handleBreadcrumbClick = () => {
  breadcrumb.value = []
  currentGroupId.value = ''
  currentUsers.value = []
}
// 点击用户组复选框触发
const checkedUserIds = ref<any[]>([])
const handleGroupTreeCheck = ({ value }, item) => {
  const target = { checked: value }
  if (target.checked) {
    // 选中
    getUserList({ groupId: item.id, pageSize: 100 }).then((res) => {
      if (res.success) {
        const records = res.result.records ?? [];
        addUsers(records)
      }
    })
    checkedUserIds.value.push((item as any).id)
  } else {
    // 取消选中
    const findIndex = checkedUserIds.value.findIndex((o: any) => o.id === item.id)
    if (findIndex != -1) {
      checkedUserIds.value.splice(findIndex, 1)
    }
    getUserList({ groupId: item.id, pageSize: 100 }).then((res) => {
      if (res.success) {
        const records = res.result.records ?? [];
        // 取消选中，则取消选中的组下的所有用户
        records.forEach((item) => {
          const findIndex = selectedUsers.value.findIndex((user) => user.id === item.id)
          if (findIndex != -1) {
            selectedUsers.value.splice(findIndex, 1)
          }
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
