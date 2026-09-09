import { geoDistance } from '@/common/uitls'
// #ifdef MP-WEIXIN || APP-PLUS || APP-HARMONY
import amap from '@/common/js-sdk/js-amap/amap-wx'
import gcoord from 'gcoord'
// #endif

// #ifdef H5
import H5Map from '@/common/js-sdk/js-amap/amap-h5'
// #endif

export default function useGeoSign<T>() {
  // 定义响应式数据
  const amapPlugin = ref(null)
  // 高德地图微信key
  const wxMapKey = import.meta.env.VITE_GD_MAP_KEY__WEIXIN
  // 打卡距离
  const distance = ref(0)
  // 当前地址
  const address = ref('')
  // 当前纬度
  const latitude = ref(null)
  // 当前经度
  const longitude = ref(null)
  // 打卡范围
  const range = 10
  // 地图配置
  const resAmap = ref(null)
  // 显示打卡提示
  const showLocationTip = ref(true)
  // 在打卡范围内
  const inCircle = () => {
    return distance.value <= range
  }
  // 清除地理打卡信息
  const resetLocation = () => {
    address.value = null
    latitude.value = null
    longitude.value = null
  }
  // 刷新定位
  const refreshLocation = (showTip = true) => {
    showLocationTip.value = showTip
    resetLocation()
    // #ifdef MP-WEIXIN
    getAuthorizeInfo()
    // #endif

    // #ifdef APP-PLUS || APP-HARMONY
    const systemInfo = uni.getSystemInfoSync()
    if (systemInfo.platform === 'ios') {
      // update-begin-author:liaozhiyang date:2025-01-15 for:解决ios离线打包定位不生效的问题
      uni.getLocation({
        type: 'wgs84',
        success: (res) => {
          const latitude = res.latitude
          let longitude = res.longitude
          let result = gcoord.transform([longitude, latitude], gcoord.WGS84, gcoord.GCJ02)
          getLocationInfo(result.join(','))
        },
        fail: (res) => {
          console.log('res:::', res)
        },
      })
      // update-end-author:liaozhiyang date:2025-01-15 for:解决ios离线打包定位不生效的问题
    } else {
      getLocationInfo()
    }
    // #endif

    // #ifdef H5
    // 1. 为高德 SDK 单独配置安全密钥
    window._AMapSecurityConfig = {
      securityJsCode: '7a542edee4a82e56ed88fef8ef42b5a5', // 必须再次配置！
    }
    initH5Map()
    // #endif
  }
  /**
   * 权限提示
   */
  const getAuthorizeInfo = () => {
    // 1. uniapp弹窗弹出获取授权（地理，个人微信信息等授权信息）弹窗
    uni.authorize({
      scope: 'scope.userLocation',
      success() {
        // 1.1 允许授权
        getLocationInfo()
      },
      fail() {
        console.log('你拒绝了授权，无法获得周边信息')
        openConfirm()
      },
    })
  }
  /**
   * 地理定位
   */
  const getLocationInfo = (location?: string) => {
    if (showLocationTip.value) {
      uni.showLoading({
        title: '定位中...',
        mask: true,
      })
    }
    amapPlugin.value.getRegeo({
      type: 'gcj02',
      location: location,
      success: function (res) {
	    console.log("getLocationInfo res》》",res)
        latitude.value = res[0].latitude
        longitude.value = res[0].longitude
        address.value = res[0].name + res[0].desc
        setTimeout(() => {
          if (showLocationTip.value) uni.hideLoading()
        }, 1000)
      },
      fail: (res) => {
		console.log("getLocationInfo res  fail》》",res)
        setTimeout(() => {
          if (showLocationTip.value) uni.hideLoading()
        }, 1000)
      },
    })
    // TODO  h5端可能因为非https域名会导致一直处在定位中的状态，因此设置10s后清除加载状态
    setTimeout(() => {
      uni.hideLoading()
    }, 10000)
  }
  /**
   * 获取地理授权
   */
  const openConfirm = () => {
    uni.showModal({
      title: '请求授权当前位置',
      content: '需要获取您的地理位置，请确认授权',
      success: (res) => {
        if (res.confirm) {
          uni.openSetting()
        } else if (res.cancel) {
          uni.showToast({
            title: '你拒绝了授权，无法获得位置信息',
            icon: 'none',
            duration: 1000,
          })
        }
      },
    })
  }
  /**
   * 根据坐标返回地址(逆地理编码)
   * @param points
   * @returns {Promise<void>}
   */
  const getAddress = async (points) => {
    try {
      resAmap.value = await H5Map()
      resAmap.value.plugin('AMap.Geocoder', () => {
        const geocoder = new resAmap.value.Geocoder({
          radius: 1000,
        })
        geocoder.getAddress(points, (status, result) => {
          if (status === 'complete' && result.regeocode.formattedAddress) {
            address.value = result.regeocode.formattedAddress
          }
        })
      })
    } catch (e) {
      console.log(e)
    }
  }

  // #ifdef H5
  const reverseGeocode = (lng, lat) => {
    resAmap.value.plugin('AMap.Geocoder', () => {
      const geocoder = new resAmap.value.Geocoder()
      geocoder.getAddress([lng, lat], (status, result) => {
        console.log(status, result)
        if (status === 'complete' && result.info === 'OK') {
          address.value = result.regeocode.formattedAddress
        }
      })
    })
  }
  /**
   * 高德地图H5初始化
   */
  const initH5Map = async () => {
    try {
      if (showLocationTip.value) {
        uni.showLoading({
          title: '定位中...',
          mask: true,
        })
        setTimeout(() => {
          uni.hideLoading()
        }, 5000)
      }
      resAmap.value = await H5Map()
      resAmap.value.plugin('AMap.Geolocation', () => {
        const geolocation = new resAmap.value.Geolocation({
          enableHighAccuracy: true,
          timeout: 5000,
          buttonPosition: 'RB',
          zoomToAccuracy: true,
        })
        geolocation.getCurrentPosition(function (status, result) {
          if (status === 'complete') {
            onComplete(result)
          } else {
            onError(result)
          }
        })
      })

      const onComplete = (data) => {
        console.log('H5高德定位data:', data)
        longitude.value = data?.position?.lng
        latitude.value = data?.position?.lat
        address.value = data?.formattedAddress
        console.log('当前位置的纬度：' + data.position.lat)
        console.log('当前位置的经度：' + data.position.lng)
        console.log('当前定位地址：' + data?.formattedAddress)
        uni.hideLoading()
        if (!data.isConverted) {
          // 可以尝试手动逆地理编码
          reverseGeocode(longitude.value, latitude.value)
        }
      }

      const onError = (data) => {
        console.log(data)
        if (showLocationTip.value) {
          uni.showToast({
            title: '定位失败',
            icon: 'error',
            duration: 1000,
          })
        }
      }
    } catch (e) {
      console.log('initH5Map', e)
      uni.hideLoading()
    }
  }

  // #endif
  // #ifdef MP-WEIXIN || APP-PLUS || APP-HARMONY
  amapPlugin.value = new amap.AMapWX({
    key: wxMapKey,
  })
  // #endif

  return { inCircle, refreshLocation, longitude, latitude, address }
}
