<template>
  <view class="quickNav-container">
    <uni-section :title="cardOption.title" type="line" padding>
      <uni-grid :column="3" :square="false" :highlight="false">
        <template v-for="item in dataSource" :key="item">
          <uni-grid-item :class="cardClass">
            <view class="card-div">
              <view class="card-icon">
                <img :src="getImg(item.icon)" :style="getImgStyle" />
              </view>
              <view>{{ item.title }}</view>
            </view>
          </uni-grid-item>
        </template>
      </uni-grid>
    </uni-section>
  </view>
</template>

<script lang="ts" name="JQuickNav" setup>
import { computed, onMounted } from 'vue'
import useChartHook from '@/pages-work/components/hooks/useEchart'
import UniSection from '@/uni_modules/uni-section/components/uni-section/uni-section.vue'
import UniGrid from '@/uni_modules/uni-grid/components/uni-grid/uni-grid.vue'
import UniGridItem from '@/uni_modules/uni-grid/components/uni-grid-item/uni-grid-item.vue'
import { getFileAccessHttpUrl } from '@/common/uitls'

const props = defineProps({
  size: {
    type: Object,
    default: () => {
    },
  },
  textAlign: {
    type: String,
    default: 'center',
  },
  iconAlign: {
    type: String,
    default: 'top',
  },
  column: {
    type: Number,
    default: 4,
  },
  fontSize: {
    type: Number,
    default: 20,
  },
  scriptUrl: {
    type: String,
    default: '//at.alicdn.com/t/font_3237315_b3fqd960glt.js',
  },
  isView: {
    type: Boolean,
    default: false,
  },
  i: {
    type: String,
    default: ''
  },
  config: {
    type: Object,
    default: () => ({}),
  },
});
//定义事件
const emit = defineEmits(['compRouter']);
//card配置
const cardOption = props.config?.option?.card || {};
//初始化配置
let [{dataSource, reload, pageTips, config}, {queryData}] = useChartHook(props, initOption);
/**
 * icon样式
 */
const getIconStyle = computed(() => {
  let fontSize = config.option.icon?.fontSize || props.fontSize;
  return {
    lineHeight: 'normal',
    fontSize: `${fontSize}px`,
  }
})
/**
 * icon
 */
const getImg = (src) => {
  const map = {
    'icon-jeecg-shijian': '/pages-work/static/iconfont/time.png',
    'icon-jeecg-homepage': '/pages-work/static/iconfont/homepage.png',
    'icon-jeecg-dangan': '/pages-work/static/iconfont/dangan.png',
    'icon-jeecg-shezhi': '/pages-work/static/iconfont/shezhi.png',
    'icon-jeecg-yuechi': '/pages-work/static/iconfont/yuechi.png',
    'icon-jeecg-fujin': '/pages-work/static/iconfont/fujin.png',
  }
  if (map[src]) {
    return map[src]
  }
  return getFileAccessHttpUrl(src)
}

/**
 * 图标样式
 */
const getImgStyle = computed(() => {
  let fontSize = config.option.icon?.fontSize || props.fontSize;
  return {
    width: `${fontSize}px`,
    height: `${fontSize}px`,
  }
})

//计算图标位置 top或者left
const cardClass = computed(() => {
  let textAlign = config.option.body?.textAlign || props.textAlign;
  let iconAlign = config.option.body?.iconAlign || props.iconAlign;
  let cls = ['card-' + textAlign];
  if (iconAlign === 'top') {
    cls.push('card-icon-top');
  } else {
    cls.push('card-icon-left');
  }
  return cls;
});

function initOption() {}

onMounted(() => {
  queryData(config);
});

defineExpose({
  queryData
});
</script>

<style scoped lang="scss">
.card-icon-top {
  &.card-center .card-div {
    width: 100px;
    min-height: 80px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    .card-icon {
      text-align: center;
    }
  }

  &.card-left {
    text-align: left;
  }

  &.card-right {
    text-align: right;
  }
}

.card-icon-left {
  .card-icon {
    display: inline-block;
    margin-right: 4px;
    vertical-align: middle;
  }

  &.card-center .card-div {
    width: 100px;
    margin: 0 auto;
  }

  &.card-left {
    text-align: left;
  }

  &.card-right {
    text-align: right;
  }
}

.ant-card {
  background: transparent;
}
</style>
