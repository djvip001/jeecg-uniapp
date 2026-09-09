<template>
  <view>
    <wd-popup v-model="show" position="right" @close="handleClose">
      <wd-cell-group border>
        <wd-cell custom-class="title" title="切换"></wd-cell>
        <wd-radio-group v-model="organizationType">
          <wd-cell title="租户" clickable @click="handleSelected('tenant')">
            <wd-radio value="tenant"></wd-radio>
          </wd-cell>
          <wd-cell title="部门" clickable @click="handleSelected('depart')">
            <wd-radio value="depart"></wd-radio>
          </wd-cell>
        </wd-radio-group>
      </wd-cell-group>
    </wd-popup>
  </view>
</template>

<script lang="ts" setup>
//
import { ref } from 'vue'
import { duplicateCheck } from '@/service/api'
import { isObject } from '@/common/is'

defineOptions({
  name: 'rightTypeChange',
  options: {
    styleIsolation: 'apply-shared',
  },
})

const props = defineProps(['type'])
const emits = defineEmits(['change', 'close'])
const show = ref(true)
const organizationType = ref(props.type)
const handleClose = () => {
  setTimeout(() => {
    emits('close')
  }, 200)
}

const handleSelected = (val) => {
  organizationType.value = val
  emits('change', organizationType.value)
  handleClose()
}
</script>

<style lang="scss" scoped>
:deep(.wd-cell-group) {
  width: 150px;
  .wd-cell {
    &.title {
      .wd-cell__title {
        font-size: 17px;
      }
    }
  }
  .wd-cell__wrapper {
    align-items: center;
    .wd-cell__right {
      flex: 0.5;
    }
    .wd-radio {
      margin-top: 0;
    }
  }
  .uni-calendar__header-text {
    font-size: 16px !important;
  }
  .wd-cell {
    &.date {
      &:last-child {
        .wd-cell__wrapper {
          border-bottom: 1px solid rgba(232, 232, 232, 0.5);
        }
      }
      .wd-cell__wrapper {
        .wd-calendar__value {
          margin-right: 0;
          text-align: center;
        }
        .wd-input::after {
          display: none;
        }
        .wd-icon-arrow-right {
          display: none;
        }
        .wd-calendar__cell {
          padding: 0;
        }
        .wd-cell__left {
          display: none;
        }
        .wd-cell__right {
          flex: 1;
        }
        .wd-cell__value {
          display: flex;
          align-items: center;
          .wd-picker {
            --wot-cell-wrapper-padding: 0;
            --wot-cell-padding: 0;
            flex: 1;
          }
        }
      }
    }
  }
}
</style>
