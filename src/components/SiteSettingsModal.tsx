// src/components/SiteSettingsModal.tsx
import { useState } from 'react';
import { Site, Group } from '../API/http';
// Material UI 导入
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  IconButton,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Divider,
  Avatar,
  useTheme,
  SelectChangeEvent,
  InputAdornment,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';

interface SiteSettingsModalProps {
  site: Site;
  onUpdate: (updatedSite: Site) => void;
  onDelete: (siteId: number) => void;
  onClose: () => void;
  groups?: Group[]; // 可选的分组列表
  iconApi?: string; // 图标API配置
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
  } catch (e) {
    // 尝试备用方法
    const match = url.match(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/im);
    return match && match[1] ? match[1] : url;
  }
}

export default function SiteSettingsModal({
  site,
  onUpdate,
  onDelete,
  onClose,
  groups = [],
  iconApi = 'https://www.faviconextractor.com/favicon/{domain}?larger=true',
}: SiteSettingsModalProps) {
  const theme = useTheme();

  // 存储字符串形式的group_id，与Material-UI的Select兼容
  const [formData, setFormData] = useState({
    name: site.name,
    url: site.url,
    icon: site.icon || '',
    description: site.description || '',
    notes: site.notes || '',
    group_id: String(site.group_id),
  });

  // 用于预览图标
  const [iconPreview, setIconPreview] = useState<string | null>(site.icon || null);

  // 处理表单字段变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 处理下拉列表变化
  const handleSelectChange = (e: SelectChangeEvent) => {
    setFormData((prev) => ({
      ...prev,
      group_id: e.target.value,
    }));
  };

  // 处理图标上传或URL输入
  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setFormData((prev) => ({ ...prev, icon: value }));

    // 检查URL是否是有效的图片URL
    const isValidImageUrl = (url: string): boolean => {
      // 检查URL格式
      try {
        new URL(url);
        // 检查是否是常见图片格式
        return (
          /\.(jpeg|jpg|gif|png|svg|webp|ico)(\?.*)?$/i.test(url) ||
          /^https?:\/\/.*\/favicon\.(ico|png)(\?.*)?$/i.test(url) ||
          /^data:image\//i.test(url)
        );
      } catch {
        return false;
      }
    };

    // 仅当输入看起来像有效的图片URL时才设置预览
    if (value && isValidImageUrl(value)) {
      setIconPreview(value);
    } else {
      setIconPreview(null);
    }
  };

  // 处理图标加载错误
  const handleIconError = () => {
    setIconPreview(null);
  };

  // 提交表单
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 更新网站信息，将group_id转为数字
    onUpdate({
      ...site,
      ...formData,
      group_id: Number(formData.group_id),
    });

    onClose();
  };

  // 确认删除
  const confirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('确定要删除这个网站吗？此操作不可恢复。')) {
      onDelete(site.id!);
      onClose();
    }
  };

  // 计算首字母图标
  const fallbackIcon = formData.name?.charAt(0).toUpperCase() || 'A';

  return (
    <Dialog
      open={true}
      onClose={onClose}
      fullWidth
      maxWidth='sm'
      PaperProps={{
        sx: {
          borderRadius: 2,
          backgroundColor: theme.palette.background.paper,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 2,
          pb: 1.5,
        }}
      >
        <Typography variant='h6' component='div' fontWeight='600'>
          网站设置
        </Typography>
        <IconButton edge='end' color='inherit' onClick={onClose} aria-label='关闭' size='small'>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2.5}>
            {/* 网站名称 */}
            <TextField
              id='name'
              name='name'
              label='网站名称'
              required
              fullWidth
              value={formData.name || ''}
              onChange={handleChange}
              placeholder='输入网站名称'
              variant='outlined'
              size='small'
            />

            {/* 网站链接 */}
            <TextField
              id='url'
              name='url'
              label='网站链接'
              required
              fullWidth
              value={formData.url || ''}
              onChange={handleChange}
              placeholder='https://example.com'
              variant='outlined'
              size='small'
              type='url'
            />

            {/* 网站图标 */}
            <Box>
              <Typography variant='body2' color='text.secondary' gutterBottom>
                图标 URL
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                {iconPreview ? (
                  <Avatar
                    src={iconPreview}
                    alt={formData.name || 'Icon Preview'}
                    sx={{ width: 40, height: 40, borderRadius: 1.5 }}
                    imgProps={{
                      onError: handleIconError,
                      style: { objectFit: 'cover' },
                    }}
                    variant='rounded'
                  />
                ) : (
                  <Avatar
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 1.5,
                      bgcolor: 'primary.light',
                      color: 'primary.main',
                      border: '1px solid',
                      borderColor: 'primary.main',
                    }}
                    variant='rounded'
                  >
                    {fallbackIcon}
                  </Avatar>
                )}

                <TextField
                  id='icon'
                  name='icon'
                  fullWidth
                  value={formData.icon || ''}
                  onChange={handleIconChange}
                  placeholder='https://example.com/icon.png'
                  variant='outlined'
                  size='small'
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position='end'>
                        <IconButton
                          onClick={() => {
                            if (!formData.url) {
                              // handleError("请先输入站点URL");
                              return;
                            }
                            const domain = extractDomain(formData.url);
                            if (domain) {
                              const actualIconApi =
                                iconApi ||
                                'https://www.faviconextractor.com/favicon/{domain}?larger=true';
                              const iconUrl = actualIconApi.replace('{domain}', domain);
                              setFormData((prev) => ({
                                ...prev,
                                icon: iconUrl,
                              }));
                              setIconPreview(iconUrl);
                            } else {
                              // handleError("无法从URL中获取域名");
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
              </Box>
            </Box>

            {/* 分组选择 */}
            {groups.length > 0 && (
              <FormControl fullWidth size='small'>
                <InputLabel id='group-select-label'>所属分组</InputLabel>
                <Select
                  labelId='group-select-label'
                  id='group_id'
                  name='group_id'
                  value={formData.group_id}
                  label='所属分组'
                  onChange={handleSelectChange}
                >
                  {groups.map((group) => (
                    <MenuItem key={group.id} value={String(group.id)}>
                      {group.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* 网站描述 */}
            <TextField
              id='description'
              name='description'
              label='网站描述'
              multiline
              rows={2}
              fullWidth
              value={formData.description || ''}
              onChange={handleChange}
              placeholder='简短的网站描述'
              variant='outlined'
              size='small'
            />

            {/* 备注 */}
            <TextField
              id='notes'
              name='notes'
              label='备注'
              multiline
              rows={3}
              fullWidth
              value={formData.notes || ''}
              onChange={handleChange}
              placeholder='可选的私人备注'
              variant='outlined'
              size='small'
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, pt: 1, justifyContent: 'space-between' }}>
          <Button
            onClick={confirmDelete}
            color='error'
            variant='contained'
            startIcon={<DeleteIcon />}
          >
            删除
          </Button>

          <Box>
            <Button
              onClick={onClose}
              color='inherit'
              variant='outlined'
              sx={{ mr: 1.5 }}
              startIcon={<CancelIcon />}
            >
              取消
            </Button>
            <Button type='submit' color='primary' variant='contained' startIcon={<SaveIcon />}>
              保存
            </Button>
          </Box>
        </DialogActions>
      </form>
    </Dialog>
  );
}
