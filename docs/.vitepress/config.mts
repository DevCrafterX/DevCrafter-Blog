import {defineConfigWithTheme} from 'vitepress'
import escookConfig from "@escook/vitepress-theme/config"

import {sharedConfig} from './theme/config/share'
import {zhConfig} from './theme/config/zh'
import {enConfig} from './theme/config/en'

// https://vitepress.dev/reference/site-config
export default defineConfigWithTheme({
  // 继承 escook 主题配置
  extends: escookConfig,
  ...sharedConfig,
  base: '/DevCrafter-Blog/',
  locales: {
    root: {
      label: '简体中文',
      lang: 'Zh_CN',
      ...zhConfig
    },
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      ...enConfig
    },
  },
})
