// src/api/http.ts
// 不使用外部JWT库，改为内置的crypto API

// 定义D1数据库类型
interface D1Database {
  prepare(query: string): D1PreparedStatement;
  exec(query: string): Promise<D1Result>;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(column?: string): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T>>;
}

interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  error?: string;
  meta?: unknown;
}

// 定义环境变量接口
interface Env {
  DB: D1Database;
  AUTH_ENABLED?: string; // 是否启用身份验证
  AUTH_USERNAME?: string; // 认证用户名
  AUTH_PASSWORD?: string; // 认证密码
  AUTH_SECRET?: string; // JWT密钥
}

// 数据类型定义
export interface Group {
  id?: number;
  name: string;
  order_num: number;
  created_at?: string;
  updated_at?: string;
}

export interface Site {
  id?: number;
  group_id: number;
  name: string;
  url: string;
  icon: string;
  description: string;
  notes: string;
  order_num: number;
  created_at?: string;
  updated_at?: string;
}

// 新增配置接口
export interface Config {
  key: string;
  value: string;
  created_at?: string;
  updated_at?: string;
}

// 扩展导出数据接口，添加导入结果类型
export interface ExportData {
  groups: Group[];
  sites: Site[];
  configs: Record<string, string>;
  version: string;
  exportDate: string;
}

// 导入结果接口
export interface ImportResult {
  success: boolean;
  stats?: {
    groups: {
      total: number;
      created: number;
      merged: number;
    };
    sites: {
      total: number;
      created: number;
      updated: number;
      skipped: number;
    };
  };
  error?: string;
}

// 新增用户登录接口
export interface LoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean; // 新增记住我选项
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  message?: string;
}

// API 类
export class NavigationAPI {
  private db: D1Database;
  private authEnabled: boolean;
  private username: string;
  private password: string;
  private secret: string;

  constructor(env: Env) {
    this.db = env.DB;
    this.authEnabled = env.AUTH_ENABLED === 'true';
    this.username = env.AUTH_USERNAME || '';
    this.password = env.AUTH_PASSWORD || '';
    this.secret = env.AUTH_SECRET || 'DefaultSecretKey';
  }

  // 初始化数据库表
  // 修改initDB方法，将SQL语句分开执行
  async initDB(): Promise<{ success: boolean; alreadyInitialized: boolean }> {
    // 首先检查数据库是否已初始化
    try {
      const isInitialized = await this.getConfig('DB_INITIALIZED');
      if (isInitialized === 'true') {
        return { success: true, alreadyInitialized: true };
      }
    } catch {
      // 如果发生错误，可能是配置表不存在，继续初始化
    }

    // 先创建groups表
    await this.db.exec(
      `CREATE TABLE IF NOT EXISTS groups (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, order_num INTEGER NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`
    );

    // 再创建sites表
    await this.db.exec(
      `CREATE TABLE IF NOT EXISTS sites (id INTEGER PRIMARY KEY AUTOINCREMENT, group_id INTEGER NOT NULL, name TEXT NOT NULL, url TEXT NOT NULL, icon TEXT, description TEXT, notes TEXT, order_num INTEGER NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE);`
    );

    // 创建全局配置表
    await this.db.exec(`CREATE TABLE IF NOT EXISTS configs (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`);

    // 设置初始化标志
    await this.setConfig('DB_INITIALIZED', 'true');

    return { success: true, alreadyInitialized: false };
  }

  // 验证用户登录
  async login(loginRequest: LoginRequest): Promise<LoginResponse> {
    // 如果未启用身份验证，直接返回成功
    if (!this.authEnabled) {
      return {
        success: true,
        token: await this.generateToken({ username: 'guest' }, false),
        message: '身份验证未启用，默认登录成功',
      };
    }

    // 验证用户名和密码
    if (loginRequest.username === this.username && loginRequest.password === this.password) {
      // 生成JWT令牌，传递记住我参数
      const token = await this.generateToken(
        { username: loginRequest.username },
        loginRequest.rememberMe || false
      );
      return {
        success: true,
        token,
        message: '登录成功',
      };
    }

    return {
      success: false,
      message: '用户名或密码错误',
    };
  }

  // 验证令牌有效性
  async verifyToken(token: string): Promise<{ valid: boolean; payload?: Record<string, unknown> }> {
    if (!this.authEnabled) {
      return { valid: true };
    }

    try {
      // 解析JWT
      const [header, payload, signature] = token.split('.');
      if (!header || !payload || !signature) {
        throw new Error('无效的Token格式');
      }

      // 解码payload
      const decodedPayload = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));

      // 验证过期时间
      if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) {
        throw new Error('Token已过期');
      }

      // 注意：这个简化版本没有验证签名，仅用于开发/测试
      // 在生产环境中，应该使用crypto.subtle.verify来验证签名

      return { valid: true, payload: decodedPayload };
    } catch (error) {
      console.error('Token验证失败:', error);
      return { valid: false };
    }
  }

  // 生成JWT令牌
  private async generateToken(
    payload: Record<string, unknown>,
    rememberMe: boolean = false
  ): Promise<string> {
    // 准备payload
    const expiresIn = rememberMe
      ? 30 * 24 * 60 * 60 // 30天 (一个月)
      : 24 * 60 * 60; // 24小时

    const tokenPayload = {
      ...payload,
      exp: Math.floor(Date.now() / 1000) + expiresIn,
      iat: Math.floor(Date.now() / 1000),
    };

    // 创建Header和Payload部分
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = btoa(JSON.stringify(header))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const encodedPayload = btoa(JSON.stringify(tokenPayload))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // 创建签名（简化版，仅用于开发/测试）
    // 在生产环境中，应该使用crypto.subtle.sign生成签名
    const signature = btoa(this.secret + encodedHeader + encodedPayload)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // 组合JWT
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  // 检查认证是否启用
  isAuthEnabled(): boolean {
    return this.authEnabled;
  }

  // 分组相关 API
  async getGroups(): Promise<Group[]> {
    const result = await this.db
      .prepare('SELECT id, name, order_num, created_at, updated_at FROM groups ORDER BY order_num')
      .all<Group>();
    return result.results || [];
  }

  async getGroup(id: number): Promise<Group | null> {
    const result = await this.db
      .prepare('SELECT id, name, order_num, created_at, updated_at FROM groups WHERE id = ?')
      .bind(id)
      .first<Group>();
    return result;
  }

  async createGroup(group: Group): Promise<Group> {
    const result = await this.db
      .prepare(
        'INSERT INTO groups (name, order_num) VALUES (?, ?) RETURNING id, name, order_num, created_at, updated_at'
      )
      .bind(group.name, group.order_num)
      .all<Group>();
    if (!result.results || result.results.length === 0) {
      throw new Error('创建分组失败');
    }
    return result.results[0];
  }

  async updateGroup(id: number, group: Partial<Group>): Promise<Group | null> {
    // 使用参数化查询，避免SQL注入
    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const params: (string | number)[] = [];

    // 安全地添加字段
    if (group.name !== undefined) {
      updates.push('name = ?');
      params.push(group.name);
    }

    if (group.order_num !== undefined) {
      updates.push('order_num = ?');
      params.push(group.order_num);
    }

    // 构建安全的参数化查询
    const query = `UPDATE groups SET ${updates.join(
      ', '
    )} WHERE id = ? RETURNING id, name, order_num, created_at, updated_at`;
    params.push(id);

    const result = await this.db
      .prepare(query)
      .bind(...params)
      .all<Group>();

    if (!result.results || result.results.length === 0) {
      return null;
    }
    return result.results[0];
  }

  async deleteGroup(id: number): Promise<boolean> {
    const result = await this.db.prepare('DELETE FROM groups WHERE id = ?').bind(id).run();
    return result.success;
  }

  // 网站相关 API
  async getSites(groupId?: number): Promise<Site[]> {
    let query =
      'SELECT id, group_id, name, url, icon, description, notes, order_num, created_at, updated_at FROM sites';
    const params: (string | number)[] = [];

    if (groupId !== undefined) {
      query += ' WHERE group_id = ?';
      params.push(groupId);
    }

    query += ' ORDER BY order_num';

    const result = await this.db
      .prepare(query)
      .bind(...params)
      .all<Site>();
    return result.results || [];
  }

  async getSite(id: number): Promise<Site | null> {
    const result = await this.db
      .prepare(
        'SELECT id, group_id, name, url, icon, description, notes, order_num, created_at, updated_at FROM sites WHERE id = ?'
      )
      .bind(id)
      .first<Site>();
    return result;
  }

  async createSite(site: Site): Promise<Site> {
    const result = await this.db
      .prepare(
        `
      INSERT INTO sites (group_id, name, url, icon, description, notes, order_num) 
      VALUES (?, ?, ?, ?, ?, ?, ?) 
      RETURNING id, group_id, name, url, icon, description, notes, order_num, created_at, updated_at
    `
      )
      .bind(
        site.group_id,
        site.name,
        site.url,
        site.icon || '',
        site.description || '',
        site.notes || '',
        site.order_num
      )
      .all<Site>();

    if (!result.results || result.results.length === 0) {
      throw new Error('创建站点失败');
    }
    return result.results[0];
  }

  async updateSite(id: number, site: Partial<Site>): Promise<Site | null> {
    // 使用参数化查询，避免SQL注入
    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const params: (string | number)[] = [];

    // 安全地添加字段
    if (site.group_id !== undefined) {
      updates.push('group_id = ?');
      params.push(site.group_id);
    }

    if (site.name !== undefined) {
      updates.push('name = ?');
      params.push(site.name);
    }

    if (site.url !== undefined) {
      updates.push('url = ?');
      params.push(site.url);
    }

    if (site.icon !== undefined) {
      updates.push('icon = ?');
      params.push(site.icon);
    }

    if (site.description !== undefined) {
      updates.push('description = ?');
      params.push(site.description);
    }

    if (site.notes !== undefined) {
      updates.push('notes = ?');
      params.push(site.notes);
    }

    if (site.order_num !== undefined) {
      updates.push('order_num = ?');
      params.push(site.order_num);
    }

    // 构建安全的参数化查询
    const query = `UPDATE sites SET ${updates.join(
      ', '
    )} WHERE id = ? RETURNING id, group_id, name, url, icon, description, notes, order_num, created_at, updated_at`;
    params.push(id);

    const result = await this.db
      .prepare(query)
      .bind(...params)
      .all<Site>();

    if (!result.results || result.results.length === 0) {
      return null;
    }
    return result.results[0];
  }

  async deleteSite(id: number): Promise<boolean> {
    const result = await this.db.prepare('DELETE FROM sites WHERE id = ?').bind(id).run();
    return result.success;
  }

  // 配置相关API
  async getConfigs(): Promise<Record<string, string>> {
    const result = await this.db.prepare('SELECT key, value FROM configs').all<Config>();

    // 将结果转换为键值对对象
    const configs: Record<string, string> = {};
    for (const config of result.results || []) {
      configs[config.key] = config.value;
    }

    return configs;
  }

  async getConfig(key: string): Promise<string | null> {
    const result = await this.db
      .prepare('SELECT value FROM configs WHERE key = ?')
      .bind(key)
      .first<{ value: string }>();

    return result ? result.value : null;
  }

  async setConfig(key: string, value: string): Promise<boolean> {
    try {
      // 使用UPSERT语法（SQLite支持）
      const result = await this.db
        .prepare(
          `INSERT INTO configs (key, value, updated_at) 
                    VALUES (?, ?, CURRENT_TIMESTAMP) 
                    ON CONFLICT(key) 
                    DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP`
        )
        .bind(key, value, value)
        .run();

      return result.success;
    } catch (error) {
      console.error('设置配置失败:', error);
      return false;
    }
  }

  async deleteConfig(key: string): Promise<boolean> {
    const result = await this.db.prepare('DELETE FROM configs WHERE key = ?').bind(key).run();

    return result.success;
  }

  // 批量更新排序
  async updateGroupOrder(groupOrders: { id: number; order_num: number }[]): Promise<boolean> {
    // 使用事务确保所有更新一起成功或失败
    return await this.db
      .batch(
        groupOrders.map((item) =>
          this.db
            .prepare('UPDATE groups SET order_num = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .bind(item.order_num, item.id)
        )
      )
      .then(() => true)
      .catch(() => false);
  }

  async updateSiteOrder(siteOrders: { id: number; order_num: number }[]): Promise<boolean> {
    // 使用事务确保所有更新一起成功或失败
    return await this.db
      .batch(
        siteOrders.map((item) =>
          this.db
            .prepare('UPDATE sites SET order_num = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .bind(item.order_num, item.id)
        )
      )
      .then(() => true)
      .catch(() => false);
  }

  // 导出所有数据
  async exportData(): Promise<ExportData> {
    // 获取所有分组
    const groups = await this.getGroups();

    // 获取所有站点
    const sites = await this.getSites();

    // 获取所有配置
    const configs = await this.getConfigs();

    return {
      groups,
      sites,
      configs,
      version: '1.0', // 数据版本号，便于后续兼容性处理
      exportDate: new Date().toISOString(),
    };
  }

  // 导入所有数据
  async importData(data: ExportData): Promise<ImportResult> {
    try {
      // 创建新旧分组ID的映射
      const groupMap = new Map<number, number>();

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

      // 导入分组数据
      for (const group of data.groups) {
        // 检查是否已存在同名分组
        const existingGroup = await this.getGroupByName(group.name);

        if (existingGroup) {
          // 如果存在同名分组，使用现有分组ID
          if (group.id) {
            groupMap.set(group.id, existingGroup.id as number);
          }

          // 可选：更新分组顺序（如果需要）
          // 此处可以决定是否需要更新现有分组的order_num
          // 如果需要，可以执行：
          // await this.updateGroup(existingGroup.id as number, { order_num: group.order_num });

          stats.groups.merged++;
        } else {
          // 如果不存在同名分组，创建新分组
          const newGroup = await this.createGroup({
            name: group.name,
            order_num: group.order_num,
          });

          // 添加到映射
          if (group.id && newGroup.id) {
            groupMap.set(group.id, newGroup.id);
          }

          stats.groups.created++;
        }
      }

      // 导入站点数据，更新分组ID
      for (const site of data.sites) {
        // 获取新的分组ID
        const newGroupId = groupMap.get(site.group_id);

        // 如果没有映射到新ID（可能是因为分组被过滤掉），则跳过该站点
        if (!newGroupId) {
          console.warn(`无法为站点"${site.name}"找到对应的分组ID，已跳过`);
          stats.sites.skipped++;
          continue;
        }

        // 检查该分组下是否已存在相同URL的站点
        const existingSite = await this.getSiteByGroupIdAndUrl(newGroupId, site.url);

        if (existingSite) {
          // 如果存在相同URL的站点，可以选择更新或跳过
          // 这里选择更新站点信息（名称、图标、描述等）
          await this.updateSite(existingSite.id as number, {
            name: site.name,
            icon: site.icon,
            description: site.description,
            notes: site.notes,
            // 不更新order_num以保持现有排序
          });

          stats.sites.updated++;
        } else {
          // 如果不存在相同URL的站点，创建新站点
          await this.createSite({
            ...site,
            id: undefined, // 不使用旧ID
            group_id: newGroupId,
          });

          stats.sites.created++;
        }
      }

      // 导入配置数据
      for (const [key, value] of Object.entries(data.configs)) {
        if (key !== 'DB_INITIALIZED') {
          // 跳过数据库初始化标志
          await this.setConfig(key, value);
        }
      }

      return {
        success: true,
        stats,
      };
    } catch (error) {
      console.error('导入数据失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  // 根据名称查询分组
  async getGroupByName(name: string): Promise<Group | null> {
    const result = await this.db
      .prepare('SELECT id, name, order_num, created_at, updated_at FROM groups WHERE name = ?')
      .bind(name)
      .first<Group>();
    return result;
  }

  // 查询特定分组下是否已存在指定URL的站点
  async getSiteByGroupIdAndUrl(groupId: number, url: string): Promise<Site | null> {
    const result = await this.db
      .prepare(
        'SELECT id, group_id, name, url, icon, description, notes, order_num, created_at, updated_at FROM sites WHERE group_id = ? AND url = ?'
      )
      .bind(groupId, url)
      .first<Site>();
    return result;
  }
}

// 创建 API 辅助函数
export function createAPI(env: Env): NavigationAPI {
  return new NavigationAPI(env);
}
