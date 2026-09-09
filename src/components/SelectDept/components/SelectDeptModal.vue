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
  <wd-popup position="bottom" v-model="show">
    <PageLayout navTitle="选择部门" type="popup" @navBack="handleCancel">
      <view class="wrap">
        <view class="main-content">
          <scroll-view scroll-y>
            <template v-if="breadcrumb.length">
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
            </template>
            <div v-if="currentDepartTree.length" class="depart-tree">
              <template v-for="item in currentDepartTree" :key="item.id">
                <div class="depart-tree-item solid-top" @click="handleDepartTreeClick(item)">
                  <view class="choose-box" @click.stop>
                    <wd-checkbox
                      :shape="multiple ? 'square' : 'circle'"
                      v-model="item.checked"
                      @change="($event) => handleDepartTreeCheck(item, $event)"
                    />
                  </view>
                  <div class="depart-tree-item-name">
                    {{ getDepartName(item.departName, item.departNameAbbr) }}
                  </div>
                  <wd-icon custom-class="icon-arrow" name="arrow-right" size="16px"></wd-icon>
                </div>
              </template>
            </div>
            <div v-if="currentDepartTree.length === 0" class="no-data">
              <wd-status-tip url-prefix="/static/wot-assets/" image="content" tip="暂无内容" />
            </div>
            <view v-if="showSelectedDepart" class="selected-depart">
              <SelectedDepart
                :selectedDeparts="selectedDeparts"
                :isCustomRenderTag="isCustomRenderTag"
                @del="handleDelDepart"
              ></SelectedDepart>
            </view>
          </scroll-view>
        </view>
        <view class="wrap-footer">
          <view class="text" @click="() => (showSelectedDepart = !showSelectedDepart)">
            <view>已选</view>
            <view class="num">{{ selectedDeparts.length }}</view>
            <view>部门</view>
            <text class="tip">(查看选中部门)</text>
          </view>
          <wd-button type="primary" @click="handleConfirm">确定</wd-button>
        </view>
      </view>
      <wd-toast :selector="toastSelector" />
    </PageLayout>
  </wd-popup>
</template>

<script lang="ts" setup>
import { ref, reactive } from 'vue'
import { onShow, onHide, onLoad, onReady } from '@dcloudio/uni-app'
import { useMessage, useToast } from 'wot-design-uni'
import { useRouter } from '@/plugin/uni-mini-router'
import { useUserStore } from '@/store/user'
import { http } from '@/utils/http'
import { useParamsStore } from '@/store/page-params'
import SelectedDepart from './SelectedDepart.vue'
import { uuid } from '@/common/uitls'

defineOptions({
  name: 'SelectDeptModal',
  options: {
    styleIsolation: '‌shared‌',
  },
})
const props = defineProps({
  modelValue: {
    type: [Array],
  },
  // 是否支持多选
  multiple: {
    type: Boolean,
    default: false,
  },
  rowKey: {
    type: String,
    default: 'key',
  },
  labelKey: {
    type: String,
    default: 'title',
  },
  disabled: {
    type: Boolean,
    required: false,
    default: false,
  },
  // 是否启用公司简称
  useCompanyShortName: {
    type: Boolean,
    default: true,
  },
  // 是否显示全路径部门名称（取这个props名是为了和pc保持一致）
  isCustomRenderTag: {
    type: Boolean,
    default: true,
  },
})
const emit = defineEmits(['change', 'close'])
const api = {
  loadDictItem: '/sys/category/loadDictItem/',
  queryDepartTreeSync: '/sys/sysDepart/queryDepartTreeSync',
}
const toastSelector = uuid()
const toast = useToast(toastSelector)
const show = ref(true)
const treeData = ref<any[]>([])
// 当前部门树
const currentDepartTree = ref<any[]>([])
// 已选部门
const selectedDeparts = ref<any[]>([])
// 是否显示已选部门
const showSelectedDepart = ref(false)
// 面包屑
const breadcrumb = ref<any[]>([])
if (props.modelValue) {
  selectedDeparts.value = props.modelValue
}
// 面包屑
const handleBreadcrumbClick = (item) => {
  // 先清空
  if (item) {
    const findIndex = breadcrumb.value.findIndex((o) => o.id === item.id)
    if (findIndex != -1) {
      breadcrumb.value = breadcrumb.value.filter((item, index) => {
        return index <= findIndex
      })
    }
    handleDepartTreeClick(item)
  } else {
    // 根节点
    loadRoot()
    breadcrumb.value = []
  }
}
// 部门树节点勾选
const handleDepartTreeCheck = (item, e) => {
  if (e.value) {
    if (props.isCustomRenderTag) {
      const prefix = breadcrumb.value
        .map((o) => {
          if (props.useCompanyShortName && o.departNameAbbr) {
            return o.departNameAbbr
          }
          return o.departName
        })
        .join('/')
      if (prefix) {
        item.fillPath = prefix + '/' + item.departName
      } else {
        item.fillPath = item.departName
      }
    }
    // 勾选
    if (props.multiple) {
      selectedDeparts.value.push(item)
    } else {
      selectedDeparts.value = [item]
      currentDepartTree.value.forEach((o) => {
        if (o.id !== item.id) {
          o.checked = false
        }
      })
    }
  } else {
    // 取消勾选
    const findIndex = selectedDeparts.value.findIndex((user) => user.id === item.id)
    if (findIndex != -1) {
      selectedDeparts.value.splice(findIndex, 1)
    }
  }
}
// 删除人员
const handleDelDepart = (item) => {
  const findIndex = selectedDeparts.value.findIndex((user) => user.id === item.id)
  if (findIndex != -1) {
    selectedDeparts.value.splice(findIndex, 1)
  }
  const findItem: any = currentDepartTree.value.find((user: any) => user.id === item.id)
  if (findItem) {
    findItem.checked = false
  }
}
// 点击部门树节点触发
const handleDepartTreeClick = (item) => {
  if (item.isLeaf === true) {
    // 叶子节点
    toast.show('该部门下无子部门')
    return
  }
  let param = {
    pid: item.id,
    primaryKey: props.rowKey,
  }
  http
    .get(api.queryDepartTreeSync, param)
    .then((res: any) => {
      if (res.success) {
        const { result } = res
        isSelected(result)
        currentDepartTree.value = result
        if (!breadcrumb.value.find((o) => o.id === item.id)) {
          breadcrumb.value.push(item)
        }
      } else {
        currentDepartTree.value = []
      }
    })
    .catch((err) => {
      currentDepartTree.value = []
    })
}
// 加载根节点
function loadRoot() {
  let param = {
    primaryKey: props.rowKey,
  }
  http
    .get(api.queryDepartTreeSync, param)
    .then((res: any) => {
      if (res.success) {
        const { result } = res
        if (result && result.length > 0) {
          isSelected(result)
          treeData.value = result
          currentDepartTree.value = result
        }
      } else {
        console.error('部门组件加载根节点数据失败~')
      }
    })
    .catch((err) => {
      console.error('部门组件加载根节点数据失败~')
    })
}
// 获取部门名称（如果启用公司简称且公司简称不为空，则返回公司简称）
function getDepartName(departName, departNameAbbr) {
  if (props.useCompanyShortName && departNameAbbr) {
    return departNameAbbr
  }
  return departName
}
const handleClose = () => {
  setTimeout(() => {
    emit('close')
  }, 400)
}
// 查看是否选中
const isSelected = (data) => {
  if (selectedDeparts.value) {
    data.forEach((item) => {
      if (selectedDeparts.value.find((o: any) => o.id === item.id)) {
        item.checked = true
      }
    })
  }
}
// 返回
const handleCancel = () => {
  show.value = false
  handleClose()
}
// 确定
const handleConfirm = () => {
  if (selectedDeparts.value.length > 0) {
    emit('change', selectedDeparts.value)
  } else {
    toast.show('请选择部门')
  }
}
loadRoot()
</script>

<style lang="scss" scoped>
.wrap {
  height: 100%;
  display: flex;
  flex-direction: column;
  .main-content {
    flex: 1;
    overflow: hidden;
  }

  .depart-tree {
    .depart-tree-item {
      background-color: #fff;
      padding: 0 16px;
      padding-left: 0px;
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
      margin-left: 0px;
      color: #555;
    }
    .choose-box {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 0 0 0 16px;
      height: 50px;
    }
    :deep(.icon-arrow) {
      color: rgba(0, 0, 0, 0.25);
    }
  }
  .selected-depart {
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
</style>
