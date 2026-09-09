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
  <PageLayout
    navTitle="部门切换"
    backRouteName="people"
    routeMethod="pushTab"
    navRightTextMp="切换"
    @navRightMp="() => (typeFilter.show = true)"
  >
    <template #navRight>
      <view
        v-if="false"
        class="cuIcon-order font-size-20px color-white"
        @click="() => (typeFilter.show = true)"
      ></view>
    </template>
    <rightTypeChange
      v-if="typeFilter.show"
      :type="currentType"
      @close="() => (typeFilter.show = false)"
      @change="handleFilterChange"
    ></rightTypeChange>

    <scroll-view scroll-y="true" style="height: 85vh">
      <view v-if="isSwitchDataLoaded && !isMultiDepart" class="empty-tip">
        当前没有可切换的部门
      </view>
      <template v-if="isMultiTenant && currentType == 'tenant'">
        <view class="cu-title">加入的团队</view>
        <view
          class="cu-card bg-white margin-top"
          :key="index"
          :class="{ 'selected-card': model.tenantId === item.value }"
          v-for="(item, index) in tenantColumns"
          @click="
            () => {
              model.tenantId = item.value
              handleSubmit()
            }
          "
        >
          <!-- 选中标记 -->
          <view v-if="model.tenantId === item.value" class="selected-corner"></view>
          <!-- 卡片内容 -->
          <view class="padding" style="min-height: 100px">
            <!-- 标题 -->
            <view class="flex justify-between">
              <view class="text-df text-bold">{{ item.label }}</view>
            </view>
            <!-- 组织信息 -->
            <view class="solid-top margin-tb"></view>
            <view class="text-sm text-gray padding-top">组织门牌号：{{ item.houseNumber }}</view>
            <view class="text-sm text-gray margin-top-sm">创建人：{{ item.createBy }}</view>
          </view>
        </view>
      </template>
      <template v-if="isMultiDepart && currentType == 'depart'">
        <view class="cu-title">部门管理</view>
        <view
          class="cu-card bg-white margin-top"
          :key="index"
          :class="{ 'selected-card': model.departId === item.value }"
          v-for="(item, index) in deptColumns"
          @click="
            () => {
              model.departId = item.value
              handleSubmit()
            }
          "
        >
          <!-- 选中标记 -->
          <view v-if="model.departId === item.value" class="selected-corner"></view>
          <!-- 卡片内容 -->
          <view class="padding" style="min-height: 100px">
            <!-- 标题 -->
            <view class="flex justify-between">
              <view class="text-df text-bold">{{ getShortDeptName(item) }}</view>
            </view>
            <!-- 组织信息 -->
            <view class="solid-top margin-tb"></view>
            <view class="text-sm text-gray padding-top">部门编码：{{ item.orgCode }}</view>
            <view class="text-sm text-gray margin-top-sm">创建时间：{{ item.createTime }}</view>
          </view>
        </view>
      </template>
    </scroll-view>
  </PageLayout>
</template>

<script lang="ts" setup>
import { http } from '@/utils/http'
import { useToast } from 'wot-design-uni'
import { useUserStore } from '@/store/user'
import rightTypeChange from './rightTypeChange.vue'
defineOptions({
  name: 'organization',
  options: {
    styleIsolation: 'shared',
  },
})
const toast = useToast()
const userStore = useUserStore()

const typeFilter = reactive({ show: false })
const currentType = ref('depart')

const isMultiTenant = ref(false)
const tenantColumns = ref([])

const isMultiDepart = ref(false)
const deptColumns = ref([])
const isSwitchDataLoaded = ref(false)

const model = ref({
  tenantId: 0,
  departId: '',
})

const handleFilterChange = (flag) => {
  currentType.value = flag
}
// 获取部门缩写
const getShortDeptName = computed(() => {
  return (depart) => {
    const deptName = depart.departNameAbbr || depart.departPathName || depart.departName
    if (deptName.length > 22) {
      return '...' + deptName.substring(deptName.length - 22, deptName.length)
    }
    return deptName
  }
})
/**
 *加载部门信息
 */
async function loadDepartList() {
  const res: any = await http.get('/sys/user/getCurrentUserDeparts')
  const { result } = res
  if (!result.list || result.list.length == 0) {
    return
  }
  // 筛选出用户的部门信息（排除公司或者岗位配置）
  const userDeparts = result.list.filter((item) => item.orgCategory == '2')
  if (userDeparts.length === 0) {
    return
  }
  deptColumns.value = userDeparts.map((item) => {
    return {
      label: item.departName,
      value: item.orgCode,
      orgCode: item.orgCode,
      createTime: item.createTime,
      departNameAbbr: item.departNameAbbr,
      departPathName: item.departPathName,
      departName: item.departName,
    }
  })
  model.value.departId = result.orgCode
  isMultiDepart.value = true
}

/**
 *加载租户信息
 */
async function loadTenantList() {
  const res: any = await http.get('/sys/tenant/getCurrentUserTenant')
  const { result } = res
  if (!result.list || result.list.length == 0) {
    return
  }
  tenantColumns.value = result.list.map((item) => {
    return {
      label: item.name,
      value: item.id,
      houseNumber: item.houseNumber,
      createBy: item.createBy,
    }
  })
  model.value.tenantId = userStore.userInfo.tenantId as any
  isMultiTenant.value = true
}

/**
 *提交表单
 */
async function handleSubmit() {
  departResolve()
    .then(() => {
      const originalTenant = userStore.getTenant()
      if (unref(isMultiTenant) && originalTenant != unref(model).tenantId) {
        const data = http.put('/sys/user/changeLoginTenantId', {
          loginTenantId: unref(model).tenantId,
        })
        userStore.setTenant(unref(model).tenantId)
      }
      toast.success('切换成功')
    })
    .catch((e) => {
      console.log('登录选择出现问题', e)
    })
}

/**
 *切换选择部门
 */
function departResolve() {
  return new Promise(async (resolve, reject) => {
    if (!unref(isMultiDepart)) {
      resolve(true)
    } else {
      const res: any = await http.put('/sys/selectDepart', {
        username: userStore.userInfo.username,
        orgCode: model.value.departId,
        loginTenantId: model.value.tenantId,
      })
      if (res.success && res.result.userInfo) {
        const userInfo = res.result.userInfo
        const currentUserInfo = userStore.getUserInfo()
        // userInfo.homePath 是null需要删除,否则切换之后个人工作台页面出不来
        delete userInfo.homePath;
        userStore.setUserInfo(Object.assign(currentUserInfo, userInfo))
        resolve(true)
      } else {
        reject()
      }
    }
  })
}
onMounted(async () => {
  // 加载部门
  await loadDepartList()
  // 加载租户
  await loadTenantList()
  isSwitchDataLoaded.value = true
})
</script>

<style lang="scss" scoped>
.cu-title {
  display: block;
  overflow: hidden;
  margin: 14px 20px;
  font-weight: 600;
  color: black;
}
.cu-card {
  display: block;
  overflow: hidden;
  margin-left: 10px;
  margin-right: 10px;
}
.margin-top {
  margin-top: 15px;
}
.margin-bottom {
  margin-bottom: 15px;
}
.padding {
  padding: 15px;
}
.padding-top {
  padding-top: 15px;
}
.text-gray,
.line-gray,
.lines-gray {
  color: #aaa;
}
.text-sm {
  font-size: 12px;
}
.margin-tb-sm {
  margin-top: 10px;
  margin-bottom: 10px;
}
.margin-tb {
  margin-top: 15px;
  margin-bottom: 15px;
}
.solid-top {
  position: relative;
}
.solid-top::after {
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}
.solid-top::after {
  content: ' ';
  width: 200%;
  height: 200%;
  position: absolute;
  top: 0;
  left: 0;
  border-radius: inherit;
  -webkit-transform: scale(0.5);
  transform: scale(0.5);
  -webkit-transform-origin: 0 0;
  transform-origin: 0 0;
  pointer-events: none;
  box-sizing: border-box;
}
.margin-top-sm {
  margin-top: 10px;
}
.empty-tip {
  padding-top: 30vh;
  text-align: center;
  font-size: 14px;
  color: #999;
}

/* 选中状态下的卡片 */
.selected-card {
  border-color: #0081ff;
  box-shadow: 0 0 0 1px #0081ff;
}
/* 左上角蓝色选中标记 */
.selected-corner {
  position: relative;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  border-top: 20px solid #0081ff;
  border-right: 30px solid transparent;
  opacity: 0;
  transition: opacity 0.3s ease;
}

/* 对钩图标（使用伪元素实现） */
.selected-corner::after {
  content: '✓';
  position: absolute;
  top: -24px;
  left: 5px;
  color: white;
  font-size: 13px;
  font-weight: bold;
}

/* 显示选中标记 */
.selected-card .selected-corner {
  opacity: 1;
}
</style>
