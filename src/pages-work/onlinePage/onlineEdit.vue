<route lang="json5" type="page">
{
  layout: 'default',
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: 'Online表单编辑',
    disableScroll: true, // 微信禁止页面滚动
    'app-plus': {
      bounce: 'none', // 禁用 iOS 弹性效果
    },
  },
}
</route>

<template>
  <PageLayout :navTitle="navTitle" :backRouteName="backRouteName">
    <scroll-view scroll-y>
      <online-loader
        v-if="reload"
        ref="onlineEdit"
        :table="dynamicTableName"
        :dataId="dataId"
        :title="navTitle"
        :edit="true"
        show-footer
        @success="handleSuccess"
        @back="backRoute"
      ></online-loader>
      <!-- 悬浮按钮显示（知会/关注）-->
      <wd-fab
        v-if="fabShow"
        type="primary"
        custom-class="fab-button"
        position="right-center"
        direction="top"
      >
        <wd-button custom-class="custom-button" type="success" @click="handleNotify">
          <wd-icon name="notification" style="font-size: 18px"></wd-icon>
        </wd-button>
        <wd-button custom-class="custom-button" type="info" @click="handleStar">
          <wd-icon v-if="star" name="star-filled" style="color: #ffc107; font-size: 18px"></wd-icon>
          <wd-icon v-else name="star" style="font-size: 18px"></wd-icon>
        </wd-button>
      </wd-fab>
<!--      <NotifyListModal-->
<!--        ref="notifyListRef"-->
<!--        notifyType="form"-->
<!--        :formData="formData"-->
<!--        @selected="fabShow = true"-->
<!--      ></NotifyListModal>-->
    </scroll-view>
  </PageLayout>
</template>

<script lang="ts" setup>
import OnlineLoader from '@/pages-work/components/online/online-loader.vue'
import router from '@/router'
import { onLoad } from '@dcloudio/uni-app'
import { http } from '@/utils/http'
import { useToast } from 'wot-design-uni'
import { isMp, isH5 } from '@/utils/platform'
import { getRefPromise } from '@/utils'
// import NotifyListModal from '@/pages-super/flow/components/NotifyListModal.vue'
import { ref } from 'vue'
defineOptions({
  name: 'onlineEdit',
  options: {
    styleIsolation: 'shared',
  },
})
const toast = useToast()
// 定义响应式数据
const tableName = ref('')
const navTitle = ref('')
const dataId = ref('')
const backRouteName = ref('')
const process_url = ref('/act/process/extActProcess/startMutilProcess')
const flow_code_pre = ref('onl_')
const flowEdit = ref(false)
const edit = ref(true)
const reload = ref(true)
// 悬浮按钮显示
const fabShow = ref(true)
// 流程表单配置
const formConfig: any = ref({})
// 知会列表实例
const notifyListRef = ref()
const formData = ref({})
// 是否关注
const star = ref(false)
// 引用组件
const onlineEdit = ref(null)
// 定义 initForm 方法
const initForm = (item) => {
  console.log('initForm item', item)
  // 表描述
  navTitle.value = `表单【${item.desformName}】`
  flowEdit.value = item.backRouteName == 'draft' ? true : false
  // 返回上一页面
  item.backRouteName && (backRouteName.value = item.backRouteName)
  reload.value = false
  nextTick(() => {
    reload.value = true
    // 表名
    tableName.value = item.desformCode
    // 数据ID
    dataId.value = item.dataId
    console.log('onlineEdit.value', onlineEdit.value)
    console.log('onlineEdit.value', onlineEdit.value)
    formConfig.value = { ...item }
    fabShow.value = formConfig.value.fabShow === 'true'
    formData.value = {
      notifyType: 'form',
      formDataId: formConfig.value?.dataId,
      formType: getFormType(formConfig.value?.formType),
      formTableName: formConfig.value?.desformCode,
      tableName: formConfig.value?.desformCode,
      processName: formConfig.value?.desformName,
      nodeName: '流程发起',
      vars: {
        BPM_FORM_TYPE: '1',
        BPM_DATA_ID: formConfig.value?.dataId,
        desform_name: formConfig.value?.desformName,
        BPM_DES_FORM_CODE: formConfig.value?.desformCode,
      },
    }
    let delay = 0
    if (isH5 === false) {
      // 小程序端需要延时下，否则不显示
      delay = 300
    }
    setTimeout(() => {
     getRefPromise(onlineEdit).then(() => {
       onlineEdit.value?.loadByTableName(item.dataId, item.desformCode)
     })
    }, delay)
  })
}
const dynamicTableName = computed(() => {
  return tableName.value
})
// 开启流程
const startProcess = (id) => {
  const param = {
    flowCode: flow_code_pre.value + tableName.value,
    id: id,
    formUrl: 'modules/bpm/task/form/OnlineFormDetail',
    formUrlMobile: 'check/onlineForm/detail',
  }
  console.log('提交流程参数', param)
  http.post(process_url.value, param).then((res: any) => {
    toast.info(res.message)
    if (res.success) {
      uni.$emit('draft:reload')
      router.back()
    }
  })
}

const backRoute = () => {
  router.back()
}

// 定义 handleSuccess 方法
const handleSuccess = (id) => {
  if (backRouteName.value === 'draft') {
    uni.showModal({
      title: '提示',
      content: '确认提交流程吗?',
      cancelText: '取消',
      confirmText: '确认',
      success: (res) => {
        if (res.confirm) {
          startProcess(id)
          uni.showToast({
            title: '发起流程成功~',
            icon: 'none',
          })
        } else {
          router.back()
        }
      },
    })
  } else {
    uni.$emit('refreshList')
    backRoute()
  }
}
/**
 * 关注审批
 */
function handleStar() {
  http
    .post('/act/process/focusOn/focusOnSet', {
      formDataId: formConfig.value.dataId,
      dataId: formConfig.value.id,
      beginNode: 'start',
      status: star.value ? '0' : '1',
      formType: getFormType(formConfig.value.formType),
    })
    .then((res: any) => {
      if (res.success) {
        toast.success(res.message)
        star.value = !star.value
      }
    })
}
// 获取表单类型
function getFormType(value) {
  if (value === '2') {
    return 'design'
  } else if (value === '1') {
    return 'online'
  } else {
    return 'dev'
  }
}
/**
 * 知会配置
 */
function handleNotify() {
  fabShow.value = false
  notifyListRef.value.handleOpen()
}
// 关注状态查询
function initStar(data) {
  http
    .get('/act/process/focusOn/getFocusOnProcess', { formDataId: data.dataId })
    .then((res: any) => {
      if (res.success) {
        star.value = !!res?.result
      }
    })
}
// onLoad 生命周期钩子
onLoad((option) => {
  initForm(option)
  // 初始化关注
  initStar(option)
})
</script>

<style lang="scss" scoped>
.wd-fab {
  :deep(.wd-button.is-round) {
    width: 38px !important;
    height: 38px !important;
    border-radius: 100% !important;
  }
  :deep(.wd-fab__icon) {
    font-size: 15px !important;
  }
  :deep(.custom-button) {
    min-width: auto !important;
    box-sizing: border-box;
    width: 32px !important;
    height: 32px !important;
    border-radius: 16px !important;
    margin: 8rpx;
  }
}
</style>
