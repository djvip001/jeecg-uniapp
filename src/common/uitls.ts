import { http } from '@/utils/http'
import pagesJson from '../pages.json'
import { parse } from 'crypto-js/enc-utf8'
import { encrypt } from 'crypto-js/aes'
import pkcs7 from 'crypto-js/pad-pkcs7'
// 引入uni-parse-pages
import pagesJsonToRoutes from 'uni-parse-pages'
import { colorPanel } from './constants'
import { isArray } from '@/utils/is'
import tip from './tip'
import {
  platform,
  isH5,
  isApp,
  isHarmony,
  isMp,
  isMpWeixin,
  isMpAplipay,
  isMpToutiao,
} from '@/utils/platform'
import { isString } from './is'
import { intersection } from 'lodash-es';
/**
 * 缓存,默认有效期2小时
 * @param key 缓存key
 * @param value  缓存值
 * @param seconds 缓存时间（秒）
 * @returns {*}
 */
export function cache(key, value = null, seconds = 2 * 3600) {
  const timestamp = +new Date() / 1000
  if (key && value === null) {
    // 获取缓存
    const val = uni.getStorageSync(key)
    if (val && val.length > 0) {
      const tmp = val.split('|')
      if (!tmp[2] || timestamp >= tmp[2]) {
        console.log('key已失效')
        // 删除缓存
        uni.removeStorageSync(key)
        return ''
      } else {
        console.log('key未失效')
        if (tmp[1] == 'json') {
          return JSON.parse(tmp[0])
        }
        return tmp[0]
      }
    }
  } else if (key && value) {
    // 设置缓存
    const expire = timestamp + seconds
    console.log('typeof value', typeof value)
    if (typeof value === 'object') {
      value = JSON.stringify(value) + '|json|' + expire
    } else {
      value = value + '|string|' + expire
    }
    uni.setStorageSync(key, value)
  } else {
    console.log('key不能空')
  }
}

// 获取静态文件地址
export const getStaticDomainURL = () => {
  return import.meta.env.VITE_SERVER_BASEURL + '/sys/common/static'
}

export const getFileAccessHttpUrl = function (avatar, subStr?) {
  if (!avatar) return ''
  if (!subStr) subStr = 'http'
  if (avatar) {
    avatar = avatar.replace(/user_imgs\\/, 'user_imgs/')
  }
  if (avatar && avatar.startsWith(subStr)) {
    return avatar
  } else {
    return getStaticDomainURL() + '/' + avatar
  }
}
interface hasRouteType {
  name?: string
  path?: string
  routeList?: any
}
// 判断路由是否存在
export const hasRoute = ({ name, path, routeList }: hasRouteType) => {
  routeList = routeList ?? pagesJsonToRoutes(pagesJson)
  if (path) {
    return !!routeList.find((item) => item.path === path)
  }
  if (name) {
    return !!routeList.find((item) => item.path.split('/').pop() === name)
  }
}

/**
 * 人性化显示时间
 *
 * @param {Object} datetime
 */
export function beautifyTime(datetime = '') {
  if (datetime == null) {
    return ''
  }
  datetime = datetime.toString().replace(/-/g, '/')
  const time = new Date()
  let outTime = new Date(datetime)
  if (/^[1-9]\d*$/.test(datetime)) {
    outTime = new Date(parseInt(datetime))
  }

  if (time.getTime() < outTime.getTime()) {
    return parseTime(outTime, '{y}/{m}/{d}')
  }

  if (time.getFullYear() != outTime.getFullYear()) {
    return parseTime(outTime, '{y}/{m}/{d}')
  }

  if (time.getMonth() != outTime.getMonth()) {
    return parseTime(outTime, '{m}/{d}')
  }

  if (time.getDate() != outTime.getDate()) {
    const day = outTime.getDate() - time.getDate()
    if (day == -1) {
      return parseTime(outTime, '昨天 {h}:{i}')
    }

    if (day == -2) {
      return parseTime(outTime, '前天 {h}:{i}')
    }

    return parseTime(outTime, '{m}-{d}')
  }

  if (time.getHours() != outTime.getHours()) {
    return parseTime(outTime, '{h}:{i}')
  }

  let minutes = outTime.getMinutes() - time.getMinutes()
  if (minutes == 0) {
    return '刚刚'
  }

  minutes = Math.abs(minutes)
  return `${minutes}分钟前`
}
/**
 * 格式化时间
 * @param {Object} time
 * @param {Object} cFormat
 */
export function parseTime(time, cFormat) {
  if (arguments.length === 0) {
    return null
  }

  let date
  const format = cFormat || '{y}-{m}-{d} {h}:{i}:{s}'

  if (typeof time === 'object') {
    date = time
  } else {
    if (typeof time === 'string' && /^[0-9]+$/.test(time)) {
      time = parseInt(time)
    } else {
      time = new Date(time)
    }
    date = new Date(time.toString().replace(/-/g, '/'))
  }

  const formatObj = {
    y: date.getFullYear(),
    m: date.getMonth() + 1,
    d: date.getDate(),
    h: date.getHours(),
    i: date.getMinutes(),
    s: date.getSeconds(),
    a: date.getDay(),
  }

  const time_str = format.replace(/{([ymdhisa])+}/g, (result, key) => {
    const value = formatObj[key]
    // Note: getDay() returns 0 on Sunday
    if (key === 'a') {
      return ['日', '一', '二', '三', '四', '五', '六'][value]
    }

    return value.toString().padStart(2, '0')
  })

  return time_str
}

/**
 * 随机生成字符串
 * @param length 字符串的长度
 * @param chats 可选字符串区间（只会生成传入的字符串中的字符）
 * @return string 生成的字符串
 */
export function randomString(length, chats?) {
  if (!length) length = 1
  if (!chats) chats = '0123456789qwertyuioplkjhgfdsazxcvbnm'
  let str = ''
  for (let i = 0; i < length; i++) {
    // @ts-ignore
    const num = randomNumber(0, chats.length - 1)
    str += chats[num]
  }
  return str
}

/**
 * 随机生成数字
 *
 * 示例：生成长度为 12 的随机数：randomNumber(12)
 * 示例：生成 3~23 之间的随机数：randomNumber(3, 23)
 *
 * @param1 最小值 | 长度
 * @param2 最大值
 * @return int 生成后的数字
 */
export function randomNumber() {
  // 生成 最小值 到 最大值 区间的随机数
  const random = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1) + min)
  }
  if (arguments.length === 1) {
    // @ts-ignore
    const [length] = arguments
    // 生成指定长度的随机数字，首位一定不是 0
    // @ts-ignore
    const nums = [...Array(length).keys()].map((i) => (i > 0 ? random(0, 9) : random(1, 9)))
    return parseInt(nums.join(''))
  } else if (arguments.length >= 2) {
    // @ts-ignore
    const [min, max] = arguments
    return random(min, max)
  } else {
    return Number.NaN
  }
}

/**
 * 时间格式化
 * @param value
 * @param fmt
 * @returns {*}
 */
export function formatDate(value, fmt) {
  const regPos = /^\d+(\.\d+)?$/
  if (regPos.test(value)) {
    // 如果是数字
    const getDate = new Date(value)
    const o = {
      'M+': getDate.getMonth() + 1,
      'd+': getDate.getDate(),
      'h+': getDate.getHours(),
      'H+': getDate.getHours(),
      'm+': getDate.getMinutes(),
      's+': getDate.getSeconds(),
      'q+': Math.floor((getDate.getMonth() + 3) / 3),
      S: getDate.getMilliseconds(),
    }
    if (/(y+)/.test(fmt)) {
      fmt = fmt.replace(RegExp.$1, (getDate.getFullYear() + '').substr(4 - RegExp.$1.length))
    }
    for (const k in o) {
      if (new RegExp('(' + k + ')').test(fmt)) {
        fmt = fmt.replace(
          RegExp.$1,
          RegExp.$1.length === 1 ? o[k] : ('00' + o[k]).substr(('' + o[k]).length),
        )
      }
    }
    return fmt
  } else {
    // TODO
    if (value && value.length > 0) {
      value = value.trim()
      return value.substr(0, fmt.length)
    }
    return value
  }
}

// 通过时间或者时间戳获取对应antd的年、月、周、季度。
export function getWeekMonthQuarterYear(date) {
  // 获取 ISO 周数的函数
  const getISOWeek = (date) => {
    const jan4 = new Date(date.getFullYear(), 0, 4)
    const oneDay = 86400000 // 一天的毫秒数
    return Math.ceil(((date - jan4.getTime()) / oneDay + jan4.getDay() + 1) / 7)
  }
  // 将时间戳转换为日期对象
  const dateObj = new Date(date)
  // 计算周
  const week = getISOWeek(dateObj)
  // 计算月
  const month = dateObj.getMonth() + 1 // 月份是从0开始的，所以要加1
  // 计算季度
  const quarter = Math.floor(dateObj.getMonth() / 3) + 1
  // 计算年
  const year = dateObj.getFullYear()
  return {
    year: `${year}`,
    month: `${year}-${month.toString().padStart(2, '0')}`,
    week: `${year}-${week}周`,
    quarter: `${year}-Q${quarter}`,
  }
}

// 生成 1 到 10 之间的随机整数
export function getRandomIntBetweenOneAndTen() {
  return Math.floor(Math.random() * 10) + 1
}
/**
 * 获取随机颜色
 * @param {any} color
 * 颜色板
 * classic：经典
 * technology：科技
 * business：商务
 * botany：植物
 * natural：自然
 * colour：彩色
 * @return
 */
export function getRandomColor() {
  const colorType = ['classic', 'technology', 'business', 'botany', 'natural', 'colour']
  // 生成一个随机索引，范围是从 0 到数组长度减 1
  const randomIndex = Math.floor(Math.random() * colorType.length)
  // 根据随机索引从数组中获取一个随机类型
  const randomColorType = colorType[randomIndex]
  return colorPanel.natural[getRandomIntBetweenOneAndTen()] || '#00bcd4'
}

// 消除后缀：
export const getPlaceholder = (attrs: any = {}) => {
  let label = attrs.label ?? ''
  if (label.endsWith('：') || label.endsWith(':')) {
    label = label.substr(0, label.length - 1)
  }
  return `请选择${label}`
}
/**
 * 日期格式化
 * @param text
 */
export function getFormatDate(text, column) {
  if (!text) {
    return ''
  }
  let a = text
  if (a.length > 10) {
    a = a.substring(0, 10)
  }
  let fieldExtendJson = column?.fieldExtendJson
  console.log('getFormat  Datetext', text)
  console.log('getFormatDate  fieldExtendJson', fieldExtendJson)
  if (fieldExtendJson) {
    fieldExtendJson = JSON.parse(fieldExtendJson)
    if (fieldExtendJson.picker && fieldExtendJson.picker != 'default') {
      const result = getWeekMonthQuarterYear(a)
      return result[fieldExtendJson.picker]
    }
  }
  return a
}

/**
 * 字典值替换文本通用方法(多选)
 * @param dictOptions  字典数组
 * @param text  字典值
 * @return String
 */
export function filterMultiDictText(dictOptions, text) {
  // js “!text” 认为0为空，所以做提前处理
  if (text === 0 || text === '0') {
    if (dictOptions) {
      for (const dictItem of dictOptions) {
        if (text == dictItem.value) {
          return dictItem.text
        }
      }
    }
  }

  if (!text || text == 'undefined' || text == 'null' || !dictOptions || dictOptions.length == 0) {
    return ''
  }
  let re = ''
  text = text.toString()
  const arr = text.split(',')
  dictOptions.forEach(function (option) {
    if (option) {
      for (let i = 0; i < arr.length; i++) {
        if (arr[i] === option.value) {
          re += option.text + ','
          break
        }
      }
    }
  })
  if (re == '') {
    return text
  }
  return re.substring(0, re.length - 1)
}

/** 获取url参数
 * @param {Object} url
 */
export function getQueryVariable(url) {
  if (!url) return
  let t
  let n
  let r
  const i = url.split('?')[1]
  const s = {}
  ;(t = i.split('&')), (r = null), (n = null)
  for (const o in t) {
    const u = t[o].indexOf('=')
    u !== -1 && ((r = t[o].substr(0, u)), (n = t[o].substr(u + 1)), (s[r] = n))
  }
  return s
}

/**
 * 是否oauth环境
 */
export function isOAuth2AppEnv() {
  let isOAuthEnv = false
  // #ifdef H5
  isOAuthEnv = /wxwork|dingtalk/i.test(navigator.userAgent)
  // #endif
  return isOAuthEnv
}

/**
 * 获取url中的参数
 * @param url
 */
export const getUrlParams = (url) => {
  const result = {
    url: '',
    params: {},
  }
  const list = url.split('?')
  result.url = list[0]
  const params = list[1]
  if (params) {
    const list = params.split('&')
    list.forEach((ele) => {
      const dic = ele.split('=')
      const label = dic[0]
      const value = dic[1]
      result.params[label] = value
    })
  }
  return result
}

/**
 * 判断文件地址是否支持存在
 * @param url
 * @returns {Promise<any>}
 */
export function downloadAbled(url) {
  return new Promise((resolve, reject) => {
    let xmlHttp
    if (window.XMLHttpRequest) {
      xmlHttp = new XMLHttpRequest() // 其他浏览器
    } else if ((window as any).ActiveXObject) {
      // try {
      //   xmlHttp = new window.ActiveXObject("Microsoft.XMLHTTP");//IE
      // }catch (e) {
      //   console.log('创建xmlHttp失败',e)
      // }
    }
    if (!xmlHttp) {
      reject('创建xmlHttp失败')
    }
    xmlHttp.open('GET', url, false)
    xmlHttp.send()
    if (xmlHttp.readyState == 4) {
      if (xmlHttp.status == 200) {
        resolve(true)
      } else if (xmlHttp.status == 404) {
        reject('文件不存在!')
      } else {
        reject('请求失败，status：' + xmlHttp.status)
      }
    } else {
      reject('请求失败，readyState:' + xmlHttp.readyState)
    }
  })
}

/**
 * app获取url地址的传参问题
 * @param url
 * @returns {Object}
 */
export function appGetUrlParams(url) {
  const theRequest = new Object()
  const index = url.indexOf('?')
  if (index != -1) {
    const str = url.substring(index + 1)
    const strs = str.split('&')
    for (let i = 0; i < strs.length; i++) {
      theRequest[strs[i].split('=')[0]] = unescape(strs[i].split('=')[1])
    }
  }
  return theRequest
}
/**
 *
 * @param lat1  纬度1
 * @param lng1  经度1
 * @param lat2  纬度2
 * @param lng2  经度2
 * 返回 米
 */
export function geoDistance(lng1, lat1, lng2, lat2) {
  let radLat1 = rad(lat1)
  let radLat2 = rad(lat2)
  let a = radLat1 - radLat2
  let b = rad(lng1) - rad(lng2)
  let s =
    2 *
    Math.asin(
      Math.sqrt(
        Math.pow(Math.sin(a / 2), 2) +
          Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b / 2), 2),
      ),
    )
  s = s * 6378.137 // EARTH_RADIUS;
  s = Math.round(s * 10000) / 10
  return s
}
//经纬度转换成三角函数中度分表形式。
function rad(d) {
  return (d * Math.PI) / 180.0
}

export function downloadFile(obj, androidDownloadTip = false) {
  let url = ''
  if (isMp) {
    if (obj.currentTarget) {
      url = encodeURI(obj.currentTarget.dataset.url)
      downloadNH5(url)
    } else if (isString(obj)) {
      // 为字符串类型时，可认为就是url
      url = getFileAccessHttpUrl(obj)
      downloadNH5(url)
    }
  } else if (isApp || isHarmony) {
    url = encodeURI(obj)
    downloadNH5(url, androidDownloadTip)
  } else if (isH5) {
    url = getFileAccessHttpUrl(obj)
    window.open(url)
  }
}
/**
 * 非H5文件下载地址
 * @param 文件路径 url
 */
function downloadNH5(url, androidDownloadTip = false) {
  const image_arr = ['png', 'jpg', 'jpeg']
  const fileType = url.split('.').pop()
  uni.showLoading({
    title: '加载中...',
    mask: true,
  })
  uni.downloadFile({
    url,
    success: (res) => {
      uni.hideLoading()
      if (res.statusCode == 200) {
        let filePath = res.tempFilePath
        const system = uni.getSystemInfoSync().platform
        if (system == 'ios') {
          // filePath = encodeURI(filePath)
        }
        if (isMp) {
          const suffix = getSuffix(url).toLowerCase()
          if (image_arr.indexOf(suffix) != -1) {
            // 预览图片
            uni.previewImage({
              urls: [filePath],
            })
          } else {
            uni.openDocument({
              filePath,
              fileType,
              success: (res) => {
                console.log('打开文档成功')
              },
              fail: (res) => {
                console.log('打开文档失败', res)
                tip.error('不支持打开此格式', true)
              },
            })
          }
        } else if (isApp || isHarmony) {
          const suffix = getSuffix(url).toLowerCase()
          if (image_arr.indexOf(suffix) != -1) {
            // 预览图片
            uni.previewImage({
              urls: [filePath],
            })
          } else {
            if (isHarmony) {
              if (androidDownloadTip) {
                // 鸿蒙下载文件并提示保存路径
                uni.saveFile({
                  tempFilePath: filePath,
                  fileType,
                  success: (saveRes) => {
                    const savedPath = saveRes.savedFilePath || ''
                    uni.showModal({
                      title: '提示',
                      content: `文件下载成功，已保存到:\n${savedPath}`,
                      confirmText: '打开文件',
                      cancelText: '关闭',
                      success: (modalRes) => {
                        if (modalRes.confirm) {
                          uni.openDocument({
                            filePath: savedPath,
                            fileType,
                            fail: () => {
                              uni.showToast({ title: '暂不支持打开此类型', duration: 2000 })
                            },
                          })
                        }
                      },
                    })
                  },
                  fail: () => {
                    // 保存失败则直接打开临时文件
                    uni.openDocument({
                      filePath,
                      fileType,
                      fail: () => {
                        tip.error('不支持打开此格式', true)
                      },
                    })
                  },
                })
              } else {
                uni.openDocument({
                  filePath,
                  fileType,
                  success: () => {
                    console.log('打开文档成功')
                  },
                  fail: () => {
                    tip.error('不支持打开此格式', true)
                  },
                })
              }
            } else if (system == 'ios') {
              uni.openDocument({
                filePath,
                fileType,
                success: (res) => {
                  console.log('打开文档成功')
                },
                fail: (res) => {
                  console.log('打开文档失败', res)
                  tip.error('不支持打开此格式', true)
                },
              })
            } else {
              if (androidDownloadTip && isApp) {
                // 或者直接构造路径（更推荐）
                let fileName = url.split('/').pop()
				if(fileName.indexOf('download?fileId')>=0){
					fileName = new Date().getTime()
				}
                const dtask = plus.downloader.createDownload(
                  url,
                  {
                    filename: `_downloads/KGOA/${fileName}`,
                  },
                  function (d, status) {
                    console.log('下载d:', d)
                    // d为下载的文件对象
                    if (status === 200) {
                      // 下载成功,d.filename是文件在保存在本地的相对路径，使用下面的API可转为平台绝对路径
                      const fileSaveUrl = plus.io.convertLocalFileSystemURL(d.filename)
                      uni.showModal({
                        title: '提示',
                        content: '文件下载成功，是否打开所在目录？',
                        success: (res) => {
                          if (res.confirm) {
                            // plus.runtime.openFile(d.filename) // 选择软件打开文件
                            const fileDir = fileSaveUrl.substring(0, fileSaveUrl.lastIndexOf('/'))
                            console.log('打开目录fileDir:', fileDir)
                            // 使用系统文件管理器打开目录
                            plus.runtime.openFile(fileDir, {}, function (e) {
                              // 如果直接打开目录失败，可以尝试其他方式
                              console.log('打开目录失败:', e.message)
                              // 备选方案：使用Android Intent
                              const fileDirReplace = fileSaveUrl.replace(
                                  '/storage/emulated/0/',
                                  '',
                              )
                              if (plus.os.name === 'Android') {
                                uni.showModal({
                                  title: '提示',
                                  content: `文件已保存到应用目录，请在文件管理器中查找:\n${fileDirReplace}`,
                                  showCancel: false,
                                })
                              }
                            })
                          }
                        },
                      })
                    } else {
                      // 下载失败
					  uni.hideLoading()
                      plus.downloader.clear() // 清除下载任务
                    }
                  },
                )
                dtask.start()
              } else {
                uni.saveFile({
                  tempFilePath: filePath,
                  fileType,
                  success: (res) => {
                    // 保存成功并打开文件
                    tip.success('保存成功')
                    uni.hideLoading()
                    uni.openDocument({
                      filePath: res.savedFilePath,
                      success: function (res) {
                        console.log('openDocument', res)
                      },
                      fail() {
                        uni.showToast({
                          title: '暂不支持打开此类型',
                          duration: 2000,
                        })
                      },
                    })
                  },
                  fail: () => {
                    // 确保在saveFile失败时也隐藏加载弹窗
                    uni.hideLoading()
                    tip.alert('保存失败')
                  },
                })
              }
            }
          }
        }
      } else {
        uni.hideLoading()
        tip.alert('文件异常')
      }
    },
    fail: (err) => {
      uni.hideLoading()
      tip.alert('下载失败')
    },
  })
}
// 获取后缀
export function getSuffix(text) {
  if (text) {
    const arr = text.split('.')
    const suffix = arr[arr.length - 1]
    return suffix
  }
  return text
}
/**
 * 获取后缀图标
 * @param {Object} doctype
 */
export function getFileIcon(doctype) {
  const file_doc_type_arr = ['doc', 'excel', 'file', 'folder', 'image', 'pdf', 'video']

  if (file_doc_type_arr.indexOf(doctype) >= 0) {
    return `/static/${doctype}.png`
  } else {
    return '/static/file.png'
  }
}
/**
 * 获取uuid
 */
export function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export const queryString = (params) => {
  return Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value as string)}`)
    .join('&')
}

/**
 * 将任意日期转换为对应季度的首日
 * @param {Date|string} date - 日期对象或日期字符串
 * @returns {string} 格式为'YYYY-MM-DD'的季度首日
 */
export function dateToQuarterStart(date) {
  if (!date){
    return ''
  }
  // 如果传入的是字符串，转换为Date对象
  if (typeof date === 'string') {
    date = new Date(date)
  }

  const year = date.getFullYear()
  const month = date.getMonth() // 0-11

  // 计算季度
  const quarter = Math.floor(month / 3)

  // 确定季度首月的月份 (0=1月, 3=4月, 6=7月, 9=10月)
  const quarterStartMonth = quarter * 3

  // 格式化为'YYYY-MM-DD'
  return `${year}-${String(quarterStartMonth + 1).padStart(2, '0')}-01`
}

//时间数组
export function timeData(startTime = '08:00', endTime = '18:30', timeInterval = 0.5) {
  const time = []
  const date = timeStamp(Date.now()).allDate
  const startDate = `${date} ${startTime}`
  const endDate = `${date} ${endTime}`
  const startTimeStamp = new Date(startDate).getTime()
  const endTimeStamp = new Date(endDate).getTime()
  const timeStr = 3600 * 1000 * timeInterval
  console.log(startTimeStamp)
  for (let i = startTimeStamp; i <= endTimeStamp; i = i + timeStr) {
    const timeObj:any = {}
    timeObj.time = timeStamp(i).hour
    timeObj.disable = 0
    time.push(timeObj)
  }
  return time
}
//字符串拼接
function strFormat(str) {
  return str < 10 ? `0${str}` : str
}
//时间戳转字符串
export function timeStamp(time) {
  const dates = new Date(time)
  const year = dates.getFullYear()
  const month = dates.getMonth() + 1
  const date = dates.getDate()
  const day = dates.getDay()
  const hour = dates.getHours()
  const min = dates.getMinutes()
  const days = ['日', '一', '二', '三', '四', '五', '六']
  return {
    allDate: `${year}/${strFormat(month)}/${strFormat(date)}`,
    date: `${strFormat(month)}-${strFormat(date)}`, //返回的日期 07-01
    day: `星期${days[day]}`, //返回的礼拜天数  星期一
    hour: strFormat(hour) + ':' + strFormat(min) //返回的时钟 08:00
  }
}
/**
 * 字符串转时间
 * @param {Object} dateString
 */
export function stringToDate(dateString) {
  var newDate = new Date();
  var yearNum = Number(dateString.substr(0,4));
  var monthNum = Number(dateString.substr(5,2))-1;
  var dayNum = Number(dateString.substr(8,2));
  var hourNum = Number(dateString.substr(11,2));
  var minuteNum = Number(dateString.substr(14,2));

  //var secondNum = Number(dateString.substr(12,2));
  newDate.setFullYear(yearNum);
  newDate.setMonth(monthNum);
  newDate.setDate(dayNum);
  newDate.setHours(hourNum);
  newDate.setMinutes(minuteNum);
  //newDate.setSeconds(secondNum);
  return newDate;
}

export const getDictItemsByCode = async (code) => {
  const dictItems = uni.getStorageSync('sysAllDictItems')
  // 1.先从本地缓存
  if (dictItems && dictItems[code]) {
    return dictItems[code]
  }
  // 2.再从后端获取
  const res: any = await http.get(`/sys/dict/getDictItems/${code}`)
  if (res.success) {
    return res.result
  }
  return []
}

// ================== 密码加密相关 ==================
// 密码加密统一使用 AES CBC 模式，前后端 key 和 iv 必须保持一致
// AES_KEY 和 AES_IV 需与后端配置完全一致，否则加密/解密会失败
// ================== 密码加密相关 ===========BEGIN=======

// AES加密key和iv常量
export const AES_KEY = '1234567890adbcde'
export const AES_IV = '1234567890hjlkew'

/**
 * AES CBC 加密，使用全局常量 AES_KEY 和 AES_IV
 * @param plainText 明文
 * @returns 加密后的密文
 */
export function encryptAESCBC(plainText: string): string {
  const key = parse(AES_KEY);
  const iv = parse(AES_IV);
  // CBC 是 AES 的默认模式，无需显式指定 mode 参数
  return encrypt(plainText, key, {
    iv: iv,
    padding: pkcs7
  }).toString();
}
// ================== 密码加密相关 =============END=====

/*
* 跳转路由 (如果当前页面栈有目标页面，则返回目标页面，否则跳转目标页面)
* @param {Object} params
* @param {string} params.routeName - 路由名称
* @param {string} params.routePath - 路由路径
* @param {string} params.routeMethod - 路由方法
* @returns {void}
*/
export const goRoute = ({
  routeName,
  routePath,
  routeMethod = 'push',
  router,
}: {
  routeName?: string
  routePath?: string
  routeMethod?: string
  router: any
}) => {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    if (routeName) {
      const findPageIndex = pages.findIndex((item) => {
        const route = item.route
        const name = route.split('/').pop()
        return name === routeName
      })
      if (findPageIndex == -1) {
        router[routeMethod]({ name: routeName })
      } else {
        router.back({ delta: pages.length - findPageIndex - 1, animationType: 'pop-out' })
      }
    } else if (routePath) {
      const findPageIndex = pages.findIndex((item) => {
        const route = item.route
        return route === routePath
      })
      if (findPageIndex == -1) {
        router[routeMethod]({ path: routePath })
      } else {
        router.back({ delta: pages.length - findPageIndex - 1, animationType: 'pop-out' })
      }
    }
  } else {
    router[routeMethod]({ name: routeName })
  }
}

// ios中中文字符串转义
export const iosStrUnescape = (str: string) => {
  const globalData = getApp().globalData
  const { systemInfo, navHeight } = globalData
  const { platform } = systemInfo
  // 处理 %uXXXX 格式的Unicode编码
  console.log('str1', str)
  if (isString(str) && platform === 'ios') {
    console.log('str2', str)
    try {
      // 处理 %uXXXX 格式的Unicode编码
      if (str.includes('%u')) {
        console.log('str3', str)
        str = unescape(str)
      }
    } catch (e) {
      // 如果解码失败，使用原始值
      console.log('decode error:', e)
    }
  }
  console.log('str4', str)
  return str
}
/**
 * 确定是否存在权限
 */
export function hasFormPermission(value, allCodeList = [], formData = {}): boolean {
  if (!isArray(value) && allCodeList && allCodeList.length > 0) {
    //= ============================工作流权限判断-显示-begin==============================================
    if (formData) {
      const code = value as string
      if (hasBpmPermission(code, '1', formData) === true) {
        return true
      }
    }
    //= ============================工作流权限判断-显示-end==============================================
    return allCodeList.includes(value)
  }
  return (intersection(value, allCodeList) as string[]).length > 0
}
/**
 * 是否禁用组件
 */
export function isFormDisabledAuth(value?, allCodeList = [], formData = {}): boolean {
  //= ============================工作流权限判断-禁用-begin==============================================
  if (formData) {
    const code = value as string
    if (hasBpmPermission(code, '2', formData) === true) {
      return true
    }
  }
  //= ============================工作流权限判断-禁用-end==============================================
  return !hasFormPermission(value, allCodeList, formData)
}

export function hasBpmPermission(code, type, formData: any = {}) {
  // 禁用-type=2
  // 显示-type=1
  const codeList: string[] = []
  const permissionList = formData.permissionList
  if (permissionList && permissionList.length > 0) {
    for (const item of permissionList) {
      if (item.type === type) {
        codeList.push(item.action)
      }
    }
  }
  return codeList.indexOf(code) >= 0
}
