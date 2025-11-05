import { Group, Site } from './API/http';

// 确保GroupWithSites的id字段必定存在
export interface GroupWithSites extends Omit<Group, 'id'> {
  id: number; // 确保id始终存在
  sites: Site[];
}
