<template>
  <view class="online-sub-many-container">
    <wd-button :disabled="componentDisabled" customClass="add" icon="add" size="small" @click="handleAdd">新增</wd-button>
    <wd-table :key="tableKey" :data="dataList" height="400px">
      <template v-for="(col,index) in columns" :key="index">
        <wd-table-col :prop="col.key" :label="col.title" align="center" :fixed="col.key == 'action'">
          <template #value="value" v-if="col.key == 'action'">
            <view class="custom-action">
              <template v-if="disabled">
                <wd-button size="small" type="icon" icon="view" @click="handleEdit(value)"></wd-button>
              </template>
              <template v-else>
                <wd-button size="small" type="icon" icon="edit" @click="handleEdit(value)"></wd-button>
                <wd-button size="small" type="icon" icon="delete" style="color:rgba(255,0,0,0.5)" @click="handleDel(value)"></wd-button>
              </template>
            </view>
          </template>
          <template #value="{ row, index }" :key="index" v-else>
            <online-sub-table-cell
                :columnsInfo="columnsInfo"
                :record="row"
                :column="col"
            ></online-sub-table-cell>
          </template>
        </wd-table-col>
      </template>
    </wd-table>
  </view>
  <online-subform-popup
      v-if="popupShow"
      ref="subFormPop"
      :title="tableTxt"
      :schema="formSchema"
      :disabled="disabled"
      @close="handleClose"
      @change="handleChange"
  ></online-subform-popup>
</template>

<script lang="ts" setup>
import {useMessage, useToast} from 'wot-design-uni';
import OnlineSubformPopup from './components/online-subform-popup.vue'
import OnlineSubTableCell from './components/online-sub-table-cell.vue'
import { http } from '@/utils/http'
import {deepClone} from "wot-design-uni/components/common/util";
defineOptions({
  name: 'online-sub-many',
  options: {
    styleIsolation: 'shared',
  },
})
// 接收 props
const props = defineProps({
  tableInfo: {
    type: Object,
    required: true,
    default: () => ({} as any)
  },
  dataInfo: {
    type: Array,
    required: false,
    default: () => ([])
  },
  disabled: {
    type: Boolean,
    default: false,
    required: false
  },
  edit: {
    type: Boolean,
    default: false,
    required: false
  },
  izCopy: {
    type: Boolean,
    default: false,
    required: false
  },
  showFooter: {
    type: Boolean,
    required: false,
    default: true,
  }
})

// 定义 emits
const emits = defineEmits(['back', 'success'])
//提示
const toast = useToast()
//pop弹窗
const subFormPop = ref(null)
//表ID
const tableId = ref('')
//表描述
const tableTxt = ref('')
//表名称
const tableName = ref('')
//列信息
const columns = ref([])
//表单配置信息
const formSchema = ref([])
//弹窗显示
const popupShow = ref(false)
//数据列表
const dataList = ref([])
//数据列表
const editIndex = ref(null)
//列信息
const columnsInfo = ref({})
// 关联记录翻译防重入：记录已翻译过的 tableId
const translatedTableId = ref('')
// Popup 字典翻译防重入：记录已翻译过的 tableId
const translatedPopupTableId = ref('')
// 强制 wd-table 重新创建，确保翻译完成后他表字段列也跟着刷新
const tableKey = ref(0)
/**
 *
 * @param item
 * @returns {*|boolean}
 */
const componentDisabled = computed(()=>{
  console.log("一对多many组件",props.disabled)
  console.log("一对多many组件",props.showFooter)
  if (props.disabled === true || !props.showFooter) {
    return true
  }
  return false
})
//监听配置修改
watchEffect(()=>{
  props.tableInfo && loadTableInfo(props.tableInfo)
})
// update-begin-author:codex date:2026-08-07 for:【小程序】online一对多子表编辑数据异步返回后回显
watch(
  () => props.dataInfo,
  (data) => {
    if ((props.edit === true || props.izCopy === true) && data?.length) {
      initFormData(data)
    }
  },
  { deep: true },
)
// update-end-author:codex date:2026-08-07 for:【小程序】online一对多子表编辑数据异步返回后回显
/**
 * 根据配置动态加载表单
 * @param dataID
 */
function loadTableInfo(tableInfo: any){
  console.log('===子表many加载表单数据 schema===', tableInfo)
  formSchema.value = deepClone(tableInfo)
  tableId.value = tableInfo.id;
  tableName.value = tableInfo.key;
  tableTxt.value = tableInfo.describe;
  columns.value = tableInfo?.columns || [];
  http
    .get(`/online/cgform/api/getColumns/${tableId.value}`)
    .then((res: any) => {
      if (res.success) {
        if (res.result?.columns?.length) {
          columnsInfo.value = res.result;
        }
      }
    })
  let hasAction = columns.value.some(item=>item.key == 'action');
  !hasAction && columns.value.unshift({title:'操作', key:'action'});
  console.log("根据配置动态加载表单columns.value ",columns.value );
  if (props.edit === true || props.izCopy === true) {
    initFormData(props.dataInfo)
  }
}

/**
 * 批量翻译关联记录字段及其他表字段，结果写回 dataList
 * - 关联记录字段：在原 id 之外写入 {key}_dictText 用于显示
 * - 他表字段：直接覆盖 {key} 显示翻译后的值
 */
async function translateLinkTable() {
  // 同一个 tableId 只翻译一次，避免 watchEffect 重复触发或父组件重渲染时反复请求
  if (!tableId.value || translatedTableId.value === tableId.value) return
  const linkTableCols = (columns.value || []).filter((col: any) => col.type === 'link_table')
  if (!linkTableCols.length || !dataList.value.length) return
  translatedTableId.value = tableId.value
  // 每行收集要合并写入的字段（patch），最后整体替换 row，确保 wd-table 重新派生列数据
  const patches: Record<string, any>[] = dataList.value.map(() => ({}))
  for (const col of linkTableCols) {
    const dictTable = col.dictTable
    const dictText = col.dictText || ''
    const valueField = col.dictCode || 'id'
    if (!dictTable) continue
    const idSet = new Set<string>()
    dataList.value.forEach((row: any) => {
      const v = row?.[col.key]
      if (v != null && v !== '') {
        ;(v + '').split(',').forEach((id) => id && idSet.add(id))
      }
    })
    if (!idSet.size) continue
    // 他表字段 link_table_field 的 dictTable 存的是关联记录字段的 key（不是关联表名）
    const linkFieldCols = (columns.value || []).filter(
      (c: any) => c.type === 'link_table_field' && c.dictTable === col.key,
    )
    const extraTableFields = linkFieldCols.map((c: any) => c.dictText).filter(Boolean)
    const textParts = dictText.split(',').filter(Boolean)
    const allSelectFields = [valueField, ...textParts, ...extraTableFields].filter(Boolean)
    const selectFields = Array.from(new Set(allSelectFields)).join(',')
    const idsStr = Array.from(idSet).join(',')
    const params = {
      linkTableSelectFields: selectFields,
      pageSize: idSet.size,
      pageNo: 1,
      superQueryMatchType: 'and',
      superQueryParams: encodeURI(JSON.stringify([{ field: valueField, rule: 'in', val: idsStr }])),
    }
    try {
      const res: any = await http.get(`/online/cgform/api/getData/${dictTable}`, params)
      if (!res?.success) continue
      const records = res.result?.records || []
      const textKey = textParts[0]
      dataList.value.forEach((row: any, i: number) => {
        const raw = row?.[col.key]
        if (raw == null || raw === '') return
        const ids = (raw + '').split(',')
        const labels = ids.map((v: string) => {
          const record = records.find((r: any) => String(r[valueField]) === String(v))
          return record && textKey ? record[textKey] : v
        })
        patches[i][col.key + '_dictText'] = labels.join(',')
        linkFieldCols.forEach((lfc: any) => {
          const tableField = lfc.dictText
          const fieldValues = ids.map((v: string) => {
            const record = records.find((r: any) => String(r[valueField]) === String(v))
            return record ? (record[tableField] ?? '') : ''
          })
          patches[i][lfc.key] = fieldValues.join(',')
        })
      })
    } catch (e) {
      console.error('关联记录翻译失败', e)
    }
  }
  // 用 patched 全新对象整体替换 dataList，确保 wd-table 重渲染所有相关列
  dataList.value = dataList.value.map((row: any, i: number) => ({ ...row, ...patches[i] }))
  console.log(
    '[translateLinkTable] 翻译完成 patches=',
    patches,
    'dataList=',
    JSON.parse(JSON.stringify(dataList.value)),
  )
  // 强制 wd-table 重新创建，规避 uniapp 运行时下整数组替换响应式不稳的问题
  tableKey.value++
}

/**
 * 批量翻译 Popup 字典字段，写入 {key}_dictText 供表格显示
 */
async function translatePopupDict() {
  if (!tableId.value || translatedPopupTableId.value === tableId.value) return
  const popupDictCols = (columns.value || []).filter((col: any) => col.type === 'popup_dict')
  if (!popupDictCols.length || !dataList.value.length) return
  translatedPopupTableId.value = tableId.value
  const patches: Record<string, any>[] = dataList.value.map(() => ({}))
  for (const col of popupDictCols) {
    const reportCode = col.dictTable
    const labelField = col.dictText
    const valueField = col.dictCode
    if (!reportCode || !labelField || !valueField) continue
    const values = dataList.value
      .flatMap((row: any) => String(row?.[col.key] ?? '').split(','))
      .filter(Boolean)
    if (!values.length) continue
    try {
      const columnRes: any = await http.get(`/online/cgreport/api/getRpColumns/${reportCode}`)
      const configId = columnRes.result?.cgRpConfigId
      if (!columnRes.success || !configId) continue
      const dataRes: any = await http.get(`/online/cgreport/api/getData/${configId}`, {
        ['force_' + valueField]: Array.from(new Set(values)).join(','),
      })
      if (!dataRes.success) continue
      const records = dataRes.result?.records ?? []
      dataList.value.forEach((row: any, index: number) => {
        const rowValues = String(row?.[col.key] ?? '').split(',').filter(Boolean)
        patches[index][col.key + '_dictText'] = rowValues
          .map((value) => {
            const record = records.find((item) => String(item[valueField]) === value)
            return record?.[labelField] ?? value
          })
          .join(',')
      })
    } catch (error) {
      console.error('Popup字典翻译失败', error)
    }
  }
  dataList.value = dataList.value.map((row: any, index: number) => ({
    ...row,
    ...patches[index],
  }))
  tableKey.value++
}

/**
 * 删除
 * @param row
 * @param index
 */
function handleDel({index}){
  if(componentDisabled.value){
    return;
  }
  uni.showModal({
    title: '提示',
    content: '确定要删除吗？',
    cancelText: '取消',
    confirmText: '确定',
    success: (res) => {
      if (res.confirm) {
        dataList.value.splice(index,1);
        toast.success('删除成功')
      }
    },
    fail: (err) => {
      console.log(err)
    },
  })
}

/**
 * 新增
 */
function handleAdd(){
  popupShow.value = true;
  nextTick(()=>{
    subFormPop.value.beforeOpen(null,false)
  })
}
/**
 * 编辑
 * @param row
 * @param index
 */
function handleEdit({row,index}){
  editIndex.value = index;
  popupShow.value = true;
  nextTick(()=>{
    subFormPop.value.beforeOpen(row,true)
  })
}
/**
 * 关闭弹窗
 * @param row
 * @param index
 */
function handleClose(){
  popupShow.value = false;
}
/**
 * 表单内容修改
 * @param row
 * @param index
 */
function handleChange(record,isUpdate){
  if(isUpdate){
    dataList.value[unref(editIndex)] = record;
  }else{
    dataList.value.push(record);
  }
}

/**
 * 提交前处理
 */
function beforeSubmit(){
  console.log("一对多beforeSubmit",dataList.value);
  return {status:true,data:dataList.value}
}
/**
 * 初始化表单数据
 */
function initFormData(data) {
  if (data && data.length>0)
  dataList.value = deepClone(data)
  translatedTableId.value = ''
  translatedPopupTableId.value = ''
  // update-begin-author:liaozhiyang date:2026-05-12 for:【QQYUN-15414】online子表支持关联记录、分类字典树、自定义字典树
  setTimeout(() => {
    translateLinkTable()
    translatePopupDict()
  }, 0)
  // update-end-author:liaozhiyang date:2026-05-12 for:【QQYUN-15414】online子表支持关联记录、分类字典树、自定义字典树
}
defineExpose({
  beforeSubmit,
  initFormData
})
</script>

<style lang="scss" scoped>
.online-sub-many-container {
  min-height: 300px;
  .custom-action{
    display: flex;
  }
  :deep(.add) {
   margin: 10px;
  }
}
</style>
