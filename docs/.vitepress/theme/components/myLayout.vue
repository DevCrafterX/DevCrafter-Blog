<!--
 * @Author: GZF
 * @Date: 2025-01-19 09:32:28
 * @Description: 亮暗模式切换
-->

<script lang="ts" setup>
  import MouseClick from "./MouseClick.vue";
  import MouseFollower from "./MouseFollower.vue";
  import {useData, useRoute} from 'vitepress'
  import DefaultTheme from 'vitepress/theme'
  import {nextTick, provide, computed} from 'vue'

  import BackToTop from "./backToTop.vue"
  import notice from "./notice.vue"
  import bsz from "./bsz.vue"

  const {isDark} = useData()
  const route = useRoute()

  // 判断是否在导航页面，导航页面不显示评论
  const isNavigationPage = computed(() => {
    return route.path.includes('/navigation/') || route.path.includes('/Navigation/')
  })
  // 检查浏览器是否支持 View Transitions API
  const enableTransitions = () =>
      'startViewTransition' in document &&
      window.matchMedia('(prefers-reduced-motion: no-preference)').matches

  provide('toggle-appearance', async ({clientX: x, clientY: y}: MouseEvent) => {
    if (!enableTransitions()) {
      isDark.value = !isDark.value
      return
    }
    // 计算圆形裁剪路径
    // 圆心位置：鼠标点击坐标 (x, y)
    // 起始半径：0px（从点击点开始）
    // 结束半径：使用 Math.hypot() 计算从点击点到屏幕最远角落的距离
    // Math.max(x, innerWidth - x)：取左右方向的最大距离
    // Math.max(y, innerHeight - y)：取上下方向的最大距离
    // 确保圆形能完全覆盖整个视口
    const clipPath = [
      `circle(0px at ${x}px ${y}px)`,
      `circle(${Math.hypot(
          Math.max(x, innerWidth - x),
          Math.max(y, innerHeight - y)
      )}px at ${x}px ${y}px)`
    ]

    //startViewTransition 创建新旧状态的快照
    // 在回调中切换 isDark 值，触发主题变化
    await document.startViewTransition(async () => {
      isDark.value = !isDark.value
      await nextTick()
    }).ready

    // 正向切换（亮→暗）：从 circle(0px) 扩展到 circle(大半径)
    // 反向切换（暗→亮）：clipPath.reverse() 反转数组，从大到小收缩
    // 伪元素选择：通过 ::view-transition-old/new(root) 控制哪个层应用动画
    document.documentElement.animate(
        {clipPath: isDark.value ? clipPath.reverse() : clipPath},
        {
          duration: 300,
          easing: 'ease-in',
          fill: 'forwards',
          pseudoElement: `::view-transition-${isDark.value ? 'old' : 'new'}(root)`
        }
    )
  })
</script>

<template>
  <DefaultTheme.Layout>
    <template #doc-footer-before>
      <BackToTop />
      <bsz />
    </template>
    <template #doc-after>
      <GiscusComment v-if="!isNavigationPage" />
    </template>
    <template #layout-top>
      <MouseFollower />
      <MouseClick />
      <notice />
    </template>
  </DefaultTheme.Layout>
</template>

<style>
  /* 恢复原始视图过渡动画 */
    ::view-transition-old(root),
    ::view-transition-new(root) {
      animation: none;
      mix-blend-mode: normal;
    }

    ::view-transition-old(root),
    .dark::view-transition-new(root) {
      z-index: 1;
    }

    ::view-transition-new(root),
    .dark::view-transition-old(root) {
      z-index: 9999;
    }

    /* 恢复原始开关按钮 */
    /* .VPSwitchAppearance {
      width: 22px !important;
    } */

    .VPSwitchAppearance .check {
      transform: none !important;
    }

    /* 修正因视图过渡导致的按钮图标偏移 */
    .VPSwitchAppearance .check .icon {
      top: -2px;
    }
</style>
