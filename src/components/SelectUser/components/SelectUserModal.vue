<template>
  <wd-popup position="bottom" v-model="show">
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
              <wd-switch size="small" v-model="isUsernameSearch" />
              <wd-search
                hide-cancel
                :placeholder="search.placeholder"
                v-model="search.keyword"
                @search="handleSearch"
                @clear="handleClear"
              />
            </view>
          </template>
          <template v-if="multi">
            <wd-checkbox-group shape="square" v-model="checkedValue">
              <template v-for="(item, index) in dataList" :key="index">
                <view class="list" @click="hanldeCheck(index, item[rowKey])">
                  <view class="left text-gray-5">
                    <wd-img
                      custom-class="avatar"
                      radius="50%"
                      height="40"
                      width="40"
                      :src="getAvatar(item.avatar)"
                    ></wd-img>
                    <view class="subContent">
                      <view class="user-title">
                        <text class="realname">{{ item.realname }}</text>
                        <text class="username">账号：{{ item.username }}</text>
                      </view>
                      <text v-if="item.orgCodeTxt" class="department">
                        部门：{{ item.orgCodeTxt }}
                      </text>
                    </view>
                  </view>
                  <view class="right" @click.stop>
                    <wd-checkbox
                      ref="checkboxRef"
                      :disabled="readonlyUser.includes(item[rowKey])"
                      :modelValue="item[rowKey]"
                    ></wd-checkbox>
                  </view>
                </view>
              </template>
            </wd-checkbox-group>
          </template>
          <template v-else>
            <wd-radio-group shape="dot" v-model="checkedValue">
              <template v-for="(item, index) in dataList" :key="index">
                <wd-cell>
                  <view class="list" @click="hanldeCheck(index, item[rowKey])">
                    <view class="left text-gray-5">
                      <wd-img
                        custom-class="avatar"
                        radius="50%"
                        height="40"
                        width="40"
                        :src="getAvatar(item.avatar)"
                      ></wd-img>
                      <view class="subContent">
                        <view class="user-title">
                          <text class="realname">{{ item.realname }}</text>
                          <text class="username">账号：{{ item.username }}</text>
                        </view>
                        <text v-if="item.orgCodeTxt" class="department">
                          部门：{{ item.orgCodeTxt }}
                        </text>
                      </view>
                    </view>
                    <view class="right" @click.stop>
                      <wd-radio :value="item[rowKey]"></wd-radio>
                    </view>
                  </view>
                </wd-cell>
              </template>
            </wd-radio-group>
          </template>
        </z-paging>
      </view>
    </PageLayout>
  </wd-popup>
</template>

<script setup lang="ts">
import { ref, reactive, nextTick } from 'vue'
import { useToast, useMessage, useNotify, dayjs } from 'wot-design-uni'
import { http } from '@/utils/http'
import { isArray, isString } from '@/utils/is'
import { cache, getFileAccessHttpUrl } from '@/common/uitls'
import defaultAvatar from '@/static/default-avatar.png'
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
  // 这是用户id
  selected: {
    type: [Array, String],
    default: '',
  },
  // 这是用户id（只是默认勾选，在弹窗中勾选）
  defaultSelectedValue: {
    type: [Array, String],
    default: '',
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
  // 只读用户
  readonlyUser: {
    type: Array,
    default: [],
  },
  userlistUrl: {
    type: String,
    default: '/sys/user/list',
  },
  showIds: {
    type: String,
    default: '',
  },
})
const emit = defineEmits(['change', 'close'])
const toast = useToast()
const show = ref(true)
const isUsernameSearch = ref(true)
const api = {
  userlist: props.userlistUrl,
}
const paging = ref(null)
const dataList = ref([])
const allDataList = ref([])
const checkedValue: any = ref(props.multi ? [] : '')
const checkboxRef = ref(null)
const search = reactive({
  keyword: '',
  placeholder: '输入姓名可搜索',
  field: 'realname',
})

const handleClose = () => {
  setTimeout(() => {
    emit('close')
  }, 400)
}
const handleConfirm = () => {
  if (checkedValue.value.length == 0) {
    toast.warning('还没选择用户~')
    return
  }
  const result = []
  let value = checkedValue.value
  if (!Array.isArray(checkedValue.value)) {
    value = [checkedValue.value]
  }
  value.forEach((rowKey, index) => {
    const findIndex = allDataList.value.findIndex((item) => item[props.rowKey] === rowKey)
    if (findIndex == -1) {
      // 传进来选中的用户可能在第二页（还没加载进来）
      const index = props.selectedUser.findIndex((item) => item[props.rowKey] === rowKey)
      if (index != -1) {
        result.push(props.selectedUser[index])
      } else {
        // 传进来defaultSelectedValue的用户可能在第二页（还没加载进来）
        if (isArray(props.defaultSelectedValue)) {
          const index = props.defaultSelectedValue.findIndex((item) => item === rowKey)
          index != -1 && result.push({ [props.rowKey]: props.defaultSelectedValue[index] })
        } else {
          props.defaultSelectedValue == rowKey && result.push({ [props.rowKey]: rowKey })
        }
      }
    } else {
      result.push(allDataList.value[findIndex])
    }
  })
  show.value = false
  emit('change', result)
  handleClose()
}
const handleCancel = () => {
  show.value = false
  handleClose()
  console.log('取消了~')
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
const hanldeCheck = (index, username) => {
  if (props.multi) {
    if (Array.isArray(checkboxRef.value)) {
      checkboxRef.value[index].toggle()
      nextTick(() => {
        if (props.maxSelectCount) {
          if (checkedValue.value.length > props.maxSelectCount) {
            toast.warning(`最多可选择${props.maxSelectCount}个用户`)
            // 超过个数取消
            checkboxRef.value[index].toggle()
          }
        }
      })
    }
  } else {
    checkedValue.value = username
  }
}

const getAvatar = (url) => {
  let result = getFileAccessHttpUrl(url)
  if (result.length) {
    return result
  } else {
    return defaultAvatar
  }
}

const queryList = (pageNo, pageSize) => {
  const pararms = { pageNo, pageSize }
  if (search.keyword) {
    pararms[search.field] = `*${search.keyword}*`
  }
  if (props.showIds) {
    pararms.id = props.showIds
    pararms.isMultiTranslate = true
  }
  http
    .get(`${api.userlist}`, pararms)
    .then((res: any) => {
      if (res.success && res.result.records) {
        if (allDataList.value.length === 0) {
          allDataList.value = res.result.records ?? []
        } else {
          res.result.records.forEach((item) => {
            const hasData = allDataList.value.some((a) => a.username === item.username)
            !hasData && allDataList.value.push(item)
          })
        }
        paging.value.complete(res.result.records ?? [])
      } else {
        paging.value.complete(false)
      }
    })
    .catch((err) => {})
}
watch(
  () => isUsernameSearch.value,
  () => {
    if (isUsernameSearch.value) {
      search.field = 'realname'
      search.placeholder = '输入姓名可搜索'
    } else {
      search.field = 'username'
      search.placeholder = '输入账号可搜索'
    }
  },
  { immediate: true },
)
const init = () => {
  allDataList.value = []
  if (props.selected && props.selected.length) {
    if (props.multi) {
      if (isArray(props.selected)) {
        checkedValue.value = props.selected
      } else if (isString(props.selected)) {
        checkedValue.value = props.selected.split(',')
      }
    } else {
      if (isString(props.selected)) {
        checkedValue.value = props.selected
      } else if (isArray(props.selected)) {
        checkedValue.value = props.selected.join(',')
      }
    }
  } else {
    if (props.defaultSelectedValue.length) {
      if (props.multi) {
        if (isArray(props.defaultSelectedValue)) {
          checkedValue.value = props.defaultSelectedValue
        } else if (isString(props.defaultSelectedValue)) {
          checkedValue.value = props.defaultSelectedValue.split(',')
        }
      } else {
        if (isString(props.defaultSelectedValue)) {
          checkedValue.value = props.defaultSelectedValue
        } else if (isArray(props.defaultSelectedValue)) {
          checkedValue.value = props.defaultSelectedValue.join(',')
        }
      }
    }
  }
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
:deep(.wd-cell) {
  --wot-color-white: tranparent;
  --wot-cell-padding: 0;
  .wd-cell__wrapper {
    --wot-cell-wrapper-padding: 0;
  }
  .wd-cell__left {
    display: none;
  }
}
:deep(.wd-checkbox-group) {
  --wot-checkbox-bg: tranparent;
}
:deep(.wd-radio-group) {
  --wot-radio-bg: tranparent;
}
.list {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  padding: 12px;
  margin: 10px 12px 0;
  border: 1px solid #eeeeee;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 3%);
  .left {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    text-align: left;
    :deep(.avatar) {
      flex-shrink: 0;
      margin-right: 12px;
      background-color: #e9e9e9;
    }
    .subContent {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 5px;
      .user-title {
        display: flex;
        align-items: baseline;
        min-width: 0;
        .realname {
          flex-shrink: 0;
          color: #667085;
          font-size: 15px;
          font-weight: 400;
        }
        .username {
          overflow: hidden;
          margin-left: 10px;
          color: #a0a7b2;
          font-size: 12px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
      .department {
        overflow: hidden;
        color: #8a94a3;
        font-size: 12px;
        line-height: 18px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }
  .right {
    flex-shrink: 0;
    margin-left: 12px;
    :deep(.wd-checkbox) {
      margin-bottom: 0;
    }
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
</style>
