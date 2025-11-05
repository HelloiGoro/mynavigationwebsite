import { useState, useEffect, useMemo } from 'react';
import { NavigationClient } from './API/client';
import { MockNavigationClient } from './API/mock';
import { Site, Group } from './API/http';
import { GroupWithSites } from './types';
import ThemeToggle from './components/ThemeToggle';
import GroupCard from './components/GroupCard';
import LoginForm from './components/LoginForm';
import './App.css';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import SortableGroupItem from './components/SortableGroupItem';
// Material UI 导入
import {
  Container,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  Stack,
  Paper,
  createTheme,
  ThemeProvider,
  CssBaseline,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  ListItemIcon,
  ListItemText,
  Snackbar,
  InputAdornment,
  Slider,
} from '@mui/material';
import SortIcon from '@mui/icons-material/Sort';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import GitHubIcon from '@mui/icons-material/GitHub';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';

// 根据环境选择使用真实API还是模拟API
const isDevEnvironment = import.meta.env.DEV;
const useRealApi = import.meta.env.VITE_USE_REAL_API === 'true';

const api =
  isDevEnvironment && !useRealApi
    ? new MockNavigationClient()
    : new NavigationClient(isDevEnvironment ? 'http://localhost:8788/api' : '/api');

// 排序模式枚举
enum SortMode {
  None, // 不排序
  GroupSort, // 分组排序
  SiteSort, // 站点排序
}

// 辅助函数：提取域名
function extractDomain(url: string): string | null {
  if (!url) return null;

  try {
    // 尝试自动添加协议头，如果缺少的话
    let fullUrl = url;
    if (!/^https?:\/\//i.test(url)) {
      fullUrl = 'http://' + url;
    }
    const parsedUrl = new URL(fullUrl);
    return parsedUrl.hostname;
  } catch {
    // 尝试备用方法
    const match = url.match(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:/\n?]+)/im);
    return match && match[1] ? match[1] : url;
  }
}

// 默认配置
const DEFAULT_CONFIGS = {
  'site.title': '导航站',
  'site.name': '导航站',
  'site.customCss': '',
  'site.backgroundImage': '', // 背景图片URL
  'site.backgroundOpacity': '0.15', // 背景蒙版透明度
  'site.iconApi': 'https://www.faviconextractor.com/favicon/{domain}?larger=true', // 默认使用的API接口，带上 ?larger=true 参数可以获取最大尺寸的图标
};

function App() {
  // 主题模式状态
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // 创建Material UI主题
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: darkMode ? 'dark' : 'light',
        },
      }),
    [darkMode]
  );

  // 切换主题的回调函数
  const toggleTheme = () => {
    setDarkMode(!darkMode);
    localStorage.setItem('theme', !darkMode ? 'dark' : 'light');
  };

  const [groups, setGroups] = useState<GroupWithSites[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>(SortMode.None);
  const [currentSortingGroupId, setCurrentSortingGroupId] = useState<number | null>(null);

  // 新增认证状态
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isAuthRequired, setIsAuthRequired] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // 配置状态
  const [configs, setConfigs] = useState<Record<string, string>>(DEFAULT_CONFIGS);
  const [openConfig, setOpenConfig] = useState(false);
  const [tempConfigs, setTempConfigs] = useState<Record<string, string>>(DEFAULT_CONFIGS);

  // 配置传感器，支持鼠标、触摸和键盘操作
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 1, // 降低激活阈值，使拖拽更敏感
        delay: 0, // 移除延迟
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100, // 降低触摸延迟
        tolerance: 3, // 降低容忍值
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 新增状态管理
  const [openAddGroup, setOpenAddGroup] = useState(false);
  const [openAddSite, setOpenAddSite] = useState(false);
  const [newGroup, setNewGroup] = useState<Partial<Group>>({ name: '', order_num: 0 });
  const [newSite, setNewSite] = useState<Partial<Site>>({
    name: '',
    url: '',
    icon: '',
    description: '',
    notes: '',
    order_num: 0,
    group_id: 0,
  });

  // 新增菜单状态
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const openMenu = Boolean(menuAnchorEl);

  // 新增导入对话框状态
  const [openImport, setOpenImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importLoading, setImportLoading] = useState(false);

  // 错误提示框状态
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  // 导入结果提示框状态
  const [importResultOpen, setImportResultOpen] = useState(false);
  const [importResultMessage, setImportResultMessage] = useState('');

  // 菜单打开关闭
  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  // 检查认证状态
  const checkAuthStatus = async () => {
    try {
      setIsAuthChecking(true);
      console.log('开始检查认证状态...');

      // 尝试进行API调用，检查是否需要认证
      const result = await api.checkAuthStatus();
      console.log('认证检查结果:', result);

      if (!result) {
        // 未认证，需要登录
        console.log('未认证，设置需要登录状态');

        // 如果有token但无效，清除它
        if (api.isLoggedIn()) {
          console.log('清除无效token');
          api.logout();
        }

        // 直接更新状态，确保先设置认证状态再结束检查
        setIsAuthenticated(false);
        setIsAuthRequired(true);
      } else {
        // 直接更新认证状态
        setIsAuthenticated(true);
        setIsAuthRequired(false);

        // 如果已经登录或不需要认证，继续加载数据
        console.log('已认证，开始加载数据');
        await fetchData();
        await fetchConfigs();
      }
    } catch (error) {
      console.error('认证检查失败:', error);
      // 如果返回401，说明需要认证
      if (error instanceof Error && error.message.includes('认证')) {
        console.log('检测到认证错误，设置需要登录状态');
        setIsAuthenticated(false);
        setIsAuthRequired(true);
      }
    } finally {
      console.log('认证检查完成');
      setIsAuthChecking(false);
    }
  };

  // 登录功能
  const handleLogin = async (username: string, password: string, rememberMe: boolean = false) => {
    try {
      setLoginLoading(true);
      setLoginError(null);

      // 调用登录接口
      const success = await api.login(username, password, rememberMe);

      if (success) {
        // 登录成功
        setIsAuthenticated(true);
        setIsAuthRequired(false);
        // 加载数据
        await fetchData();
        await fetchConfigs();
      } else {
        // 登录失败
        handleError('用户名或密码错误');
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('登录失败:', error);
      handleError('登录失败: ' + (error instanceof Error ? error.message : '未知错误'));
      setIsAuthenticated(false);
    } finally {
      setLoginLoading(false);
    }
  };

  // 登出功能
  const handleLogout = () => {
    api.logout();
    setIsAuthenticated(false);
    setIsAuthRequired(true);

    // 清空数据
    setGroups([]);
    handleMenuClose();

    // 显示提示信息
    setError('已退出登录，请重新登录');
  };

  // 加载配置
  const fetchConfigs = async () => {
    try {
      const configsData = await api.getConfigs();
      setConfigs({
        ...DEFAULT_CONFIGS,
        ...configsData,
      });
      setTempConfigs({
        ...DEFAULT_CONFIGS,
        ...configsData,
      });
    } catch (error) {
      console.error('加载配置失败:', error);
      // 使用默认配置
    }
  };

  useEffect(() => {
    // 检查认证状态
    checkAuthStatus();

    // 确保初始化时重置排序状态
    setSortMode(SortMode.None);
    setCurrentSortingGroupId(null);
  }, []);

  // 设置文档标题
  useEffect(() => {
    document.title = configs['site.title'] || '导航站';
  }, [configs]);

  // 应用自定义CSS
  useEffect(() => {
    const customCss = configs['site.customCss'];
    let styleElement = document.getElementById('custom-style');

    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'custom-style';
      document.head.appendChild(styleElement);
    }

    // 添加安全过滤，防止CSS注入攻击
    const sanitizedCss = sanitizeCSS(customCss || '');
    styleElement.textContent = sanitizedCss;
  }, [configs]);

  // CSS安全过滤函数
  const sanitizeCSS = (css: string): string => {
    if (!css) return '';

    // 移除可能导致XSS的内容
    return (
      css
        // 移除包含javascript:的URL
        .replace(/url\s*\(\s*(['"]?)javascript:/gi, 'url($1invalid:')
        // 移除expression
        .replace(/expression\s*\(/gi, 'invalid(')
        // 移除import
        .replace(/@import/gi, '/* @import */')
        // 移除behavior
        .replace(/behavior\s*:/gi, '/* behavior: */')
        // 过滤content属性中的不安全内容
        .replace(/content\s*:\s*(['"]?).*?url\s*\(\s*(['"]?)javascript:/gi, 'content: $1')
    );
  };

  // 同步HTML的class以保持与现有CSS兼容
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // 处理错误的函数
  const handleError = (errorMessage: string) => {
    setSnackbarMessage(errorMessage);
    setSnackbarOpen(true);
    console.error(errorMessage);
  };

  // 关闭错误提示框
  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const groupsData = await api.getGroups();

      // 获取每个分组的站点并确保id存在
      const groupsWithSites = await Promise.all(
        groupsData
          .filter((group) => group.id !== undefined) // 过滤掉没有id的分组
          .map(async (group) => {
            const sites = await api.getSites(group.id);
            return {
              ...group,
              id: group.id as number, // 确保id不为undefined
              sites,
            } as GroupWithSites;
          })
      );

      setGroups(groupsWithSites);
    } catch (error) {
      console.error('加载数据失败:', error);
      handleError('加载数据失败: ' + (error instanceof Error ? error.message : '未知错误'));

      // 如果因为认证问题导致加载失败，处理认证状态
      if (error instanceof Error && error.message.includes('认证')) {
        setIsAuthRequired(true);
        setIsAuthenticated(false);
      }
    } finally {
      setLoading(false);
    }
  };

  // 更新站点
  const handleSiteUpdate = async (updatedSite: Site) => {
    try {
      if (updatedSite.id) {
        await api.updateSite(updatedSite.id, updatedSite);
        await fetchData(); // 重新加载数据
      }
    } catch (error) {
      console.error('更新站点失败:', error);
      handleError('更新站点失败: ' + (error as Error).message);
    }
  };

  // 删除站点
  const handleSiteDelete = async (siteId: number) => {
    try {
      await api.deleteSite(siteId);
      await fetchData(); // 重新加载数据
    } catch (error) {
      console.error('删除站点失败:', error);
      handleError('删除站点失败: ' + (error as Error).message);
    }
  };

  // 保存分组排序
  const handleSaveGroupOrder = async () => {
    try {
      console.log('保存分组顺序', groups);
      // 构造需要更新的分组顺序数据
      const groupOrders = groups.map((group, index) => ({
        id: group.id as number, // 断言id为number类型
        order_num: index,
      }));

      // 调用API更新分组顺序
      const result = await api.updateGroupOrder(groupOrders);

      if (result) {
        console.log('分组排序更新成功');
        // 重新获取最新数据
        await fetchData();
      } else {
        throw new Error('分组排序更新失败');
      }

      setSortMode(SortMode.None);
      setCurrentSortingGroupId(null);
    } catch (error) {
      console.error('更新分组排序失败:', error);
      handleError('更新分组排序失败: ' + (error as Error).message);
    }
  };

  // 保存站点排序
  const handleSaveSiteOrder = async (groupId: number, sites: Site[]) => {
    try {
      console.log('保存站点排序', groupId, sites);

      // 构造需要更新的站点顺序数据
      const siteOrders = sites.map((site, index) => ({
        id: site.id as number,
        order_num: index,
      }));

      // 调用API更新站点顺序
      const result = await api.updateSiteOrder(siteOrders);

      if (result) {
        console.log('站点排序更新成功');
        // 重新获取最新数据
        await fetchData();
      } else {
        throw new Error('站点排序更新失败');
      }

      setSortMode(SortMode.None);
      setCurrentSortingGroupId(null);
    } catch (error) {
      console.error('更新站点排序失败:', error);
      handleError('更新站点排序失败: ' + (error as Error).message);
    }
  };

  // 启动分组排序
  const startGroupSort = () => {
    console.log('开始分组排序');
    setSortMode(SortMode.GroupSort);
    setCurrentSortingGroupId(null);
  };

  // 启动站点排序
  const startSiteSort = (groupId: number) => {
    console.log('开始站点排序');
    setSortMode(SortMode.SiteSort);
    setCurrentSortingGroupId(groupId);
  };

  // 取消排序
  const cancelSort = () => {
    setSortMode(SortMode.None);
    setCurrentSortingGroupId(null);
  };

  // 处理拖拽结束事件
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    if (active.id !== over.id) {
      const oldIndex = groups.findIndex((group) => group.id.toString() === active.id);
      const newIndex = groups.findIndex((group) => group.id.toString() === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        setGroups(arrayMove(groups, oldIndex, newIndex));
      }
    }
  };

  // 新增分组相关函数
  const handleOpenAddGroup = () => {
    setNewGroup({ name: '', order_num: groups.length });
    setOpenAddGroup(true);
  };

  const handleCloseAddGroup = () => {
    setOpenAddGroup(false);
  };

  const handleGroupInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewGroup({
      ...newGroup,
      [e.target.name]: e.target.value,
    });
  };

  const handleCreateGroup = async () => {
    try {
      if (!newGroup.name) {
        handleError('分组名称不能为空');
        return;
      }

      await api.createGroup(newGroup as Group);
      await fetchData(); // 重新加载数据
      handleCloseAddGroup();
      setNewGroup({ name: '', order_num: 0 }); // 重置表单
    } catch (error) {
      console.error('创建分组失败:', error);
      handleError('创建分组失败: ' + (error as Error).message);
    }
  };

  // 新增站点相关函数
  const handleOpenAddSite = (groupId: number) => {
    const group = groups.find((g) => g.id === groupId);
    const maxOrderNum = group?.sites.length
      ? Math.max(...group.sites.map((s) => s.order_num)) + 1
      : 0;

    setNewSite({
      name: '',
      url: '',
      icon: '',
      description: '',
      notes: '',
      group_id: groupId,
      order_num: maxOrderNum,
    });

    setOpenAddSite(true);
  };

  const handleCloseAddSite = () => {
    setOpenAddSite(false);
  };

  const handleSiteInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewSite({
      ...newSite,
      [e.target.name]: e.target.value,
    });
  };

  const handleCreateSite = async () => {
    try {
      if (!newSite.name || !newSite.url) {
        handleError('站点名称和URL不能为空');
        return;
      }

      await api.createSite(newSite as Site);
      await fetchData(); // 重新加载数据
      handleCloseAddSite();
    } catch (error) {
      console.error('创建站点失败:', error);
      handleError('创建站点失败: ' + (error as Error).message);
    }
  };

  // 配置相关函数
  const handleOpenConfig = () => {
    setTempConfigs({ ...configs });
    setOpenConfig(true);
  };

  const handleCloseConfig = () => {
    setOpenConfig(false);
  };

  const handleConfigInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempConfigs({
      ...tempConfigs,
      [e.target.name]: e.target.value,
    });
  };

  const handleSaveConfig = async () => {
    try {
      // 保存所有配置
      for (const [key, value] of Object.entries(tempConfigs)) {
        if (configs[key] !== value) {
          await api.setConfig(key, value);
        }
      }

      // 更新配置状态
      setConfigs({ ...tempConfigs });
      handleCloseConfig();
    } catch (error) {
      console.error('保存配置失败:', error);
      handleError('保存配置失败: ' + (error as Error).message);
    }
  };

  // 处理导出数据
  const handleExportData = async () => {
    try {
      setLoading(true);

      // 提取所有站点数据为单独的数组
      const allSites: Site[] = [];
      groups.forEach((group) => {
        if (group.sites && group.sites.length > 0) {
          allSites.push(...group.sites);
        }
      });

      const exportData = {
        // 只导出分组基本信息，不包含站点
        groups: groups.map((group) => ({
          id: group.id,
          name: group.name,
          order_num: group.order_num,
        })),
        // 站点数据作为单独的顶级数组
        sites: allSites,
        configs: configs,
        // 添加版本和导出日期
        version: '1.0',
        exportDate: new Date().toISOString(),
      };

      // 创建并下载JSON文件
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

      const exportFileName = `导航站备份_${new Date().toISOString().slice(0, 10)}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileName);
      linkElement.click();
    } catch (error) {
      console.error('导出数据失败:', error);
      handleError('导出数据失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  // 处理导入对话框
  const handleOpenImport = () => {
    setImportFile(null);
    setImportError(null);
    setOpenImport(true);
    handleMenuClose();
  };

  const handleCloseImport = () => {
    setOpenImport(false);
  };

  // 处理文件选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImportFile(e.target.files[0]);
      setImportError(null);
    }
  };

  // 处理导入数据
  const handleImportData = async () => {
    if (!importFile) {
      handleError('请选择要导入的文件');
      return;
    }

    try {
      setImportLoading(true);
      setImportError(null);

      const fileReader = new FileReader();
      fileReader.readAsText(importFile, 'UTF-8');

      fileReader.onload = async (e) => {
        try {
          if (!e.target?.result) {
            throw new Error('读取文件失败');
          }

          const importData = JSON.parse(e.target.result as string);

          // 验证导入数据格式
          if (!importData.groups || !Array.isArray(importData.groups)) {
            throw new Error('导入文件格式错误：缺少分组数据');
          }

          if (!importData.sites || !Array.isArray(importData.sites)) {
            throw new Error('导入文件格式错误：缺少站点数据');
          }

          if (!importData.configs || typeof importData.configs !== 'object') {
            throw new Error('导入文件格式错误：缺少配置数据');
          }

          // 调用API导入数据
          const result = await api.importData(importData);

          if (!result.success) {
            throw new Error(result.error || '导入失败');
          }

          // 显示导入结果统计
          const stats = result.stats;
          if (stats) {
            const summary = [
              `导入成功！`,
              `分组：发现${stats.groups.total}个，新建${stats.groups.created}个，合并${stats.groups.merged}个`,
              `卡片：发现${stats.sites.total}个，新建${stats.sites.created}个，更新${stats.sites.updated}个，跳过${stats.sites.skipped}个`,
            ].join('\n');

            setImportResultMessage(summary);
            setImportResultOpen(true);
          }

          // 刷新数据
          await fetchData();
          await fetchConfigs();
          handleCloseImport();
        } catch (error) {
          console.error('解析导入数据失败:', error);
          handleError('解析导入数据失败: ' + (error instanceof Error ? error.message : '未知错误'));
        } finally {
          setImportLoading(false);
        }
      };

      fileReader.onerror = () => {
        handleError('读取文件失败');
        setImportLoading(false);
      };
    } catch (error) {
      console.error('导入数据失败:', error);
      handleError('导入数据失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setImportLoading(false);
    }
  };

  // 渲染登录页面
  const renderLoginForm = () => {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <LoginForm onLogin={handleLogin} loading={loginLoading} error={loginError} />
      </Box>
    );
  };

  // 如果正在检查认证状态，显示加载界面
  if (isAuthChecking) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.default',
          }}
        >
          <CircularProgress size={60} thickness={4} />
        </Box>
      </ThemeProvider>
    );
  }

  // 如果需要认证但未认证，显示登录界面
  if (isAuthRequired && !isAuthenticated) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {renderLoginForm()}
      </ThemeProvider>
    );
  }

  // 更新分组
  const handleGroupUpdate = async (updatedGroup: Group) => {
    try {
      if (updatedGroup.id) {
        await api.updateGroup(updatedGroup.id, updatedGroup);
        await fetchData(); // 重新加载数据
      }
    } catch (error) {
      console.error('更新分组失败:', error);
      handleError('更新分组失败: ' + (error as Error).message);
    }
  };

  // 删除分组
  const handleGroupDelete = async (groupId: number) => {
    try {
      await api.deleteGroup(groupId);
      await fetchData(); // 重新加载数据
    } catch (error) {
      console.error('删除分组失败:', error);
      handleError('删除分组失败: ' + (error as Error).message);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {/* 错误提示 Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity='error'
          variant='filled'
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {/* 导入结果提示 Snackbar */}
      <Snackbar
        open={importResultOpen}
        autoHideDuration={6000}
        onClose={() => setImportResultOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setImportResultOpen(false)}
          severity='success'
          variant='filled'
          sx={{
            width: '100%',
            whiteSpace: 'pre-line',
            backgroundColor: (theme) => (theme.palette.mode === 'dark' ? '#2e7d32' : undefined),
            color: (theme) => (theme.palette.mode === 'dark' ? '#fff' : undefined),
            '& .MuiAlert-icon': {
              color: (theme) => (theme.palette.mode === 'dark' ? '#fff' : undefined),
            },
          }}
        >
          {importResultMessage}
        </Alert>
      </Snackbar>

      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          color: 'text.primary',
          transition: 'all 0.3s ease-in-out',
          position: 'relative', // 添加相对定位，作为背景图片的容器
          overflow: 'hidden', // 防止背景图片溢出
        }}
      >
        {/* 背景图片 */}
        {configs['site.backgroundImage'] && (
          <>
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: `url(${configs['site.backgroundImage']})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                zIndex: 0,
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: (theme) =>
                    theme.palette.mode === 'dark'
                      ? 'rgba(0, 0, 0, ' + (1 - Number(configs['site.backgroundOpacity'])) + ')'
                      : 'rgba(255, 255, 255, ' +
                        (1 - Number(configs['site.backgroundOpacity'])) +
                        ')',
                  zIndex: 1,
                },
              }}
            />
          </>
        )}

        <Container
          maxWidth='lg'
          sx={{
            py: 4,
            px: { xs: 2, sm: 3, md: 4 },
            position: 'relative', // 使内容位于背景图片和蒙版之上
            zIndex: 2,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 5,
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 2, sm: 0 },
            }}
          >
            <Typography
              variant='h3'
              component='h1'
              fontWeight='bold'
              color='text.primary'
              sx={{
                fontSize: { xs: '1.75rem', sm: '2.125rem', md: '3rem' },
                textAlign: { xs: 'center', sm: 'left' },
              }}
            >
              {configs['site.name']}
            </Typography>
            <Stack
              direction={{ xs: 'row', sm: 'row' }}
              spacing={{ xs: 1, sm: 2 }}
              alignItems='center'
              width={{ xs: '100%', sm: 'auto' }}
              justifyContent={{ xs: 'center', sm: 'flex-end' }}
              flexWrap='wrap'
              sx={{ gap: { xs: 1, sm: 2 }, py: { xs: 1, sm: 0 } }}
            >
              {sortMode !== SortMode.None ? (
                <>
                  {sortMode === SortMode.GroupSort && (
                    <Button
                      variant='contained'
                      color='primary'
                      startIcon={<SaveIcon />}
                      onClick={handleSaveGroupOrder}
                      size='small'
                      sx={{
                        minWidth: 'auto',
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      }}
                    >
                      保存分组顺序
                    </Button>
                  )}
                  <Button
                    variant='outlined'
                    color='inherit'
                    startIcon={<CancelIcon />}
                    onClick={cancelSort}
                    size='small'
                    sx={{
                      minWidth: 'auto',
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    }}
                  >
                    取消编辑
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant='contained'
                    color='primary'
                    startIcon={<AddIcon />}
                    onClick={handleOpenAddGroup}
                    size='small'
                    sx={{
                      minWidth: 'auto',
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    }}
                  >
                    新增分组
                  </Button>

                  <Button
                    variant='outlined'
                    color='primary'
                    startIcon={<MenuIcon />}
                    onClick={handleMenuOpen}
                    aria-controls={openMenu ? 'navigation-menu' : undefined}
                    aria-haspopup='true'
                    aria-expanded={openMenu ? 'true' : undefined}
                    size='small'
                    sx={{
                      minWidth: 'auto',
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    }}
                  >
                    更多选项
                  </Button>
                  <Menu
                    id='navigation-menu'
                    anchorEl={menuAnchorEl}
                    open={openMenu}
                    onClose={handleMenuClose}
                    MenuListProps={{
                      'aria-labelledby': 'navigation-button',
                    }}
                  >
                    <MenuItem onClick={startGroupSort}>
                      <ListItemIcon>
                        <SortIcon fontSize='small' />
                      </ListItemIcon>
                      <ListItemText>编辑排序</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={handleOpenConfig}>
                      <ListItemIcon>
                        <SettingsIcon fontSize='small' />
                      </ListItemIcon>
                      <ListItemText>网站设置</ListItemText>
                    </MenuItem>
                    <Divider />
                    <MenuItem onClick={handleExportData}>
                      <ListItemIcon>
                        <FileDownloadIcon fontSize='small' />
                      </ListItemIcon>
                      <ListItemText>导出数据</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={handleOpenImport}>
                      <ListItemIcon>
                        <FileUploadIcon fontSize='small' />
                      </ListItemIcon>
                      <ListItemText>导入数据</ListItemText>
                    </MenuItem>
                    {isAuthenticated && (
                      <>
                        <Divider />
                        <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                          <ListItemIcon sx={{ color: 'error.main' }}>
                            <LogoutIcon fontSize='small' />
                          </ListItemIcon>
                          <ListItemText>退出登录</ListItemText>
                        </MenuItem>
                      </>
                    )}
                  </Menu>
                </>
              )}
              <ThemeToggle darkMode={darkMode} onToggle={toggleTheme} />
            </Stack>
          </Box>

          {loading && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '200px',
              }}
            >
              <CircularProgress size={60} thickness={4} />
            </Box>
          )}

          {!loading && !error && (
            <Box
              sx={{
                '& > *': { mb: 5 },
                minHeight: '100px',
              }}
            >
              {sortMode === SortMode.GroupSort ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={groups.map((group) => group.id.toString())}
                    strategy={verticalListSortingStrategy}
                  >
                    <Stack
                      spacing={2}
                      sx={{
                        '& > *': {
                          transition: 'none',
                        },
                      }}
                    >
                      {groups.map((group) => (
                        <SortableGroupItem key={group.id} id={group.id.toString()} group={group} />
                      ))}
                    </Stack>
                  </SortableContext>
                </DndContext>
              ) : (
                <Stack spacing={5}>
                  {groups.map((group) => (
                    <GroupCard
                      key={`group-${group.id}`}
                      group={group}
                      sortMode={sortMode === SortMode.None ? 'None' : 'SiteSort'}
                      currentSortingGroupId={currentSortingGroupId}
                      onUpdate={handleSiteUpdate}
                      onDelete={handleSiteDelete}
                      onSaveSiteOrder={handleSaveSiteOrder}
                      onStartSiteSort={startSiteSort}
                      onAddSite={handleOpenAddSite}
                      onUpdateGroup={handleGroupUpdate}
                      onDeleteGroup={handleGroupDelete}
                      configs={configs}
                    />
                  ))}
                </Stack>
              )}
            </Box>
          )}

          {/* 新增分组对话框 */}
          <Dialog
            open={openAddGroup}
            onClose={handleCloseAddGroup}
            maxWidth='md'
            fullWidth
            PaperProps={{
              sx: {
                m: { xs: 2, sm: 3, md: 4 },
                width: { xs: 'calc(100% - 32px)', sm: '80%', md: '70%', lg: '60%' },
                maxWidth: { sm: '600px' },
              },
            }}
          >
            <DialogTitle>
              新增分组
              <IconButton
                aria-label='close'
                onClick={handleCloseAddGroup}
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: 8,
                }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <DialogContentText sx={{ mb: 2 }}>请输入新分组的信息</DialogContentText>
              <TextField
                autoFocus
                margin='dense'
                id='group-name'
                name='name'
                label='分组名称'
                type='text'
                fullWidth
                variant='outlined'
                value={newGroup.name}
                onChange={handleGroupInputChange}
                sx={{ mb: 2 }}
              />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
              <Button onClick={handleCloseAddGroup} variant='outlined'>
                取消
              </Button>
              <Button onClick={handleCreateGroup} variant='contained' color='primary'>
                创建
              </Button>
            </DialogActions>
          </Dialog>

          {/* 新增站点对话框 */}
          <Dialog
            open={openAddSite}
            onClose={handleCloseAddSite}
            maxWidth='md'
            fullWidth
            PaperProps={{
              sx: {
                m: { xs: 2, sm: 'auto' },
                width: { xs: 'calc(100% - 32px)', sm: 'auto' },
              },
            }}
          >
            <DialogTitle>
              新增站点
              <IconButton
                aria-label='close'
                onClick={handleCloseAddSite}
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: 8,
                }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <DialogContentText sx={{ mb: 2 }}>请输入新站点的信息</DialogContentText>
              <Stack spacing={2}>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 2,
                    flexDirection: { xs: 'column', sm: 'row' },
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <TextField
                      autoFocus
                      margin='dense'
                      id='site-name'
                      name='name'
                      label='站点名称'
                      type='text'
                      fullWidth
                      variant='outlined'
                      value={newSite.name}
                      onChange={handleSiteInputChange}
                    />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <TextField
                      margin='dense'
                      id='site-url'
                      name='url'
                      label='站点URL'
                      type='url'
                      fullWidth
                      variant='outlined'
                      value={newSite.url}
                      onChange={handleSiteInputChange}
                    />
                  </Box>
                </Box>
                <TextField
                  margin='dense'
                  id='site-icon'
                  name='icon'
                  label='图标URL'
                  type='url'
                  fullWidth
                  variant='outlined'
                  value={newSite.icon}
                  onChange={handleSiteInputChange}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position='end'>
                        <IconButton
                          onClick={() => {
                            if (!newSite.url) {
                              handleError('请先输入站点URL');
                              return;
                            }
                            const domain = extractDomain(newSite.url);
                            if (domain) {
                              const actualIconApi =
                                configs['site.iconApi'] ||
                                'https://www.faviconextractor.com/favicon/{domain}?larger=true';
                              const iconUrl = actualIconApi.replace('{domain}', domain);
                              setNewSite({
                                ...newSite,
                                icon: iconUrl,
                              });
                            } else {
                              handleError('无法从URL中获取域名');
                            }
                          }}
                          edge='end'
                          title='自动获取图标'
                        >
                          <AutoFixHighIcon />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  margin='dense'
                  id='site-description'
                  name='description'
                  label='站点描述'
                  type='text'
                  fullWidth
                  variant='outlined'
                  value={newSite.description}
                  onChange={handleSiteInputChange}
                />
                <TextField
                  margin='dense'
                  id='site-notes'
                  name='notes'
                  label='备注'
                  type='text'
                  fullWidth
                  multiline
                  rows={2}
                  variant='outlined'
                  value={newSite.notes}
                  onChange={handleSiteInputChange}
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
              <Button onClick={handleCloseAddSite} variant='outlined'>
                取消
              </Button>
              <Button onClick={handleCreateSite} variant='contained' color='primary'>
                创建
              </Button>
            </DialogActions>
          </Dialog>

          {/* 网站配置对话框 */}
          <Dialog
            open={openConfig}
            onClose={handleCloseConfig}
            maxWidth='sm'
            fullWidth
            PaperProps={{
              sx: {
                m: { xs: 2, sm: 3, md: 4 },
                width: { xs: 'calc(100% - 32px)', sm: '80%', md: '70%', lg: '60%' },
                maxWidth: { sm: '600px' },
              },
            }}
          >
            <DialogTitle>
              网站设置
              <IconButton
                aria-label='close'
                onClick={handleCloseConfig}
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: 8,
                }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <DialogContentText sx={{ mb: 2 }}>配置网站的基本信息和外观</DialogContentText>
              <Stack spacing={2}>
                <TextField
                  margin='dense'
                  id='site-title'
                  name='site.title'
                  label='网站标题 (浏览器标签)'
                  type='text'
                  fullWidth
                  variant='outlined'
                  value={tempConfigs['site.title']}
                  onChange={handleConfigInputChange}
                />
                <TextField
                  margin='dense'
                  id='site-name'
                  name='site.name'
                  label='网站名称 (显示在页面中)'
                  type='text'
                  fullWidth
                  variant='outlined'
                  value={tempConfigs['site.name']}
                  onChange={handleConfigInputChange}
                />
                {/* 获取图标API设置项 */}
                <Box sx={{ mb: 1 }}>
                  <Typography variant='subtitle1' gutterBottom>
                    获取图标API设置
                  </Typography>
                  <TextField
                    margin='dense'
                    id='site-icon-api'
                    name='site.iconApi'
                    label='获取图标API URL'
                    type='text'
                    fullWidth
                    variant='outlined'
                    value={tempConfigs['site.iconApi']}
                    onChange={handleConfigInputChange}
                    placeholder='https://example.com/favicon/{domain}'
                    helperText='输入获取图标API的地址，使用 {domain} 作为域名占位符'
                  />
                </Box>
                {/* 新增背景图片设置 */}
                <Box sx={{ mb: 1 }}>
                  <Typography variant='subtitle1' gutterBottom>
                    背景图片设置
                  </Typography>
                  <TextField
                    margin='dense'
                    id='site-background-image'
                    name='site.backgroundImage'
                    label='背景图片URL'
                    type='url'
                    fullWidth
                    variant='outlined'
                    value={tempConfigs['site.backgroundImage']}
                    onChange={handleConfigInputChange}
                    placeholder='https://example.com/background.jpg'
                    helperText='输入图片URL，留空则不使用背景图片'
                  />

                  <Box sx={{ mt: 2, mb: 1 }}>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                      id='background-opacity-slider'
                      gutterBottom
                    >
                      背景蒙版透明度: {Number(tempConfigs['site.backgroundOpacity']).toFixed(2)}
                    </Typography>
                    <Slider
                      aria-labelledby='background-opacity-slider'
                      name='site.backgroundOpacity'
                      min={0}
                      max={1}
                      step={0.01}
                      valueLabelDisplay='auto'
                      value={Number(tempConfigs['site.backgroundOpacity'])}
                      onChange={(_, value) => {
                        setTempConfigs({
                          ...tempConfigs,
                          'site.backgroundOpacity': String(value),
                        });
                      }}
                    />
                    <Typography variant='caption' color='text.secondary'>
                      值越大，背景图片越清晰，内容可能越难看清
                    </Typography>
                  </Box>
                </Box>
                <TextField
                  margin='dense'
                  id='site-custom-css'
                  name='site.customCss'
                  label='自定义CSS'
                  type='text'
                  fullWidth
                  multiline
                  rows={6}
                  variant='outlined'
                  value={tempConfigs['site.customCss']}
                  onChange={handleConfigInputChange}
                  placeholder='/* 自定义样式 */\nbody { }'
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
              <Button onClick={handleCloseConfig} variant='outlined'>
                取消
              </Button>
              <Button onClick={handleSaveConfig} variant='contained' color='primary'>
                保存设置
              </Button>
            </DialogActions>
          </Dialog>

          {/* 导入数据对话框 */}
          <Dialog
            open={openImport}
            onClose={handleCloseImport}
            maxWidth='sm'
            fullWidth
            PaperProps={{
              sx: {
                m: { xs: 2, sm: 'auto' },
                width: { xs: 'calc(100% - 32px)', sm: 'auto' },
              },
            }}
          >
            <DialogTitle>
              导入数据
              <IconButton
                aria-label='close'
                onClick={handleCloseImport}
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: 8,
                }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <DialogContentText sx={{ mb: 2 }}>
                请选择要导入的JSON文件，导入将覆盖现有数据。
              </DialogContentText>
              <Box sx={{ mb: 2 }}>
                <Button
                  variant='outlined'
                  component='label'
                  startIcon={<FileUploadIcon />}
                  sx={{ mb: 2 }}
                >
                  选择文件
                  <input type='file' hidden accept='.json' onChange={handleFileSelect} />
                </Button>
                {importFile && (
                  <Typography variant='body2' sx={{ mt: 1 }}>
                    已选择: {importFile.name}
                  </Typography>
                )}
              </Box>
              {importError && (
                <Alert severity='error' sx={{ mb: 2 }}>
                  {importError}
                </Alert>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
              <Button onClick={handleCloseImport} variant='outlined'>
                取消
              </Button>
              <Button
                onClick={handleImportData}
                variant='contained'
                color='primary'
                disabled={!importFile || importLoading}
                startIcon={importLoading ? <CircularProgress size={20} /> : <FileUploadIcon />}
              >
                {importLoading ? '导入中...' : '导入'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* GitHub角标 - 在移动端调整位置 */}
          <Box
            sx={{
              position: 'fixed',
              bottom: { xs: 8, sm: 16 },
              right: { xs: 8, sm: 16 },
              zIndex: 10,
            }}
          >
            <Paper
              component='a'
              href='https://github.com/zqq-nuli/Navihive'
              target='_blank'
              rel='noopener noreferrer'
              elevation={2}
              sx={{
                display: 'flex',
                alignItems: 'center',
                p: 1,
                borderRadius: 10,
                bgcolor: 'background.paper',
                color: 'text.secondary',
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  bgcolor: 'action.hover',
                  color: 'text.primary',
                  boxShadow: 4,
                },
                textDecoration: 'none',
              }}
            >
              <GitHubIcon />
            </Paper>
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
