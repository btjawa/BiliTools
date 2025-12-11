<template>
  <div class="p-4 space-y-4 bg-gray-100 min-h-screen">
    <h1 class="text-2xl font-bold mb-4">缓存组卡片组件演示</h1>
    
    <!-- 折叠状态的组 -->
    <div class="bg-white p-4 rounded-lg shadow">
      <h2 class="text-lg font-semibold mb-2">折叠状态的组</h2>
      <CacheGroupCard
        :group="collapsedGroup"
        :selected="false"
        :selectedVideos="new Set()"
        @select="handleSelect"
        @toggleExpand="handleToggleExpand"
        @openFolder="handleOpenFolder"
        @delete="handleDelete"
        @selectVideo="handleSelectVideo"
        @playVideo="handlePlayVideo"
        @openVideoFolder="handleOpenVideoFolder"
        @deleteVideo="handleDeleteVideo"
      />
    </div>

    <!-- 展开状态的组 -->
    <div class="bg-white p-4 rounded-lg shadow">
      <h2 class="text-lg font-semibold mb-2">展开状态的组</h2>
      <CacheGroupCard
        :group="expandedGroup"
        :selected="selectedGroups.has('expanded-group')"
        :selectedVideos="selectedVideos"
        @select="() => toggleGroupSelection('expanded-group')"
        @toggleExpand="handleToggleExpand"
        @openFolder="handleOpenFolder"
        @delete="handleDelete"
        @selectVideo="handleSelectVideo"
        @playVideo="handlePlayVideo"
        @openVideoFolder="handleOpenVideoFolder"
        @deleteVideo="handleDeleteVideo"
      />
    </div>

    <!-- 包含不可用视频的组 -->
    <div class="bg-white p-4 rounded-lg shadow">
      <h2 class="text-lg font-semibold mb-2">包含不可用视频的组</h2>
      <CacheGroupCard
        :group="groupWithUnavailableVideos"
        :selected="false"
        :selectedVideos="new Set()"
        @select="handleSelect"
        @toggleExpand="handleToggleExpand"
        @openFolder="handleOpenFolder"
        @delete="handleDelete"
        @selectVideo="handleSelectVideo"
        @playVideo="handlePlayVideo"
        @openVideoFolder="handleOpenVideoFolder"
        @deleteVideo="handleDeleteVideo"
      />
    </div>

    <!-- 操作日志 -->
    <div class="bg-white p-4 rounded-lg shadow">
      <h2 class="text-lg font-semibold mb-2">操作日志</h2>
      <div class="max-h-40 overflow-y-auto">
        <div v-for="(log, index) in actionLogs" :key="index" class="text-sm text-gray-600 mb-1">
          {{ log }}
        </div>
      </div>
      <button 
        @click="clearLogs" 
        class="mt-2 px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
      >
        清除日志
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import CacheGroupCard from './CacheGroupCard.vue';
import type * as Types from '@/types/cache.d';

// 演示数据
const collapsedGroup: Types.CacheGroup = {
  groupId: 'collapsed-group',
  title: 'MATLAB/Simulink控制系统设计（折叠状态）',
  coverUrl: 'https://i0.hdslb.com/bfs/archive/example1.jpg',
  uname: '德狗追求独立',
  videoCount: 5,
  totalDuration: 13335, // 3:42:15
  totalFileSize: 1024 * 1024 * 500, // 500MB
  latestDownloadTime: new Date('2025-12-10T20:02:14'),
  isExpanded: false,
  videos: []
};

const expandedGroup: Types.CacheGroup = {
  groupId: 'expanded-group',
  title: 'Web前端开发实战（展开状态）',
  coverUrl: 'https://i0.hdslb.com/bfs/archive/example2.jpg',
  uname: '编程小白',
  videoCount: 3,
  totalDuration: 8640, // 2:24:00
  totalFileSize: 1024 * 1024 * 300, // 300MB
  latestDownloadTime: new Date('2025-12-09T15:30:22'),
  isExpanded: true,
  videos: [
    {
      id: 'video-1',
      bvid: 'BV1234567890',
      aid: 123456,
      cid: 789012,
      title: 'HTML基础入门教程',
      uname: '编程小白',
      coverUrl: 'https://i0.hdslb.com/bfs/archive/video1.jpg',
      duration: 2880, // 48:00
      fileSize: 1024 * 1024 * 100,
      cachePath: '/path/to/cache/video1',
      downloadTime: new Date('2025-12-09T15:30:22'),
      importTime: new Date('2025-12-09T15:30:22'),
      status: 'available' as Types.CacheStatus,
      groupId: 'expanded-group'
    },
    {
      id: 'video-2',
      bvid: 'BV2345678901',
      aid: 234567,
      cid: 890123,
      title: 'CSS样式设计进阶',
      uname: '编程小白',
      coverUrl: 'https://i0.hdslb.com/bfs/archive/video2.jpg',
      duration: 3240, // 54:00
      fileSize: 1024 * 1024 * 120,
      cachePath: '/path/to/cache/video2',
      downloadTime: new Date('2025-12-08T14:20:15'),
      importTime: new Date('2025-12-08T14:20:15'),
      status: 'available' as Types.CacheStatus,
      groupId: 'expanded-group'
    },
    {
      id: 'video-3',
      bvid: 'BV3456789012',
      aid: 345678,
      cid: 901234,
      title: 'JavaScript交互开发',
      uname: '编程小白',
      coverUrl: 'https://i0.hdslb.com/bfs/archive/video3.jpg',
      duration: 2520, // 42:00
      fileSize: 1024 * 1024 * 80,
      cachePath: '/path/to/cache/video3',
      downloadTime: new Date('2025-12-07T10:15:30'),
      importTime: new Date('2025-12-07T10:15:30'),
      status: 'available' as Types.CacheStatus,
      groupId: 'expanded-group'
    }
  ]
};

const groupWithUnavailableVideos: Types.CacheGroup = {
  groupId: 'unavailable-group',
  title: 'Python数据分析教程（包含不可用视频）',
  coverUrl: 'https://i0.hdslb.com/bfs/archive/example3.jpg',
  uname: '技术分享者',
  videoCount: 2,
  totalDuration: 5400, // 1:30:00
  totalFileSize: 1024 * 1024 * 200, // 200MB
  latestDownloadTime: new Date('2025-12-06T09:45:12'),
  isExpanded: true,
  videos: [
    {
      id: 'video-4',
      bvid: 'BV4567890123',
      aid: 456789,
      cid: 12345,
      title: 'Pandas数据处理基础',
      uname: '技术分享者',
      coverUrl: 'https://i0.hdslb.com/bfs/archive/video4.jpg',
      duration: 3600, // 60:00
      fileSize: 1024 * 1024 * 120,
      cachePath: '/path/to/cache/video4',
      downloadTime: new Date('2025-12-06T09:45:12'),
      importTime: new Date('2025-12-06T09:45:12'),
      status: 'available' as Types.CacheStatus,
      groupId: 'unavailable-group'
    },
    {
      id: 'video-5',
      bvid: 'BV5678901234',
      aid: 567890,
      cid: 123456,
      title: 'Matplotlib数据可视化',
      uname: '技术分享者',
      coverUrl: 'https://i0.hdslb.com/bfs/archive/video5.jpg',
      duration: 1800, // 30:00
      fileSize: 1024 * 1024 * 80,
      cachePath: '/path/to/cache/video5',
      downloadTime: new Date('2025-12-05T16:20:45'),
      importTime: new Date('2025-12-05T16:20:45'),
      status: 'unavailable' as Types.CacheStatus,
      groupId: 'unavailable-group'
    }
  ]
};

// 状态管理
const selectedGroups = ref(new Set<string>());
const selectedVideos = ref(new Set<string>(['video-2'])); // 预选一个视频
const actionLogs = ref<string[]>([]);

// 事件处理函数
function handleSelect() {
  addLog('组被选择/取消选择');
}

function handleToggleExpand(groupId: string) {
  addLog(`切换组展开状态: ${groupId}`);
  
  // 更新对应组的展开状态
  if (groupId === 'collapsed-group') {
    collapsedGroup.isExpanded = !collapsedGroup.isExpanded;
  } else if (groupId === 'expanded-group') {
    expandedGroup.isExpanded = !expandedGroup.isExpanded;
  } else if (groupId === 'unavailable-group') {
    groupWithUnavailableVideos.isExpanded = !groupWithUnavailableVideos.isExpanded;
  }
}

function handleOpenFolder(group: Types.CacheGroup) {
  addLog(`打开组文件夹: ${group.title}`);
}

function handleDelete(group: Types.CacheGroup) {
  addLog(`删除组: ${group.title} (${group.videoCount}个视频)`);
}

function handleSelectVideo(videoId: string) {
  addLog(`选择/取消选择视频: ${videoId}`);
  
  if (selectedVideos.value.has(videoId)) {
    selectedVideos.value.delete(videoId);
  } else {
    selectedVideos.value.add(videoId);
  }
}

function handlePlayVideo(video: Types.CacheItem) {
  addLog(`播放视频: ${video.title}`);
}

function handleOpenVideoFolder(video: Types.CacheItem) {
  addLog(`打开视频文件夹: ${video.title}`);
}

function handleDeleteVideo(video: Types.CacheItem) {
  addLog(`删除视频: ${video.title}`);
}

function toggleGroupSelection(groupId: string) {
  if (selectedGroups.value.has(groupId)) {
    selectedGroups.value.delete(groupId);
    addLog(`取消选择组: ${groupId}`);
  } else {
    selectedGroups.value.add(groupId);
    addLog(`选择组: ${groupId}`);
  }
}

function addLog(message: string) {
  const timestamp = new Date().toLocaleTimeString();
  actionLogs.value.unshift(`[${timestamp}] ${message}`);
  
  // 限制日志数量
  if (actionLogs.value.length > 20) {
    actionLogs.value = actionLogs.value.slice(0, 20);
  }
}

function clearLogs() {
  actionLogs.value = [];
  addLog('日志已清除');
}

// 初始化日志
addLog('组卡片组件演示已加载');
</script>

<style scoped>
@reference 'tailwindcss';

.space-y-4 > * + * {
  margin-top: 1rem;
}
</style>