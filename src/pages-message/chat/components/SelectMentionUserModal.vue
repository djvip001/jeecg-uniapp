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
              <!-- grouped switch + label for better UX: clickable and styled -->
              <view
                class="all-toggle"
                :class="{ active: isAll }"
                role="button"
                tabindex="0"
                :aria-pressed="isAll"
                @click="isAll = !isAll"
                @keydown.enter="isAll = !isAll"
                @keydown.space.prevent="isAll = !isAll"
              >
                <wd-switch size="small" v-model="isAll" @click="isAll = !isAll" />
                <text class="all-text">所有人</text>
              </view>
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
                      <text>账号：{{ item.username }}</text>
                      <text>姓名：{{ item.realname }}</text>
                    </view>
                  </view>
                  <view class="right" @click.stop>
                    <wd-checkbox
                      ref="checkboxRef"
                      :disabled="readonlyUser.includes(item[rowKey]) || isAll"
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
                        <text>账号：{{ item.username }}</text>
                        <text>姓名：{{ item.realname }}</text>
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
import { ref, reactive, nextTick, watch } from 'vue'
import { useToast } from 'wot-design-uni'
import { http } from '@/utils/http'
import { isArray, isString } from '@/utils/is'
import { getFileAccessHttpUrl } from '@/common/uitls'
import defaultAvatar from '@/static/default-avatar.png'
defineOptions({
  name: 'SelectMentionUserModal',
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
    default: () => [],
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
const isAll = ref(false)
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
//
watch(
  () => isAll.value,
  () => {
    checkedValue.value = isAll.value ? allDataList.value.map((item) => item[props.rowKey]) : []
  },
  { immediate: true },
)
const handleClose = () => {
  setTimeout(() => {
    emit('close')
  }, 400)
}
const handleConfirm = () => {
  if (checkedValue.value.length === 0) {
    toast.warning('还没选择用户~')
    return
  }
  const result = []
  let value = checkedValue.value
  if (!Array.isArray(checkedValue.value)) {
    value = [checkedValue.value]
  }
  value.forEach((rowKey) => {
    const findIndex = allDataList.value.findIndex((item) => item[props.rowKey] === rowKey)
    if (findIndex === -1) {
      // 传进来选中的用户可能在第二页（还没加载进来）
      const index = props.selectedUser.findIndex((item) => item[props.rowKey] === rowKey)
      if (index !== -1) {
        result.push(props.selectedUser[index])
      } else {
        // 传进来defaultSelectedValue的用户可能在第二页（还没加载进来）
        if (isArray(props.defaultSelectedValue)) {
          const index = props.defaultSelectedValue.findIndex((item) => item === rowKey)
          index !== -1 && result.push({ [props.rowKey]: props.defaultSelectedValue[index] })
        } else {
          props.defaultSelectedValue === rowKey && result.push({ [props.rowKey]: rowKey })
        }
      }
    } else {
      result.push(allDataList.value[findIndex])
    }
  })
  show.value = false
  emit('change', result,isAll.value)
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
  const result = getFileAccessHttpUrl(url)
  if (result.length) {
    return result
  } else {
    return defaultAvatar
  }
}

const queryList = (pageNo, pageSize) => {
  const pararms: any = { pageNo, pageSize, column: 'sort', order: 'asc' }
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
    .catch(() => {})
}

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
  /* ensure items don't wrap awkwardly on small screens */
  gap: 8px;
}
/* Styled container for the switch + label */
.all-toggle {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 20px;
  background: #f6f8fa; /* subtle neutral background */
  cursor: pointer;
  transition-property: background-color, box-shadow;
  transition-duration: 0.18s;
  transition-timing-function: ease;
}
.all-toggle:hover {
  background: #eef6ff;
}
.all-toggle.active {
  background: #e6f7ff; /* active tint */
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
.all-text {
  margin-left: 8px;
  font-size: 14px;
  color: #2a2a2a;
  user-select: none;
}

:deep(.wd-switch) {
  /* scale the internal switch a bit for visual balance */
  transform: scale(0.92);
  transform-origin: left center;
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
  padding: 16px;
  margin-top: 16px;
  .left {
    display: flex;
    align-items: center;
    text-align: left;
    :deep(.avatar) {
      margin-right: 8px;
      background-color: #e9e9e9;
    }
    .subContent {
      display: flex;
      flex-direction: column;
    }
  }
  .right {
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
