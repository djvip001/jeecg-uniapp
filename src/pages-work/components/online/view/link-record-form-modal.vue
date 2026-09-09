<template>
  <wd-popup v-model="innerShow" position="bottom" :safe-area-inset-bottom="false" custom-style="height:100%;border-radius:0">
    <PageLayout :navTitle="navTitle" type="popup" navRightText="确定" :navRightLoading="loading" @navRight="handleSubmit" @navBack="handleClose">
      <view class="form-modal-wrap">
        <view class="load-area" v-if="schemaLoading">
          <wd-skeleton v-for="item in 5" :key="item" :custom-style="{ marginTop: '20px' }" animation="gradient" theme="paragraph" />
        </view>
        <wd-form ref="formRef" :model="formData">
          <wd-cell-group border>
            <view v-for="(item, index) in rootProperties" :key="index" :class="{ 'mt-14px': index % 2 == 0 }">
              <!-- 图片 -->
              <wd-cell v-if="item.type == 'image'" :name="item.key" :title="get4Label(item.label)" :title-width="labelWidth" :required="fieldRequired(item)">
                <online-image v-model:value="formData[item.key]" :name="item.key" :disabled="item.disabled" :key="index" :maxNum="getFieldExtendJson(item, 'uploadnum')"></online-image>
              </wd-cell>

              <!-- 文件 -->
              <wd-cell v-else-if="item.type == 'file'" :name="item.key" :title="get4Label(item.label)" :title-width="labelWidth" :required="fieldRequired(item)" center>
                <view style="text-align: left">
                  <!-- #ifndef APP-PLUS -->
                  <online-file v-model:value="formData[item.key]" :name="item.key" :disabled="item.disabled" :key="index" :maxNum="getFieldExtendJson(item, 'uploadnum')"></online-file>
                  <!-- #endif -->
                  <!-- #ifdef APP-PLUS -->
                  <online-file-custom v-model:value="formData[item.key]" :name="item.key" :disabled="item.disabled" :key="index" :maxNum="getFieldExtendJson(item, 'uploadnum')"></online-file-custom>
                  <!-- #endif -->
                </view>
              </wd-cell>

              <!-- 日期时间 -->
              <DateTime
                v-else-if="item.type === 'datetime'"
                :label="get4Label(item.label)"
                :labelWidth="labelWidth"
                startTime="1949-01-01 00:00:00"
                endTime="2050-01-01 00:00:00"
                :type="item.type"
                :name="item.key"
                format="YYYY-MM-DD HH:mm:ss"
                :disabled="item.disabled"
                v-model="formData[item.key]"
                :required="fieldRequired(item)"
              ></DateTime>

              <!-- 时间 -->
              <DateTime
                v-else-if="item.type === 'time'"
                :label="get4Label(item.label)"
                :labelWidth="labelWidth"
                format="HH:mm:ss"
                :type="item.type"
                :name="item.key"
                :disabled="item.disabled"
                v-model="formData[item.key]"
                :required="fieldRequired(item)"
              ></DateTime>

              <!-- 日期 -->
              <online-date
                v-else-if="item.type === 'date'"
                :label="get4Label(item.label)"
                :labelWidth="labelWidth"
                :name="item.key"
                :type="getDateExtendType(item.formSchema)"
                :disabled="item.disabled"
                v-model:value="formData[item.key]"
                :required="fieldRequired(item)"
              ></online-date>

              <!-- 下拉选择 -->
              <online-select
                v-else-if="item.type === 'list' || item.type === 'sel_search'"
                :label="get4Label(item.label)"
                :labelWidth="labelWidth"
                :name="item.key"
                :type="item.type"
                :dict="item.listSource"
                :dictStr="item.dictStr"
                :disabled="item.disabled"
                v-model="formData[item.key]"
                :required="fieldRequired(item)"
              ></online-select>

              <!-- checkbox -->
              <online-checkbox
                v-else-if="item.type === 'checkbox'"
                :name="item.key"
                :type="item.type"
                :label="get4Label(item.label)"
                :labelWidth="labelWidth"
                :dict="item.listSource"
                :disabled="item.disabled"
                :required="fieldRequired(item)"
                v-model="formData[item.key]"
              ></online-checkbox>

              <!-- radio -->
              <online-radio
                v-else-if="item.type === 'radio'"
                :name="item.key"
                :label="get4Label(item.label)"
                :labelWidth="labelWidth"
                :type="item.type"
                :dict="item.listSource"
                :disabled="item.disabled"
                :required="fieldRequired(item)"
                v-model="formData[item.key]"
              ></online-radio>

              <!-- 下拉多选 -->
              <online-multi
                v-else-if="item.type === 'list_multi'"
                :label="get4Label(item.label)"
                :labelWidth="labelWidth"
                :name="item.key"
                :dict="item.listSource"
                :disabled="item.disabled"
                :required="fieldRequired(item)"
                v-model="formData[item.key]"
              ></online-multi>

              <!-- 省市区 -->
              <online-pca
                v-else-if="item.type === 'pca'"
                :name="item.key"
                :label="get4Label(item.label)"
                :labelWidth="labelWidth"
                :disabled="item.disabled"
                :required="fieldRequired(item)"
                v-model:value="formData[item.key]"
              ></online-pca>

              <!-- 数字框 小数 -->
              <CustomInput
                v-else-if="item.type === 'number' && (!item.formSchema.onlyInteger || item.formSchema.onlyInteger == false)"
                :label-width="labelWidth"
                v-model:value="formData[item.key]"
                :label="get4Label(item.label)"
                :name="item.key"
                type="digit"
                inputMode="decimal"
                :disabled="item.disabled"
                :placeholder="item.placeholder"
                :rules="item.rules"
              />

              <!-- 数字框 整数 -->
              <CustomInput
                v-else-if="item.type === 'number' && item.formSchema.onlyInteger === true"
                :label-width="labelWidth"
                :label="get4Label(item.label)"
                :name="item.key"
                v-model:value="formData[item.key]"
                type="number"
                inputMode="numeric"
                :disabled="item.disabled"
                :placeholder="item.placeholder"
                :rules="item.rules"
              />

              <!-- 开关 -->
              <wd-cell v-else-if="item.type == 'switch'" :name="item.key" :title="get4Label(item.label)" :title-width="labelWidth" center :required="fieldRequired(item)">
                <view style="text-align: left">
                  <wd-switch
                    :label="get4Label(item.label)"
                    :name="item.key"
                    size="18px"
                    :disabled="item.disabled"
                    v-model="formData[item.key]"
                    :active-value="switchOpt(item.formSchema?.extendOption, 0)"
                    :inactive-value="switchOpt(item.formSchema?.extendOption, 1)"
                  />
                </view>
              </wd-cell>

              <!-- 多行文本 -->
              <wd-textarea
                v-else-if="['textarea', 'markdown', 'umeditor'].includes(item.type)"
                :label-width="labelWidth"
                :label="get4Label(item.label)"
                :name="item.key"
                v-model="formData[item.key]"
                clearable
                :maxlength="300"
                :disabled="item.disabled"
                :placeholder="item.placeholder"
                :rules="item.rules"
              />

              <!-- 密码输入框 -->
              <CustomInput
                v-else-if="item.type === 'password'"
                :label-width="labelWidth"
                v-model:value="formData[item.key]"
                :disabled="item.disabled"
                :label="get4Label(item.label)"
                :name="item.key"
                :placeholder="item.placeholder"
                :rules="item.rules"
                show-password
              />

              <!-- popup字典 -->
              <PopupDict
                v-else-if="item.type === 'popup_dict'"
                :label-width="labelWidth"
                :label="get4Label(item.label)"
                :disabled="item.disabled"
                :required="fieldRequired(item)"
                v-model="formData[item.key]"
                :multi="item.formSchema.popupMulti"
                :dictCode="`${item.formSchema.code},${item.formSchema['destFields']},${item.formSchema['orgFields']}`"
              ></PopupDict>

              <!-- popup -->
              <Popup
                v-else-if="item.type === 'popup'"
                :label-width="labelWidth"
                :label="get4Label(item.label)"
                :disabled="item.disabled"
                :required="fieldRequired(item)"
                v-model="formData[item.key]"
                :multi="item.formSchema.popupMulti"
                :code="`${item.formSchema.code}`"
                :setFieldsValue="setFieldsValue"
                :fieldConfig="getPopupFieldConfig(item)"
              ></Popup>

              <!-- 关联记录 -->
              <online-popup-link-record
                v-else-if="item.type === 'link_table'"
                :label-width="labelWidth"
                :label="get4Label(item.label)"
                :name="item.key"
                v-model:formSchema="item.formSchema"
                :disabled="item.disabled"
                :required="fieldRequired(item)"
                v-model:value="formData[item.key]"
                @selected="linkRecordChange"
              ></online-popup-link-record>

              <!-- 他表字段 -->
              <wd-input
                v-else-if="item.type === 'link_table_field'"
                :label-width="labelWidth"
                v-model="formData[item.key]"
                :disabled="true"
                :label="get4Label(item.label)"
                :name="item.key"
              />

              <!-- 用户选择 -->
              <select-user
                v-else-if="item.type === 'sel_user'"
                :label-width="labelWidth"
                :name="item.key"
                :label="get4Label(item.label)"
                :disabled="item.disabled"
                :required="fieldRequired(item)"
                v-model="formData[item.key]"
              ></select-user>

              <!-- 部门选择 -->
              <select-dept
                v-else-if="item.type === 'sel_depart'"
                :label-width="labelWidth"
                :name="item.key"
                :label="get4Label(item.label)"
                labelKey="departName"
                :disabled="item.disabled"
                :required="fieldRequired(item)"
                v-model="formData[item.key]"
              ></select-dept>

              <!-- 分类字典树 -->
              <CategorySelect
                v-else-if="item.type === 'cat_tree'"
                :label-width="labelWidth"
                :label="get4Label(item.label)"
                :disabled="item.disabled"
                :required="fieldRequired(item)"
                v-model="formData[item.key]"
                :pid="`${item.formSchema.pidValue}`"
              ></CategorySelect>

              <!-- 自定义树 -->
              <TreeSelect
                v-else-if="item.type === 'sel_tree'"
                :label-width="labelWidth"
                :label="get4Label(item.label)"
                :disabled="item.disabled"
                :required="fieldRequired(item)"
                v-model="formData[item.key]"
                :dict="`${item.formSchema.dict}`"
                :pidField="`${item.formSchema.pidField}`"
                :pidValue="`${item.formSchema.pidValue}`"
                :hasChildField="`${item.formSchema.hasChildField}`"
              ></TreeSelect>

              <!-- 普通输入框 -->
              <CustomInput
                v-else-if="item.type !== 'hidden'"
                :label-width="labelWidth"
                v-model:value="formData[item.key]"
                :disabled="item.disabled"
                :label="get4Label(item.label)"
                :name="item.key"
                :placeholder="item.placeholder"
                :rules="item.rules"
                clearable
              />
            </view>
          </wd-cell-group>
        </wd-form>
      </view>
    </PageLayout>
  </wd-popup>
  <wd-toast :selector="toastId"></wd-toast>
</template>

<script lang="ts" setup>
import FormProperty from '../FormProperty'
import OnlineImage from './online-image.vue'
import OnlineFile from './online-file.vue'
import OnlineFileCustom from './online-file-custom.vue'
import OnlineSelect from './online-select.vue'
import OnlineDate from './online-date.vue'
import OnlineRadio from './online-radio.vue'
import OnlineCheckbox from './online-checkbox.vue'
import OnlineMulti from './online-multi.vue'
import CustomInput from './CustomInput.vue'
import OnlinePca from './online-pca.vue'
import OnlinePopupLinkRecord from './online-popup-link-record.vue'
import { loadOneFieldDefVal } from '../defaultVal'
import { useToast } from 'wot-design-uni'
import { http } from '@/utils/http'
import { deepClone } from 'wot-design-uni/components/common/util'
import { isArray, isNumber, isString } from '@/utils/is'
import { formatDate, uuid } from '@/common/uitls'
import { duplicateCheck } from '@/service/api'

defineOptions({
  name: 'link-record-form-modal',
  options: { styleIsolation: 'shared' },
})

const props = defineProps({
  /** 控制弹窗显示 */
  show: {
    type: Boolean,
    default: false,
  },
  /** 表名（动态） */
  tableName: {
    type: String,
    required: true,
  },
  /** 数据ID，有值为编辑，无值为新增 */
  dataId: {
    type: String,
    default: '',
  },
  /** 额外的默认表单数据 */
  defaultFormData: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['update:show', 'success'])

const toastId = uuid()
const toast = useToast(toastId)

const innerShow = computed({
  get: () => props.show,
  set: (val) => emit('update:show', val),
})

const isEdit = computed(() => !!props.dataId)
const navTitle = computed(() => (isEdit.value ? '编辑' : '新增'))
const labelWidth = '100px'

// 表单数据
const formData = ref<Record<string, any>>({})
// 字段属性列表
const rootProperties = ref<any[]>([])
// 必填字段列表
const hasRequiredFields = ref<string[]>([])
// 表单加载状态
const schemaLoading = ref(false)
// 提交加载状态
const loading = ref(false)
// 表名（用于接口）
const tableName_ = ref('')
// 表单代码（接口返回）
const code = ref('')
// 表类型
const tableType = ref(1)
const formRef = ref(null)

const get4Label = (label: string) => {
  return `${label && label.length > 4 ? label.substring(0, 4) : label}：`
}

const fieldRequired = (item: any) => {
  return item?.key && hasRequiredFields.value.includes(item.key)
}

const switchOpt = (opts: any, index: number) => {
  const options = Array.isArray(opts) && opts.length > 0 ? opts : ['Y', 'N']
  return options[index] + ''
}

const getDateExtendType = (formSchema: any) => {
  if (formSchema?.fieldExtendJson) {
    try {
      const ext = JSON.parse(formSchema.fieldExtendJson)
      const mapField: Record<string, string> = { month: 'year-month', year: 'year', quarter: 'quarter', week: 'week', day: 'date' }
      return ext?.picker && mapField[ext.picker] ? mapField[ext.picker] : 'date'
    } catch {
      return 'date'
    }
  }
  return 'date'
}

const getFieldExtendJson = (item: any, field: string) => {
  let json = item.formSchema?.fieldExtendJson ?? '{}'
  if (isString(json) && json.trim().length === 0) json = '{}'
  try {
    return JSON.parse(json)[field]
  } catch {
    return undefined
  }
}

const setFieldsValue = (data: any) => {
  formData.value = { ...formData.value, ...data }
}

const getPopupFieldConfig = (item: any) => {
  const { formSchema } = item
  const { destFields = '', orgFields = '' } = formSchema
  return orgFields.split(',').map((oField: string, index: number) => ({
    source: oField,
    target: destFields.split(',')[index],
  }))
}

const linkRecordChange = (linkRecord: any[], key: string) => {
  const linkFieldArr = rootProperties.value.filter(
    (item) => item.type === 'link_table_field' && item?.formSchema?.dictTable == key,
  )
  linkFieldArr.forEach((field) => {
    const value = linkRecord.map((record) => record[field.formSchema.dictText]).join(',')
    nextTick(() => {
      formData.value[field.key] = value
    })
  })
}

/**
 * 创建字段属性列表
 */
const createRootProperties = (formSchema: any) => {
  formData.value = {}
  hasRequiredFields.value = formSchema?.required ?? []
  const properties = formSchema.properties || {}
  const rootProps: any[] = []
  Object.keys(properties).forEach((key) => {
    if (key) {
      const item = properties[key]
      if (item.view !== 'tab' && key !== 'bpm_status') {
        formData.value[key] = ''
        rootProps.push(FormProperty(key, item, formSchema.required))
      }
    }
  })
  rootProps.sort((a, b) => a.formSchema.order - b.formSchema.order)
  rootProperties.value = rootProps
}

/**
 * 设置字段默认值
 */
const handleDefaultValue = () => {
  rootProperties.value.forEach((item) => {
    const { defVal, type } = item.formSchema
    loadOneFieldDefVal(defVal, type, (value: any) => {
      formData.value[item.key] = value
    })
  })
}

/**
 * 加载表单 schema
 */
const loadSchema = async () => {
  schemaLoading.value = true
  try {
    const res: any = await http.get(`/online/cgform/api/getFormItem/${props.tableName}`)
    if (res.success) {
      const config = res.result
      code.value = config.head?.id || props.tableName
      tableType.value = config.head?.tableType ?? 1
      createRootProperties(config.schema)
      tableName_.value = config.schema?.table || props.tableName
    } else {
      toast.warning(res.message || '加载表单失败')
    }
  } catch (e) {
    toast.warning('加载表单失败')
  } finally {
    schemaLoading.value = false
  }
}

/**
 * 加载编辑数据
 */
const loadEditData = async () => {
  try {
    const codeStr = code.value || props.tableName
    const res: any = await http.get(`/online/cgform/api/form/${codeStr}/${props.dataId}`)
    if (res.success) {
      formData.value = { ...res.result }
    } else {
      toast.warning(res.message || '加载数据失败')
    }
  } catch {
    toast.warning('加载数据失败')
  }
}

/**
 * 处理日期/多选字段，转为接口需要的格式
 */
const handleSpecialFields = () => {
  const finalData = deepClone(formData.value)
  const dateFieldArr = rootProperties.value.filter((item) => item.type === 'date' || item.type === 'datetime')
  const pcaArr = rootProperties.value.filter((item) => item.type === 'pca')

  return Object.keys(finalData).reduce((acc: any, key) => {
    let value = finalData[key]
    if (value && pcaArr.length > 0 && pcaArr.map((i: any) => i.key).includes(key)) {
      value = isArray(value) ? value[2] : (value.includes(',') ? value.split(',')[2] : value)
    }
    if (value && isArray(value)) {
      value = value.join(',')
    }
    if (dateFieldArr.length > 0) {
      const dateField = dateFieldArr.find((obj: any) => obj.key === key)
      if (dateField) {
        value = value && isNumber(value) ? formatDate(value, dateField.type === 'datetime' ? 'yyyy-MM-dd HH:mm:ss' : 'yyyy-MM-dd') : value
      }
    }
    acc[key] = value
    return acc
  }, {})
}

/**
 * 字段校验
 */
const fieldCheck = async (values: any): Promise<boolean> => {
  let flag = false
  const tip = (msg: string) => {
    toast.warning(msg)
    flag = true
  }
  for (const item of rootProperties.value) {
    if (fieldRequired(item) && !values[item.key]) {
      tip(`${item.label}不能为空！`)
      break
    }
    const pattern = item?.formSchema?.pattern
    if (pattern) {
      if (pattern === 'only') {
        const res: any = await duplicateCheck({
          tableName: tableName_.value,
          fieldName: item.key,
          fieldVal: values[item.key],
          dataId: props.dataId,
        })
        if (!res.success) {
          tip(`${item.label} ${res.message}`)
          break
        }
      } else {
        const regex = new RegExp(pattern)
        if (values[item.key] && !regex.test(values[item.key])) {
          tip(`${item.label}${item?.formSchema?.errorInfo || '格式不正确!'}`)
          break
        }
      }
    }
  }
  return flag
}

/**
 * 提交表单
 */
const handleSubmit = async () => {
  if (loading.value) return
  loading.value = true
  try {
    const finalData = handleSpecialFields()
    if (await fieldCheck(finalData)) {
      loading.value = false
      return
    }
    const codeStr = code.value || props.tableName
    const url = `/online/cgform/api/form/${codeStr}?tabletype=${tableType.value}`
    let res: any
    if (isEdit.value) {
      res = await http.put(url, finalData)
    } else {
      res = await http.post(url, finalData)
    }
    if (res.success) {
      toast.success(isEdit.value ? '编辑成功' : '新增成功')
      setTimeout(() => {
        innerShow.value = false
        emit('success')
      }, 800)
    } else {
      toast.warning(res.message || '操作失败')
    }
  } catch {
    toast.warning('操作失败')
  } finally {
    loading.value = false
  }
}

const handleClose = () => {
  innerShow.value = false
}

/**
 * 初始化：加载 schema，按需加载编辑数据
 */
const init = async () => {
  await loadSchema()
  if (isEdit.value) {
    await loadEditData()
  } else {
    if (props.defaultFormData && Object.keys(props.defaultFormData).length) {
      formData.value = { ...formData.value, ...props.defaultFormData }
    }
    handleDefaultValue()
  }
}

watch(
  () => props.show,
  (val) => {
    if (val) {
      formData.value = {}
      rootProperties.value = []
      init()
    }
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
.form-modal-wrap {
  padding-bottom: 20px;
  .load-area {
    margin-top: 14px;
    background: #ffffff;
    height: 80vh;
    overflow: hidden;
  }
  :deep(.wd-cell-group__body) {
    background-color: #f1f1f1;
  }
}
</style>
