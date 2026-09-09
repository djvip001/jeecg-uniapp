// manifest.config.ts
import { defineManifestConfig } from '@uni-helper/vite-plugin-uni-manifest'
import path from 'node:path'
import { loadEnv } from 'vite'

// 获取环境变量的范例
const env = loadEnv(process.env.NODE_ENV!, path.resolve(process.cwd(), 'env'))
const {
  VITE_APP_TITLE,
  VITE_UNI_APPID,
  VITE_WX_APPID,
  VITE_APP_PUBLIC_BASE,
  VITE_FALLBACK_LOCALE,
} = env

export default defineManifestConfig({
  name: VITE_APP_TITLE,
  appid: VITE_UNI_APPID,
  description: '',
  versionName: '1.0.0',
  versionCode: '100',
  transformPx: false,
  locale: VITE_FALLBACK_LOCALE, // 'zh-Hans'
  /* 5+App特有相关 */
  'app-plus': {
    usingComponents: true,
    webView: {
      render: 'always',
      userAgent: '',
    },
    nvueStyleCompiler: 'uni-app',
    compilerVersion: 3,
    compatible: {
      ignoreVersion: true,
    },
    splashscreen: {
      alwaysShowBeforeRender: true,
      waiting: true,
      autoclose: true,
      delay: 0,
    },
    /* 模块配置 */
    modules: {
      Maps: {},
      Messaging: {},
      Contacts: {},
      Camera: {},
      Barcode: {},
	  Push: {}
    },
    /* 应用发布信息 */
    distribute: {
      /* android打包配置 */
      android: {
        minSdkVersion: 26,
        targetSdkVersion: 34,
        abiFilters: ['armeabi-v7a', 'arm64-v8a'],
        permissions: [
          '<uses-permission android:name="android.permission.CHANGE_NETWORK_STATE"/>',
          '<uses-permission android:name="android.permission.MOUNT_UNMOUNT_FILESYSTEMS"/>',
          '<uses-permission android:name="android.permission.VIBRATE"/>',
          '<uses-permission android:name="android.permission.READ_LOGS"/>',
          '<uses-permission android:name="android.permission.ACCESS_WIFI_STATE"/>',
          '<uses-feature android:name="android.hardware.camera.autofocus"/>',
          '<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>',
          '<uses-permission android:name="android.permission.CAMERA"/>',
		  '<uses-permission android:name="android.permission.CALL_PHONE"/>',
		  '<uses-permission android:name="android.permission.CALL_PRIVILEGED"/>',
          '<uses-permission android:name="android.permission.GET_ACCOUNTS"/>',
          '<uses-permission android:name="android.permission.READ_PHONE_STATE"/>',
          '<uses-permission android:name="android.permission.CHANGE_WIFI_STATE"/>',
          '<uses-permission android:name="android.permission.WAKE_LOCK"/>',
          '<uses-permission android:name="android.permission.FLASHLIGHT"/>',
		  '<uses-permission android:name="android.permission.RECORD_AUDIO"/>',
		  '<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS"/>',
          '<uses-feature android:name="android.hardware.camera"/>',
          '<uses-permission android:name="android.permission.WRITE_SETTINGS"/>',
          '<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />',
          '<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />',
          '<uses-permission android:name="android.permission.MANAGE_EXTERNAL_STORAGE" />',
		  '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />',
		  '<uses-permission android:name="android.permission.INTERNET" />',
		  '<uses-permission android:name="com.huawei.appmarket.service.commondata.permission.GET_COMMON_DATA" />'
		],
      },
      /* ios打包配置 */
      ios: {
        permissions: {
          Documents: true,
        },
      },
      /* SDK配置 */
      sdkConfigs: {
        maps: {
          amap: {
            name: 'amap_15931993294Bqxlq8EgG',
            appkey_ios: 'c913e46ffdf548ebc56ac1cf4d883e7e',
            appkey_android: 'c913e46ffdf548ebc56ac1cf4d883e7e',
          },
        },
        push: {
          unipush: {
            version: '2',
            offline: true,
            hms: {},
			vivo: {},
			meizu: {},
			honor: {}
          },
        },
      },
      /* 图标配置 */
      icons: {
        android: {
          hdpi: 'src/static/app/icons/72x72.png',
          xhdpi: 'src/static/app/icons/96x96.png',
          xxhdpi: 'src/static/app/icons/144x144.png',
          xxxhdpi: 'src/static/app/icons/192x192.png',
        },
        ios: {
          appstore: 'src/static/app/icons/1024x1024.png',
          ipad: {
            app: 'src/static/app/icons/76x76.png',
            'app@2x': 'src/static/app/icons/152x152.png',
            notification: 'src/static/app/icons/20x20.png',
            'notification@2x': 'src/static/app/icons/40x40.png',
            'proapp@2x': 'src/static/app/icons/167x167.png',
            settings: 'src/static/app/icons/29x29.png',
            'settings@2x': 'src/static/app/icons/58x58.png',
            spotlight: 'src/static/app/icons/40x40.png',
            'spotlight@2x': 'src/static/app/icons/80x80.png',
          },
          iphone: {
            'app@2x': 'src/static/app/icons/120x120.png',
            'app@3x': 'src/static/app/icons/180x180.png',
            'notification@2x': 'src/static/app/icons/40x40.png',
            'notification@3x': 'src/static/app/icons/60x60.png',
            'settings@2x': 'src/static/app/icons/58x58.png',
            'settings@3x': 'src/static/app/icons/87x87.png',
            'spotlight@2x': 'src/static/app/icons/80x80.png',
            'spotlight@3x': 'src/static/app/icons/120x120.png',
          },
        },
      },
    },
  },
  /* 快应用特有相关 */
  quickapp: {},
  /* 小程序特有相关 */
  'mp-weixin': {
    appid: VITE_WX_APPID,
    setting: {
      urlCheck: false,
      minified: true,
      es6: true,
    },
    usingComponents: true,
    lazyCodeLoading: 'requiredComponents',
    // __usePrivacyCheck__: true,
  },
  'mp-alipay': {
    usingComponents: true,
    styleIsolation: 'shared',
  },
  'mp-baidu': {
    usingComponents: true,
  },
  'mp-toutiao': {
    usingComponents: true,
  },
  h5: {
    router: {
      base: VITE_APP_PUBLIC_BASE,
    },
    sdkConfigs: {
      maps: {
        amap: {
          key: '20854e7d231ee339bfa3b277c840070c',
          securityJsCode: '7a542edee4a82e56ed88fef8ef42b5a5',
          serviceHost: '',
        },
      },
    },
  },
  'app-harmony': {
    distribute: {
      bundleName: 'uniapp.demo.test1',
      minPlatformVersion: 14,
      compatibleSDKVersion: 14,
      signingConfigs: {
        default: {
          certpath: '/Users/liaozhiyang/app-publish-p12/HarmonyOS/dev/lingang_dev.cer',
          keyAlias: 'lingangProdKey',
          keyPassword:
            '000000230ED38504C1D83D153C1501F96DACF1CAD117140F1AC4DD88388430D4B47E72C0C502D9DF9F9031306F9191F404C77A',
          profile: '/Users/liaozhiyang/app-publish-p12/HarmonyOS/dev/lingang_profileDebug.p7b',
          signAlg: 'SHA256withECDSA',
          storeFile: '/Users/liaozhiyang/app-publish-p12/HarmonyOS/dev/lingang.p12',
          storePassword:
            '000000230AF80433778FEFC231CCE43617B50F5A38BB5B5DF920E7782D68810E25AF3A8DC9084C9BD971FDBF9A775BDB52D037',
        },
      },
    },
  },
  uniStatistics: {
    enable: false,
  },
  vueVersion: '3',
})
