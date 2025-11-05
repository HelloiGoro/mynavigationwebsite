import { Group, Site, LoginResponse, ExportData, ImportResult } from './http';

// 模拟数据
const mockGroups: Group[] = [
  {
    id: 1,
    name: '常用工具',
    order_num: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: '开发资源',
    order_num: 2,
    created_at: '2024-01-01T20:00:00Z',
    updated_at: '2024-01-01T30:00:00Z',
  },
  {
    id: 3,
    name: '开发资源3',
    order_num: 3,
    created_at: '2024-01-01T40:00:00Z',
    updated_at: '2024-01-01T50:00:00Z',
  },
];

const mockSites: Site[] = [
  {
    id: 1,
    group_id: 1,
    name: 'Google',
    url: 'https://www.google.com',
    icon: 'https://img.zhengmi.org/file/1742480539412_微信图片_20240707011628.jpg',
    description: '搜索引擎',
    notes: '',
    order_num: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    group_id: 1,
    name: 'GitHub',
    url: 'https://github.com',
    icon: 'https://img.zhengmi.org/file/1742480539412_微信图片_20240707011628.jpg',
    description: '代码托管平台',
    notes: '',
    order_num: 2,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 3,
    group_id: 1,
    name: 'Google',
    url: 'https://www.google.com',
    icon: 'https://img.zhengmi.org/file/1742480539412_微信图片_20240707011628.jpg',
    description: '搜索引擎',
    notes: '',
    order_num: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 4,
    group_id: 1,
    name: 'GitHub',
    url: 'https://github.com',
    icon: 'github.png',
    description: '代码托管平台',
    notes: '',
    order_num: 2,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 5,
    group_id: 1,
    name: 'GitHub',
    url: 'https://github.com',
    icon: 'github.png',
    description: '代码托管平台',
    notes: '',
    order_num: 2,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 6,
    group_id: 1,
    name: 'GitHub',
    url: 'https://github.com',
    icon: 'github.png',
    description: '代码托管平台6',
    notes: '',
    order_num: 2,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

// 添加模拟配置数据
const mockConfigs: Record<string, string> = {
  'site.title': '我的导航站',
  'site.name': '个人导航',
  'site.customCss': '',
};

// 模拟API实现
export class MockNavigationClient {
  private token: string | null = null;

  constructor() {
    // 从本地存储加载令牌
    if (typeof localStorage !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  // 检查是否已登录
  isLoggedIn(): boolean {
    return !!this.token;
  }

  // 设置认证令牌
  setToken(token: string): void {
    this.token = token;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  // 清除认证令牌
  clearToken(): void {
    this.token = null;
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  // 登录API
  async login(
    username: string,
    password: string,
    rememberMe: boolean = false
  ): Promise<LoginResponse> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log(username, password, rememberMe ? '记住登录' : '标准登录');
    // 模拟登录验证逻辑 - 在Mock环境中任何账号密码都能登录
    const token = btoa(`${username}:${new Date().getTime()}:${rememberMe}`);
    this.setToken(token);

    return {
      success: true,
      token: token,
      message: `登录成功(模拟环境)${rememberMe ? '，已记住登录状态' : ''}`,
    };
  }

  // 登出
  logout(): void {
    this.clearToken();
  }

  // 检查身份验证状态
  async checkAuthStatus(): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    // 模拟真实环境中的行为：如果有token则认为已认证
    if (this.token) {
      return true;
    }

    // 开发环境中，也可以设置为总是返回true，便于开发
    // return true;

    // 没有token则需要登录
    return false;
  }

  async getGroups(): Promise<Group[]> {
    // 模拟网络延迟
    await new Promise((resolve) => setTimeout(resolve, 200));
    return [...mockGroups];
  }

  async getGroup(id: number): Promise<Group | null> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return mockGroups.find((g) => g.id === id) || null;
  }

  async createGroup(group: Group): Promise<Group> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const newGroup = {
      ...group,
      id: Math.max(0, ...mockGroups.map((g) => g.id || 0)) + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockGroups.push(newGroup);
    return newGroup;
  }

  async updateGroup(id: number, group: Partial<Group>): Promise<Group | null> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const index = mockGroups.findIndex((g) => g.id === id);
    if (index === -1) return null;

    mockGroups[index] = {
      ...mockGroups[index],
      ...group,
      updated_at: new Date().toISOString(),
    };
    return mockGroups[index];
  }

  async deleteGroup(id: number): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const index = mockGroups.findIndex((g) => g.id === id);
    if (index === -1) return false;

    mockGroups.splice(index, 1);
    return true;
  }

  async getSites(groupId?: number): Promise<Site[]> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    if (groupId) {
      return mockSites.filter((site) => site.group_id === groupId);
    }
    return [...mockSites];
  }

  // 实现其他方法，与NavigationClient保持一致的接口...
  async getSite(id: number): Promise<Site | null> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return mockSites.find((s) => s.id === id) || null;
  }

  async createSite(site: Site): Promise<Site> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const newSite = {
      ...site,
      id: Math.max(0, ...mockSites.map((s) => s.id || 0)) + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockSites.push(newSite);
    return newSite;
  }

  async updateSite(id: number, site: Partial<Site>): Promise<Site | null> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const index = mockSites.findIndex((s) => s.id === id);
    if (index === -1) return null;

    mockSites[index] = {
      ...mockSites[index],
      ...site,
      updated_at: new Date().toISOString(),
    };
    return mockSites[index];
  }

  async deleteSite(id: number): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const index = mockSites.findIndex((s) => s.id === id);
    if (index === -1) return false;

    mockSites.splice(index, 1);
    return true;
  }

  async updateGroupOrder(groupOrders: { id: number; order_num: number }[]): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    for (const order of groupOrders) {
      const index = mockGroups.findIndex((g) => g.id === order.id);
      if (index !== -1) {
        mockGroups[index].order_num = order.order_num;
      }
    }
    return true;
  }

  async updateSiteOrder(siteOrders: { id: number; order_num: number }[]): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    for (const order of siteOrders) {
      const index = mockSites.findIndex((s) => s.id === order.id);
      if (index !== -1) {
        mockSites[index].order_num = order.order_num;
      }
    }
    return true;
  }

  // 配置相关API
  async getConfigs(): Promise<Record<string, string>> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return { ...mockConfigs };
  }

  async getConfig(key: string): Promise<string | null> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return mockConfigs[key] || null;
  }

  async setConfig(key: string, value: string): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    mockConfigs[key] = value;
    return true;
  }

  async deleteConfig(key: string): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    if (key in mockConfigs) {
      delete mockConfigs[key];
      return true;
    }
    return false;
  }

  // 数据导出
  async exportData(): Promise<ExportData> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return {
      groups: [...mockGroups],
      sites: [...mockSites],
      configs: { ...mockConfigs },
      version: '1.0',
      exportDate: new Date().toISOString(),
    };
  }

  // 数据导入
  async importData(data: ExportData): Promise<ImportResult> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      // 统计信息
      const stats = {
        groups: {
          total: data.groups.length,
          created: 0,
          merged: 0,
        },
        sites: {
          total: data.sites.length,
          created: 0,
          updated: 0,
          skipped: 0,
        },
      };

      // 模拟合并处理
      // 为分组创建映射 - 旧ID到新ID
      const groupMap = new Map<number, number>();

      // 处理分组
      for (const importGroup of data.groups) {
        // 检查是否存在同名分组
        const existingGroupIndex = mockGroups.findIndex((g) => g.name === importGroup.name);

        if (existingGroupIndex >= 0) {
          // 已存在同名分组，添加到映射
          if (importGroup.id) {
            groupMap.set(importGroup.id, mockGroups[existingGroupIndex].id as number);
          }
          stats.groups.merged++;
        } else {
          // 创建新分组
          const newId = Math.max(0, ...mockGroups.map((g) => g.id || 0)) + 1;
          const newGroup = {
            ...importGroup,
            id: newId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          mockGroups.push(newGroup);

          // 添加到映射
          if (importGroup.id) {
            groupMap.set(importGroup.id, newId);
          }
          stats.groups.created++;
        }
      }

      // 处理站点
      for (const importSite of data.sites) {
        // 获取新分组ID
        const newGroupId = groupMap.get(importSite.group_id);

        // 如果没有映射的分组ID，跳过该站点
        if (!newGroupId) {
          stats.sites.skipped++;
          continue;
        }

        // 检查是否有相同URL的站点在同一分组下
        const existingSiteIndex = mockSites.findIndex(
          (s) => s.group_id === newGroupId && s.url === importSite.url
        );

        if (existingSiteIndex >= 0) {
          // 更新现有站点
          mockSites[existingSiteIndex] = {
            ...mockSites[existingSiteIndex],
            name: importSite.name,
            icon: importSite.icon,
            description: importSite.description,
            notes: importSite.notes,
            updated_at: new Date().toISOString(),
          };
          stats.sites.updated++;
        } else {
          // 创建新站点
          const newId = Math.max(0, ...mockSites.map((s) => s.id || 0)) + 1;
          const newSite = {
            ...importSite,
            id: newId,
            group_id: newGroupId, // 使用新的分组ID
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          mockSites.push(newSite);
          stats.sites.created++;
        }
      }

      // 导入配置数据
      Object.entries(data.configs).forEach(([key, value]) => {
        mockConfigs[key] = value;
      });

      return {
        success: true,
        stats,
      };
    } catch (error) {
      console.error('模拟导入数据失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }
}
