<template>
  <!-- 使用 Teleport 将组件渲染到 body，避免被父组件样式影响 -->
  <Teleport to="body">
    <div :class="{ dark: isDark }" class="music-player">
      <!-- ==================== 悬浮控制球 ==================== -->
      <!-- 点击封面可播放/暂停，点击背景可展开面板 -->
      <div class="control-ball">
        <!-- 有封面时显示封面图片 -->
        <img v-if="currentSong.cover" :src="currentSong.cover" alt="cover" class="ball-cover" @click="togglePlay" />
        <!-- 无封面时显示默认图标 -->
        <div v-else class="ball-inner" @click="togglePanel">
          <span class="ball-icon">♪</span>
        </div>

        <!-- 播放/暂停状态指示器（有封面时显示在左下角） -->
        <div v-if="currentSong.cover" :class="['play-pause-indicator', { 'playing': isPlaying }]" @click="togglePlay">
          <span></span>
          <span></span>
          <span></span>
        </div>

        <!-- 展开面板按钮（有封面时显示在右下角） -->
        <div v-if="currentSong.cover" class="expand-btn" @click="togglePanel">
          <span>☰</span>
        </div>
      </div>

      <!-- ==================== 播放器面板 ==================== -->
      <!-- 点击面板外部可关闭，点击面板内部不会触发关闭 -->
      <div v-if="isExpanded" class="player-panel" @click.stop>
        <!-- 关闭按钮 -->
        <button class="panel-close" @click="isExpanded = false">✕</button>

        <!-- ==================== 搜索区域 ==================== -->
        <!-- 用户可以搜索歌曲，搜索结果会显示在下方 -->
        <div class="search-section">
          <div class="search-box">
            <input v-model="searchKeyword" placeholder="搜索歌曲..." type="text" @keyup.enter="search" />
            <button class="search-btn" @click.stop.prevent="search">
              <span class="search-btn-text">搜索</span>
              <span class="search-btn-icon">🔍</span>
            </button>
          </div>

          <!-- 搜索结果列表 -->
          <div v-if="searchResults.length > 0" class="search-results">
            <div v-for="(song, index) in searchResults" :key="song.id || index" :class="{ disabled: !song.canPlay }" class="song-item" @click.stop.prevent="song.canPlay && playSong(song)">
              <img v-if="song.cover" :src="song.cover" alt="cover" class="song-cover" />
              <div v-else class="song-cover default-cover">♪</div>
              <div class="song-info">
                <div class="song-name">{{ song.name }}</div>
                <div class="song-artist">{{ song.artist }}</div>
                <div v-if="!song.canPlay" class="no-play-tip">无播放资源</div>
              </div>
              <span v-if="song.canPlay" class="play-icon">▶</span>
              <span v-else class="play-icon disabled-icon">✕</span>
            </div>
          </div>
        </div>

        <!-- ==================== 当前播放信息 ==================== -->
        <!-- 显示当前正在播放的歌曲信息和控制按钮 -->
        <div v-if="currentSong.id" class="now-playing-card">
          <!-- 第一行：封面 + 歌曲信息 + 按钮 -->
          <div class="npc-row">
            <!-- 歌曲封面 -->
            <img v-if="currentSong.cover" :src="currentSong.cover" alt="cover" class="npc-cover" />
            <div v-else class="npc-cover default-cover">♪</div>

            <!-- 歌曲信息 -->
            <div class="npc-info">
              <div class="npc-name">{{ currentSong.name }}</div>
              <div class="npc-artist">{{ currentSong.artist }}</div>
              <div class="npc-server">{{ getCurrentServerName() }}</div>
            </div>

            <!-- 控制按钮组 -->
            <div class="npc-buttons">
              <!-- 数据源切换按钮（网易云音乐/QQ音乐） -->
              <button class="npc-switch-btn" :title="`当前: ${getCurrentServerName()}，点击切换`" @click="switchServer">
                <span class="switch-icon"></span>
              </button>

              <!-- 歌词显示/隐藏按钮 -->
              <button :class="{ active: showLyrics }" class="npc-lyric-btn" title="歌词" @click="showLyrics = !showLyrics">
                <svg fill="currentColor" height="20" viewBox="0 0 24 24" width="20">
                  <path d="M12 3v9.28c-.47-.17-.97-.28-1.5-.28C8.01 12 6 14.01 6 16.5S8.01 21 10.5 21c2.31 0 4.2-1.75 4.45-4H15V6h4V3h-7z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- ==================== 歌词显示区域 ==================== -->
        <!-- 点击歌词按钮后展开，显示当前歌曲的歌词 -->
        <div v-if="showLyrics && currentSong.id" class="lyrics-container">
          <div v-if="lyrics.length > 0" ref="lyricsRef" class="lyrics-scroll">
            <!-- 如果是单行歌词（纯文本，无时间戳） -->
            <div v-if="lyrics.length === 1 && lyrics[0].time === 0" class="lyric-text-only">
              {{ lyrics[0].text }}
            </div>
            <!-- 如果是标准 LRC 格式歌词（带时间戳，会高亮当前行） -->
            <div v-else v-for="(line, index) in lyrics" :key="index" :class="{ active: index === currentLyricIndex }" class="lyric-line">
              {{ line.text }}
            </div>
          </div>
          <div v-else class="lyrics-empty">暂无歌词</div>
        </div>

        <!-- ==================== 播放控制按钮 ==================== -->
        <!-- 上一首、播放/暂停、下一首 -->
        <div class="player-controls">
          <button class="ctrl-btn" title="上一首" @click="prevSong">
            <svg fill="currentColor" height="20" viewBox="0 0 24 24" width="20">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>
          <button :title="isPlaying ? '暂停' : '播放'" class="ctrl-btn play-btn" @click="togglePlay">
            <svg v-if="!isPlaying" fill="currentColor" height="24" viewBox="0 0 24 24" width="24">
              <path d="M8 5v14l11-7z" />
            </svg>
            <svg v-else fill="currentColor" height="24" viewBox="0 0 24 24" width="24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          </button>
          <button class="ctrl-btn" title="下一首" @click="nextSong">
            <svg fill="currentColor" height="20" viewBox="0 0 24 24" width="20">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>
        </div>

        <!-- ==================== 热歌榜列表 ==================== -->
        <!-- 显示当前数据源的热歌榜，点击可播放对应歌曲 -->
        <div class="hot-songs-section">
          <div class="section-title">
            热歌榜
            <span v-if="hotSongs.length === 0" class="loading-text">(加载中...)</span>
          </div>
          <div v-if="hotSongs.length > 0" class="hot-songs-list">
            <div v-for="(song, index) in hotSongs" :key="song.id" :class="{ active: currentSong.id === song.id }" class="hot-song-item" @click="playHotSong(index)">
              <span class="song-index">{{ index + 1 }}</span>
              <span class="song-name">{{ song.name }}</span>
              <span class="song-artist">{{ song.artist }}</span>
              <!-- 播放中动画图标（三条跳动的竖线） -->
              <span v-if="currentSong.id === song.id && isPlaying" class="playing-icon">
                <span></span>
                <span></span>
                <span></span>
              </span>
            </div>
          </div>
          <div v-else class="hot-songs-empty">暂无可用歌曲</div>
        </div>

        <!-- ==================== 进度条和音量控制 ==================== -->
        <!-- 第一行：播放进度条 -->
        <!-- 第二行：音量控制条 -->
        <div class="progress-section">
          <!-- 第一行：时间 + 歌曲进度条 -->
          <div class="progress-row">
            <span class="time-text">{{ formatTime(currentTime) }}</span>
            <div class="progress-bar-ui" @click="seek">
              <div class="progress-bg">
                <div :style="{ width: progressPercent + '%' }" class="progress-fill-ui"></div>
              </div>
            </div>
          </div>

          <!-- 第二行：音量图标 + 音量进度条 -->
          <div class="progress-row">
            <!-- 音量图标（根据音量大小显示不同图标） -->
            <svg class="vol-icon-small" fill="currentColor" height="14" viewBox="0 0 24 24" width="14">
              <path
                v-if="volume > 50"
                d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              <path v-else-if="volume > 0" d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
              <path v-else d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
            </svg>
            <div class="vol-bar-ui">
              <div class="vol-bg">
                <div :style="{ width: volume + '%' }" class="vol-fill-ui"></div>
              </div>
              <input v-model="volume" class="vol-slider-overlay" max="100" min="0" type="range" />
            </div>
          </div>
        </div>
      </div>

      <!-- 音频元素 - 放在面板外面，避免关闭面板时停止播放 -->
      <audio ref="audioRef" :src="audioSrc" @ended="onEnded" @loadedmetadata="onLoadedMetadata" @pause="isPlaying = false" @play="isPlaying = true" @timeupdate="onTimeUpdate"></audio>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
  import {computed, nextTick, onMounted, ref, watch} from 'vue'
  import {useData} from 'vitepress'

  /**
   * ==================== 音乐播放器组件 ====================
   *
   * 功能说明：
   * 1. 悬浮球控制：点击可播放/暂停或展开面板
   * 2. 搜索歌曲：通过 Meting API 搜索歌曲
   * 3. 热歌榜：显示网易云/QQ音乐热歌榜
   * 4. 歌词显示：支持 LRC 格式歌词，自动高亮当前行
   * 5. 数据源切换：可在网易云音乐和 QQ 音乐之间切换
   * 6. 播放控制：上一首、播放/暂停、下一首、进度条、音量控制
   */

  // 获取 VitePress 当前主题模式（用于深色/浅色主题适配）
  const {isDark} = useData()

  // ==================== 状态管理 ====================
  const isExpanded = ref(false) // 是否展开播放器面板
  const isPlaying = ref(false) // 是否正在播放
  const searchKeyword = ref('') // 搜索关键词
  const searchResults = ref<any[]>([]) // 搜索结果列表
  const currentSong = ref({id: '', name: '', artist: '', cover: '', url: ''}) // 当前播放歌曲
  const audioRef = ref<HTMLAudioElement>() // 音频元素引用
  const currentTime = ref(0) // 当前播放时间（秒）
  const duration = ref(0) // 歌曲总时长（秒）
  const volume = ref(50) // 音量（0-100）
  const playlist = ref<any[]>([]) // 播放列表
  const currentIndex = ref(-1) // 当前播放索引
  const hotSongs = ref<any[]>([]) // 热歌榜歌曲列表
  const hotSongsIndex = ref(0) // 热歌榜当前播放索引
  const lyrics = ref<{ time: number; text: string }[]>([]) // 歌词列表（带时间戳）
  const currentLyricIndex = ref(-1) // 当前歌词索引（用于高亮）
  const showLyrics = ref(false) // 是否显示歌词区域
  const lyricsRef = ref<HTMLElement>() // 歌词容器 DOM 引用
  const autoPlayBlocked = ref(false) // 自动播放是否被浏览器阻止

  // 计算属性：音频源（当前播放歌曲的 URL）
  const audioSrc = computed(() => currentSong.value.url)

  // ==================== API 配置 ====================
  /**
   * Meting API 说明：
   * - 搜索：https://api.injahow.cn/meting?type=search&keywords=关键词
   * - 播放：https://api.injahow.cn/meting?type=url&id=歌曲ID
   * - 歌词：https://api.injahow.cn/meting?type=lrc&id=歌曲ID
   * - 歌单：https://api.injahow.cn/meting?server=数据源&type=playlist&id=歌单ID
   */
  const API_BASE = 'https://api.injahow.cn/meting'
  const API_SOURCES = {
    netease: { name: '网易云音乐', server: 'netease' },
    tencent: { name: 'QQ音乐', server: 'tencent' }
  }
  let currentServer = 'netease' // 当前数据源

  // 获取当前服务器配置
  const getCurrentServer = () => API_SOURCES[currentServer as keyof typeof API_SOURCES].server
  const getCurrentServerName = () => API_SOURCES[currentServer as keyof typeof API_SOURCES].name

  /**
   * 从歌曲对象中提取 ID
   * Meting API 返回的数据中，ID 可能为空，需要从 URL 中提取
   * @param song - 歌曲对象
   * @returns 歌曲 ID
   */
  const extractSongId = (song: any): string => {
    let songId = song.id?.toString() || song.pid?.toString() || ''

    // 如果 ID 为空，尝试从 URL 中提取
    if (!songId && song.url) {
      const urlMatch = song.url.match(/id=(\d+)/)
      if (urlMatch) songId = urlMatch[1]
    }

    // 如果还没有，尝试从封面 URL 中提取
    if (!songId && song.pic) {
      const picMatch = song.pic.match(/id=(\d+)/)
      if (picMatch) songId = picMatch[1]
    }

    return songId
  }

  /**
   * 切换数据源（网易云音乐 <-> QQ音乐）
   * 切换后会清空当前状态并重新加载热歌榜
   */
  const switchServer = () => {
    currentServer = currentServer === 'netease' ? 'tencent' : 'netease'

    // 清空当前状态
    currentSong.value = {id: '', name: '', artist: '', cover: '', url: ''}
    hotSongs.value = []
    searchResults.value = []
    searchKeyword.value = ''
    lyrics.value = []

    // 重新加载热歌榜
    loadHotSongs()
  }

  /**
   * 加载热歌榜
   * 根据当前数据源加载对应的热歌榜歌单
   * - 网易云音乐：歌单ID 3778678
   * - QQ音乐：歌单ID 1777745160
   */
  const loadHotSongs = async () => {
    try {
      // 根据数据源选择对应的歌单 ID
      const playlistId = currentServer === 'netease' ? '3778678' : '1777745160'
      const response = await fetch(`${API_BASE}/?server=${getCurrentServer()}&type=playlist&id=${playlistId}`)
      const data = await response.json()

      if (Array.isArray(data) && data.length > 0) {
        // 转换数据格式，提取歌曲 ID
        hotSongs.value = data.map((song: any) => ({
          id: extractSongId(song),
          name: song.name || song.title || '未知歌曲',
          artist: song.artist || song.author || '未知歌手',
          cover: song.pic || song.cover || '',
          url: song.url || '',
          canPlay: !!song.url
        }))

        // 自动播放第一首（在悬浮球状态，不打开面板）
        if (hotSongs.value.length > 0) {
          isExpanded.value = false
          playHotSong(0)
        }
      }
    } catch (error) {
      console.error('加载热歌榜失败:', error)
    }
  }

  /**
   * 解析 LRC 格式歌词
   * LRC 格式示例：[00:12.34]歌词内容
   * @param lyricStr - LRC 格式的歌词文本
   * @returns 解析后的歌词数组 [{time: 秒数, text: '歌词'}]
   */
  const parseLyrics = (lyricStr: string) => {
    if (!lyricStr) return []
    const lines = lyricStr.split('\n')
    const result: { time: number; text: string }[] = []

    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})]/

    lines.forEach(line => {
      const match = line.match(timeRegex)
      if (match) {
        const minutes = parseInt(match[1])
        const seconds = parseInt(match[2])
        const milliseconds = parseInt(match[3].padEnd(3, '0'))
        const time = minutes * 60 + seconds + milliseconds / 1000
        const text = line.replace(timeRegex, '').trim()
        if (text) {
          result.push({time, text})
        }
      }
    })

    return result.sort((a, b) => a.time - b.time)
  }

  /**
   * 获取歌词
   * 调用 Meting API 获取歌词，支持 LRC 格式和纯文本格式
   * @param songId - 歌曲 ID
   */
  const fetchLyrics = async (songId: string) => {
    try {
      // 歌词 API：type=lrc&id=歌曲ID
      const response = await fetch(`${API_BASE}/?type=lrc&id=${songId}`)
      const text = await response.text()

      // 检查是否是有效的 LRC 格式（包含时间戳）
      const hasTimestamps = (text.match(/\[\d{2}:\d{2}\.\d{2}]/g) || []).length > 0

      if (text && hasTimestamps) {
        // LRC 格式，解析为带时间戳的数组
        lyrics.value = parseLyrics(text)
      } else if (text && text.trim()) {
        // 纯文本格式（如纯音乐提示），作为单行显示
        lyrics.value = [{ time: 0, text: text.trim() }]
      } else {
        lyrics.value = []
      }
    } catch (error) {
      console.error('获取歌词失败:', error)
      lyrics.value = []
    }
  }

  /**
   * 更新当前歌词索引
   * 根据当前播放时间，找到对应的歌词行并高亮，同时自动滚动
   */
  const updateCurrentLyric = () => {
    if (lyrics.value.length === 0) return

    const current = currentTime.value
    let index = -1

    // 遍历歌词，找到当前时间对应的歌词行
    for (let i = 0; i < lyrics.value.length; i++) {
      if (current >= lyrics.value[i].time) {
        index = i
      } else {
        break
      }
    }

    // 如果歌词索引发生变化，更新并滚动
    if (index !== currentLyricIndex.value) {
      currentLyricIndex.value = index

      // 自动滚动到当前歌词（平滑滚动，居中显示）
      if (showLyrics.value && lyricsRef.value && index >= 0) {
        const activeLine = lyricsRef.value.children[index] as HTMLElement
        if (activeLine) {
          activeLine.scrollIntoView({behavior: 'smooth', block: 'center'})
        }
      }
    }
  }

  /**
   * 播放热歌榜中的指定歌曲
   * @param index - 歌曲在热歌榜中的索引
   */
  const playHotSong = async (index: number) => {
    if (hotSongs.value.length === 0) return

    // 确保索引在有效范围内
    if (index >= hotSongs.value.length) index = 0
    if (index < 0) index = hotSongs.value.length - 1

    hotSongsIndex.value = index
    const song = hotSongs.value[index]

    // 设置当前歌曲
    currentSong.value = song

    // 获取歌词
    await fetchLyrics(song.id)

    // 添加到播放列表
    const existingIndex = playlist.value.findIndex(s => s.id === song.id)
    if (existingIndex === -1) {
      playlist.value.push(song)
      currentIndex.value = playlist.value.length - 1
    } else {
      currentIndex.value = existingIndex
    }

    // 自动播放 - 等待音频元素准备好
    nextTick(() => {
      if (audioRef.value) {
        const audio = audioRef.value

        // 尝试播放函数
        const tryPlay = () => {
          audio.play().then(() => {
            console.log('播放成功:', song.name)
            autoPlayBlocked.value = false
          }).catch(err => {
            console.log('自动播放被阻止，等待用户首次交互:', err.message)
            // 设置标志，表示自动播放被阻止
            autoPlayBlocked.value = true
            isPlaying.value = false
          })
        }

        // 使用 canplaythrough 确保音频已缓冲足够数据
        const onCanPlayThrough = () => {
          tryPlay()
          audio.removeEventListener('canplaythrough', onCanPlayThrough)
        }

        // 如果已经加载完成，直接播放
        if (audio.readyState >= 4) {
          tryPlay()
        } else {
          // 等待 canplaythrough 事件
          audio.addEventListener('canplaythrough', onCanPlayThrough)
          // 同时监听 canplay 作为备用
          audio.addEventListener('canplay', onCanPlayThrough)
          // 超时处理（3秒）
          setTimeout(() => {
            audio.removeEventListener('canplaythrough', onCanPlayThrough)
            audio.removeEventListener('canplay', onCanPlayThrough)
          }, 3000)
        }
      }
    })
  }

  // 播放下一首热歌
  const playNextHotSong = () => {
    playHotSong(hotSongsIndex.value + 1)
  }

  /**
   * 组件挂载时初始化
   * 1. 加载热歌榜
   * 2. 监听用户首次交互（用于恢复被浏览器阻止的自动播放）
   */
  onMounted(() => {
    loadHotSongs()

    // 监听用户首次交互，用于恢复被阻止的自动播放
    const handleFirstInteraction = (e: Event) => {
      // 检查是否是圆球点击（避免重复触发）
      const target = e.target as HTMLElement
      const isBallClick = target.closest('.control-ball') !== null

      if (autoPlayBlocked.value && audioRef.value && currentSong.value.url && !isBallClick) {
        console.log('检测到用户页面交互，自动恢复播放')
        audioRef.value.play().then(() => {
          autoPlayBlocked.value = false
          isPlaying.value = true
          console.log('自动恢复播放成功')
        }).catch(err => {
          console.log('自动恢复播放失败:', err.message)
        })
      }
      // 移除监听，只执行一次
      document.removeEventListener('click', handleFirstInteraction)
      document.removeEventListener('touchstart', handleFirstInteraction)
    }

    document.addEventListener('click', handleFirstInteraction)
    document.addEventListener('touchstart', handleFirstInteraction)
  })

  // 计算属性：播放进度百分比
  const progressPercent = computed(() => {
    if (duration.value === 0) return 0
    return (currentTime.value / duration.value) * 100
  })

  /**
   * 切换面板展开/收起状态
   */
  const togglePanel = () => {
    isExpanded.value = !isExpanded.value
  }

  /**
   * 播放/暂停切换
   * 如果没有歌曲，则播放热歌榜第一首
   */
  const togglePlay = () => {
    // 如果没有歌曲或歌曲URL为空，播放热歌榜第一首
    if (!currentSong.value.url) {
      if (hotSongs.value.length > 0) {
        playHotSong(0)
      } else {
        console.log('热歌榜加载中，请稍后再试')
      }
      return
    }

    if (!audioRef.value) return

    if (isPlaying.value) {
      audioRef.value.pause()
    } else {
      audioRef.value.play().catch(err => {
        console.error('播放失败:', err)
      })
    }
  }

  /**
   * 搜索歌曲
   * 调用 Meting API 搜索功能
   */
  const search = async () => {
    showLyrics.value = false

    if (!searchKeyword.value.trim()) {
      searchResults.value = []
      return
    }

    try {
      // Meting API 搜索：type=search&keywords=关键词
      const response = await fetch(
        `${API_BASE}/?type=search&keywords=${encodeURIComponent(searchKeyword.value)}`
      )
      const data = await response.json()

      if (Array.isArray(data) && data.length > 0) {
        searchResults.value = data.map((song: any) => ({
          id: extractSongId(song),
          name: song.name || song.title || '未知歌曲',
          artist: song.artist || song.author || '未知歌手',
          cover: song.pic || song.cover || '',
          url: song.url || '',
          canPlay: !!song.url
        }))
      } else {
        searchResults.value = []
      }
    } catch (error) {
      console.error('搜索失败:', error)
      searchResults.value = []
    }
  }

  /**
   * 播放指定歌曲（从搜索结果或点击歌曲）
   * @param song - 歌曲对象
   */
  const playSong = async (song: any) => {
    // 直接使用歌曲数据
    if (!song.url) {
      console.warn('该歌曲暂无播放资源:', song.name)
      return
    }

    currentSong.value = {...song}

    // 获取歌词
    await fetchLyrics(song.id)

    // 添加到播放列表
    const existingIndex = playlist.value.findIndex(s => s.id === song.id)
    if (existingIndex === -1) {
      playlist.value.push(song)
      currentIndex.value = playlist.value.length - 1
    } else {
      currentIndex.value = existingIndex
    }

    searchResults.value = []
    searchKeyword.value = ''
    isExpanded.value = false

    // 自动播放
    setTimeout(() => {
      if (audioRef.value) {
        audioRef.value.play().catch(err => {
          console.error('播放失败:', err)
        })
      }
    }, 500)
  }

  /**
   * 上一首
   * 在热歌榜中循环播放
   */
  const prevSong = () => {
    if (hotSongs.value.length === 0) return
    let newIndex = hotSongsIndex.value - 1
    if (newIndex < 0) newIndex = hotSongs.value.length - 1
    playHotSong(newIndex)
  }

  /**
   * 下一首
   * 在热歌榜中循环播放
   */
  const nextSong = () => {
    playNextHotSong()
  }

  /**
   * 音频时间更新事件
   * 更新当前播放时间，并同步歌词高亮
   */
  const onTimeUpdate = () => {
    if (audioRef.value) {
      currentTime.value = audioRef.value.currentTime
      updateCurrentLyric()
    }
  }

  /**
   * 音频元数据加载完成事件
   * 获取歌曲总时长
   */
  const onLoadedMetadata = () => {
    if (audioRef.value) {
      duration.value = audioRef.value.duration
    }
  }

  /**
   * 音频播放结束事件
   * 自动播放下一首
   */
  const onEnded = () => {
    playNextHotSong()
  }

  /**
   * 点击进度条跳转
   * @param e - 鼠标点击事件
   */
  const seek = (e: MouseEvent) => {
    if (!audioRef.value || duration.value === 0) return
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    audioRef.value.currentTime = percent * duration.value
  }

  /**
   * 格式化时间（秒数 -> mm:ss）
   * @param time - 秒数
   * @returns 格式化后的时间字符串
   */
  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  /**
   * 监听音量变化
   * 同步更新音频元素的音量
   */
  watch(volume, (val) => {
    if (audioRef.value) {
      audioRef.value.volume = val / 100
    }
  })
</script>

<style scoped>
  .music-player {
    position: fixed;
    right: 20px;
    bottom: 20px;
    z-index: 9999;
  }

  /* 悬浮控制球 */
  .control-ball {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    transition: transform 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  .control-ball:hover {
    transform: scale(1.05);
  }

  .ball-cover {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }

  .ball-inner {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .ball-icon {
    color: white;
    font-size: 24px;
  }

  /* 播放/暂停状态指示器 */
  .play-pause-indicator {
    position: absolute;
    bottom: 4px;
    left: 4px;
    width: 18px;
    height: 18px;
    background: rgba(255, 107, 107, 0.95);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding: 0 4px;
    cursor: pointer;
    transition: all 0.3s ease;
    z-index: 10;
  }

  /* 展开面板按钮 */
  .expand-btn {
    position: absolute;
    bottom: 4px;
    right: 4px;
    width: 18px;
    height: 18px;
    background: rgba(0, 0, 0, 0.6);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 10px;
    color: white;
  }

  /* 暂停状态 - 静态波浪效果 */
  .play-pause-indicator span {
    width: 2px;
    height: 6px;
    background: white;
    border-radius: 1px;
    transition: all 0.3s ease;
  }

  .play-pause-indicator span:nth-child(2) {
    height: 8px;
  }

  .play-pause-indicator span:nth-child(3) {
    height: 5px;
  }

  /* 播放状态 - 动态声波效果 */
  .play-pause-indicator.playing span {
    animation: sound 0.5s ease-in-out infinite;
  }

  .play-pause-indicator.playing span:nth-child(1) {
    animation-delay: 0s;
  }

  .play-pause-indicator.playing span:nth-child(2) {
    animation-delay: 0.1s;
  }

  .play-pause-indicator.playing span:nth-child(3) {
    animation-delay: 0.2s;
  }

  @keyframes sound {
    0%, 100% {
      height: 4px;
    }
    50% {
      height: 10px;
    }
  }

  /* 播放器面板 - 默认亮色 */
  .player-panel {
    position: absolute;
    bottom: 60px;
    right: 0;
    width: 320px;
    background: #ffffff;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
    padding: 20px;
    color: #333;
  }

  /* 暗色主题 */
  .music-player.dark .player-panel {
    background: #1a1a1a;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    color: white;
  }

  .panel-close {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 28px;
    height: 28px;
    background: rgba(0, 0, 0, 0.05);
    border: none;
    border-radius: 50%;
    color: #666;
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .panel-close:hover {
    background: rgba(0, 0, 0, 0.1);
    color: #333;
  }

  .music-player.dark .panel-close {
    background: rgba(255, 255, 255, 0.1);
    color: #999;
  }

  .music-player.dark .panel-close:hover {
    background: rgba(255, 255, 255, 0.2);
    color: white;
  }

  /* 搜索区域 */
  .search-section {
    margin-bottom: 16px;
  }

  .search-box {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }

  .search-box input {
    flex: 1;
    height: 36px;
    padding: 0 14px;
    border: 1px solid #e0e0e0;
    border-radius: 18px;
    font-size: 13px;
    outline: none;
    background: #f5f5f5;
    color: #333;
  }

  .search-box input::placeholder {
    color: #999;
  }

  .music-player.dark .search-box input {
    border: 1px solid #333;
    background: #2a2a2a;
    color: white;
  }

  .music-player.dark .search-box input::placeholder {
    color: #666;
  }

  .search-btn {
    height: 36px;
    padding: 0 16px;
    background: #ff6b6b;
    color: white;
    border: none;
    border-radius: 18px;
    font-size: 13px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .search-btn:hover {
    background: #ee5a6f;
  }

  /* 搜索按钮文字和图标 */
  .search-btn-text {
    display: inline;
  }

  .search-btn-icon {
    display: none;
    font-size: 14px;
  }

  /* 移动端适配 - 将搜索文字替换为图标 */
  @media (max-width: 768px) {
    .search-btn {
      padding: 0 12px;
    }

    .search-btn-text {
      display: none;
    }

    .search-btn-icon {
      display: inline;
    }
  }

  /* 搜索结果 */
  .search-results {
    max-height: 180px;
    overflow-y: scroll;
    background: #f5f5f5;
    border-radius: 12px;
    padding: 8px;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .search-results::-webkit-scrollbar {
    display: none;
  }

  .music-player.dark .search-results {
    background: #2a2a2a;
  }

  .song-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .song-item:hover {
    background: #e8e8e8;
  }

  .music-player.dark .song-item:hover {
    background: #333;
  }

  .song-item.disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .song-item.disabled:hover {
    background: transparent;
  }

  .no-play-tip {
    font-size: 10px;
    color: #ff6b6b;
    margin-top: 2px;
  }

  .disabled-icon {
    background: #666 !important;
  }

  .song-cover {
    width: 40px;
    height: 40px;
    border-radius: 6px;
    object-fit: cover;
  }

  .default-cover {
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 16px;
  }

  .song-info {
    flex: 1;
    min-width: 0;
  }

  .song-name {
    font-size: 13px;
    color: #333;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .music-player.dark .song-name {
    color: white;
  }

  .song-artist {
    font-size: 11px;
    color: #666;
    margin-top: 2px;
  }

  .music-player.dark .song-artist {
    color: #999;
  }

  .play-icon {
    width: 28px;
    height: 28px;
    background: #ff6b6b;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    color: white;
  }

  /* 当前播放卡片 */
  .now-playing-card {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 16px;
    padding: 12px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .music-player.dark .now-playing-card {
    background: #333;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
  }

  /* 歌曲信息和按钮行 */
  .npc-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .npc-cover {
    width: 56px;
    height: 56px;
    border-radius: 8px;
    object-fit: cover;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  }

  .npc-info {
    flex: 1;
    min-width: 0;
  }

  .npc-buttons {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }

  .npc-name {
    font-size: 15px;
    color: #333;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .music-player.dark .npc-name {
    color: white;
  }

  .npc-artist {
    font-size: 12px;
    color: #999;
    margin-top: 4px;
  }

  /* 数据源显示 */
  .npc-server {
    font-size: 11px;
    color: #4CAF50;
    margin-top: 2px;
    font-weight: 500;
  }

  .music-player.dark .npc-server {
    color: #66BB6A;
  }

  /* 数据源切换按钮 */
  .npc-switch-btn {
    width: 36px;
    height: 36px;
    background: #2196F3;
    border: none;
    border-radius: 50%;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    padding: 0;
    box-shadow: 0 2px 6px rgba(33, 150, 243, 0.3);
  }

  .npc-switch-btn:hover {
    transform: scale(1.05) rotate(180deg);
    box-shadow: 0 3px 8px rgba(33, 150, 243, 0.4);
  }

  .switch-icon {
    width: 18px;
    height: 18px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z'/%3E%3C/svg%3E");
    background-size: contain;
    background-repeat: no-repeat;
  }

  .music-player.dark .npc-switch-btn {
    background: #1976D2;
  }

  .music-player.dark .npc-switch-btn:hover {
    background: #1565C0;
  }

  /* 歌词切换按钮 */
  .npc-lyric-btn {
    width: 36px;
    height: 36px;
    background: #8b5a5a;
    border: none;
    border-radius: 50%;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    padding: 0;
    box-shadow: 0 2px 6px rgba(139, 90, 90, 0.3);
  }

  .npc-lyric-btn:hover {
    transform: scale(1.05);
    box-shadow: 0 3px 8px rgba(139, 90, 90, 0.4);
  }

  .npc-lyric-btn.active {
    background: #ff6b6b;
    box-shadow: 0 2px 6px rgba(255, 107, 107, 0.4);
  }

  .npc-lyric-btn.active:hover {
    box-shadow: 0 3px 8px rgba(255, 107, 107, 0.5);
  }

  /* 歌词区域 */
  .lyrics-container {
    max-height: 180px;
    overflow-y: auto;
    background: rgba(0, 0, 0, 0.03);
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 16px;
    text-align: center;
    scrollbar-width: thin;
    scrollbar-color: #ff6b6b transparent;
  }

  .lyrics-container::-webkit-scrollbar {
    width: 4px;
  }

  .lyrics-container::-webkit-scrollbar-track {
    background: transparent;
  }

  .lyrics-container::-webkit-scrollbar-thumb {
    background: #ff6b6b;
    border-radius: 2px;
  }

  .music-player.dark .lyrics-container {
    background: rgba(255, 255, 255, 0.06);
  }

  .music-player.dark .lyrics-container::-webkit-scrollbar-thumb {
    background: #ff6b6b;
  }

  .lyrics-scroll {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .lyric-line {
    font-size: 13px;
    color: #999;
    line-height: 2;
    transition: all 0.3s;
    opacity: 0.6;
    padding: 4px 0;
  }

  .lyric-line:hover {
    opacity: 0.8;
  }

  .lyric-line.active {
    color: #ff6b6b;
    font-size: 15px;
    font-weight: 600;
    opacity: 1;
    transform: scale(1.05);
    text-shadow: 0 0 10px rgba(255, 107, 107, 0.3);
  }

  .music-player.dark .lyric-line {
    color: #888;
  }

  .music-player.dark .lyric-line.active {
    color: #ff6b6b;
  }

  .lyrics-empty {
    font-size: 13px;
    color: #999;
    padding: 20px 0;
  }

  /* 纯文本歌词样式 */
  .lyric-text-only {
    color: #ff6b6b;
    font-size: 16px;
    font-weight: 600;
    text-align: center;
    padding: 20px;
    line-height: 1.8;
  }

  /* 播放控制 */
  .player-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 20px;
    margin-bottom: 16px;
  }

  .ctrl-btn {
    width: 40px;
    height: 40px;
    background: rgba(0, 0, 0, 0.05);
    border: none;
    border-radius: 50%;
    color: #333;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    padding: 0;
  }

  .ctrl-btn:hover {
    background: rgba(0, 0, 0, 0.1);
  }

  .ctrl-btn svg {
    display: block;
  }

  .music-player.dark .ctrl-btn {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }

  .music-player.dark .ctrl-btn:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .play-btn {
    width: 56px;
    height: 56px;
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
    color: white;
  }

  .play-btn:hover {
    background: linear-gradient(135deg, #ee5a6f 0%, #ff6b6b 100%);
    transform: scale(1.05);
  }

  /* 进度条 */
  .progress-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
  }

  .time {
    font-size: 11px;
    color: #666;
    min-width: 32px;
    text-align: center;
  }

  .music-player.dark .time {
    color: #999;
  }

  .progress-track {
    flex: 1;
    height: 4px;
    background: #e0e0e0;
    border-radius: 2px;
    cursor: pointer;
    position: relative;
  }

  .music-player.dark .progress-track {
    background: #333;
  }

  .progress-fill {
    height: 100%;
    background: #ff6b6b;
    border-radius: 2px;
    transition: width 0.1s;
  }

  /* 热歌榜列表 */
  .hot-songs-section {
    margin-bottom: 12px;
  }

  .section-title {
    font-size: 12px;
    color: #999;
    margin-bottom: 8px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .loading-text {
    font-size: 11px;
    color: #ccc;
    font-weight: normal;
  }

  .hot-songs-empty {
    padding: 20px;
    text-align: center;
    font-size: 12px;
    color: #999;
    background: rgba(0, 0, 0, 0.03);
    border-radius: 8px;
  }

  .hot-songs-list {
    max-height: 110px;
    overflow-y: scroll;
    overflow-x: hidden;
    background: rgba(0, 0, 0, 0.03);
    border-radius: 8px;
    padding: 8px;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .hot-songs-list::-webkit-scrollbar {
    display: none;
  }

  .music-player.dark .hot-songs-list {
    background: rgba(255, 255, 255, 0.08);
  }

  .hot-song-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.2s;
    font-size: 12px;
    overflow: hidden;
    min-width: 0;
  }

  .hot-song-item:hover {
    background: rgba(0, 0, 0, 0.05);
  }

  .hot-song-item.active {
    background: rgba(255, 107, 107, 0.15);
  }

  .music-player.dark .hot-song-item:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .music-player.dark .hot-song-item.active {
    background: rgba(255, 107, 107, 0.2);
  }

  .song-index {
    width: 18px;
    text-align: center;
    color: #ff6b6b;
    font-weight: 600;
    font-size: 11px;
  }

  .hot-song-item .song-name {
    flex: 0 0 auto;
    max-width: 55%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #333;
  }

  .music-player.dark .hot-song-item .song-name {
    color: white;
  }

  .hot-song-item .song-artist {
    flex: 1;
    min-width: 0;
    color: #999;
    font-size: 11px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: right;
  }

  /* 播放中动画图标 */
  .playing-icon {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 12px;
    margin-left: 4px;
  }

  .playing-icon span {
    width: 2px;
    background: #ff6b6b;
    border-radius: 1px;
    animation: playing 0.6s ease-in-out infinite;
  }

  .playing-icon span:nth-child(1) {
    height: 6px;
    animation-delay: 0s;
  }

  .playing-icon span:nth-child(2) {
    height: 10px;
    animation-delay: 0.2s;
  }

  .playing-icon span:nth-child(3) {
    height: 8px;
    animation-delay: 0.4s;
  }

  @keyframes playing {
    0%, 100% {
      transform: scaleY(1);
    }
    50% {
      transform: scaleY(0.6);
    }
  }

  /* 进度条区域 */
  .progress-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 0 4px;
  }

  .progress-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  /* 时间文本 */
  .time-text {
    font-size: 11px;
    color: #666;
    min-width: 32px;
    text-align: left;
  }

  .music-player.dark .time-text {
    color: #999;
  }

  /* 音量小图标 */
  .vol-icon-small {
    color: #999;
    flex-shrink: 0;
  }

  .music-player.dark .vol-icon-small {
    color: #666;
  }

  /* 歌曲进度条 */
  .progress-bar-ui {
    flex: 1;
    height: 20px;
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  .progress-bg {
    width: 100%;
    height: 3px;
    background: #e0e0e0;
    border-radius: 2px;
    position: relative;
  }

  .music-player.dark .progress-bg {
    background: #444;
  }

  .progress-fill-ui {
    height: 100%;
    background: #ff6b6b;
    border-radius: 2px;
    position: relative;
  }

  .progress-fill-ui::after {
    content: '';
    position: absolute;
    right: -6px;
    top: 50%;
    transform: translateY(-50%);
    width: 10px;
    height: 10px;
    background: #ff6b6b;
    border-radius: 50%;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  /* 音量进度条 */
  .vol-bar-ui {
    flex: 1;
    height: 20px;
    display: flex;
    align-items: center;
    position: relative;
  }

  .vol-bg {
    width: 100%;
    height: 3px;
    background: #e0e0e0;
    border-radius: 2px;
    position: relative;
  }

  .music-player.dark .vol-bg {
    background: #444;
  }

  .vol-fill-ui {
    height: 100%;
    background: #ff6b6b;
    border-radius: 2px;
    position: relative;
  }

  .vol-fill-ui::after {
    content: '';
    position: absolute;
    right: -5px;
    top: 50%;
    transform: translateY(-50%);
    width: 10px;
    height: 10px;
    background: #ff6b6b;
    border-radius: 50%;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  /* 音量滑块 - 透明覆盖层 */
  .vol-slider-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
    margin: 0;
    /* 移动端触摸支持 */
    touch-action: none;
    -webkit-appearance: none;
    appearance: none;
  }

  /* 移动端适配 - 隐藏音量调节 */
  @media (max-width: 768px) {
    .progress-row:nth-child(2) { /* 隐藏第二行音量调节 */
      display: none;
    }
  }

  /* 保留旧的音量滑块样式（用于其他地方） */
  .vol-slider {
    flex: 1;
    height: 4px;
    -webkit-appearance: none;
    appearance: none;
    background: #e0e0e0;
    border-radius: 2px;
    outline: none;
  }

  .music-player.dark .vol-slider {
    background: #333;
  }

  .vol-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    background: #ff6b6b;
    border-radius: 50%;
    cursor: pointer;
  }

  /* 移动端适配 */
  @media (max-width: 768px) {
    .music-player {
      right: 10px;
      bottom: 20px;
    }

    .player-panel {
      width: 300px;
    }
  }
</style>
