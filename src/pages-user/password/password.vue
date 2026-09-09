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
  <PageLayout navTitle="修改密码" backRouteName="home" routeMethod="pushTab">
    <wd-form ref="form" :model="model" custom-class="pt3">
      <wd-cell-group border>
        <wd-input
          label="旧密码："
          prop="oldPassword"
          type="password"
          clearable
          label-width="100px"
          v-model="model.oldPassword"
          placeholder="请输入旧密码"
          :rules="[{ required: true, message: '请输入旧密码' }]"
        />
        <wd-input
          label="新密码："
          prop="newPassword"
          type="password"
          clearable
          label-width="100px"
          v-model="model.newPassword"
          placeholder="请输入新密码"
          :rules="[
            { required: true, message: '请输入新密码' },
            { validator: rules.newPassword },
          ]"
        />
        <wd-input
          label="确认密码："
          prop="confirmPassword"
          type="password"
          clearable
          label-width="100px"
          v-model="model.confirmPassword"
          placeholder="请再次输入新密码"
          :rules="[
            { required: true, message: '请确认新密码' },
            { validator: rules.confirmPassword },
          ]"
        />
      </wd-cell-group>

      <view class="footer p5">
        <wd-button type="primary" size="large" @click="handleSubmit" block>提交</wd-button>
      </view>
    </wd-form>
  </PageLayout>
</template>

<script lang="ts" setup>
import { reactive, ref } from 'vue'
import { http } from '@/utils/http'
import { useToast } from 'wot-design-uni'
import { useRouter } from '@/plugin/uni-mini-router'
import { useUserStore } from '@/store/user'
import socket from '@/common/socket'

const toast = useToast()
const router = useRouter()
const userStore = useUserStore()

const form = ref<any>(null)

const model = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

// 密码强校验：至少 8 位，包含字母、数字、特殊符号
const pwdRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[~!@#$%^&*()_+`\-={}:";'<>?,./]).{8,}$/

const rules = {
  newPassword: (value) => {
    if (value === model.oldPassword) {
      return Promise.reject('新密码不能和旧密码一致')
    }
    if (!pwdRegex.test(value)) {
      return Promise.reject('密码由 8 位及以上数字、大小写字母和特殊符号组成！')
    }
    return Promise.resolve()
  },
  confirmPassword: (value) => {
    if (value !== model.newPassword) {
      return Promise.reject('两次输入的密码不一致')
    }
    return Promise.resolve()
  },
}

function handleSubmit() {
  form.value
    .validate()
    .then(({ valid }: { valid }) => {
      if (!valid) return
      uni.showLoading({ title: '提交中' })
      const payload = {
        username: userStore.userInfo.username,
        oldpassword: model.oldPassword,
        password: model.newPassword,
        confirmpassword: model.confirmPassword,
      }
      http
        .put('/sys/user/updatePassword', payload)
        .then((res: any) => {
          uni.hideLoading()
          if (res?.success) {
            toast.success('密码修改成功，请重新登录！2s后自动退出登录')
            setTimeout(() => {
              socket.init('eoaNewChatSocket')
              socket.closeSocket()
              http.get('/sys/user/saveClientId', { clientId: null })
              userStore.clearUserInfo()
              router.replaceAll({ name: 'login' })
            }, 2000)
          } else {
            toast.warning(res?.message || '修改失败')
          }
        })
        .catch(() => {
          uni.hideLoading()
          toast.error('修改失败')
        })
    })
    .catch(() => {
      // 校验异常已通过 toast 提示
    })
}
</script>

<style lang="scss" scoped>
:deep(.wd-cell-group) {
  background-color: transparent !important;
  --wot-cell-title-color: var(--UI-FG-0);
}
.footer {
  margin-top: 20px;
}
</style>
