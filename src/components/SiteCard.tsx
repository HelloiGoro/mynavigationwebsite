// src/components/SiteCard.tsx
import { useState, memo } from 'react';
import { Site } from '../API/http';
import SiteSettingsModal from './SiteSettingsModal';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
// 引入Material UI组件
import {
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Skeleton,
  IconButton,
  Box,
  Fade,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

interface SiteCardProps {
  site: Site;
  onUpdate: (updatedSite: Site) => void;
  onDelete: (siteId: number) => void;
  isEditMode?: boolean;
  index?: number;
  iconApi?: string; // 添加iconApi属性
}

// 使用memo包装组件以减少不必要的重渲染
const SiteCard = memo(function SiteCard({
  site,
  onUpdate,
  onDelete,
  isEditMode = false,
  index = 0,
  iconApi, // 添加iconApi参数
}: SiteCardProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [iconError, setIconError] = useState(!site.icon);
  const [imageLoaded, setImageLoaded] = useState(false);

  // 使用dnd-kit的useSortable hook
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `site-${site.id || index}`,
    disabled: !isEditMode,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 9999 : 'auto',
    opacity: isDragging ? 0.8 : 1,
    position: 'relative' as const,
  };

  // 如果没有图标，使用首字母作为图标
  const fallbackIcon = site.name.charAt(0).toUpperCase();

  // 处理设置按钮点击
  const handleSettingsClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止卡片点击事件
    e.preventDefault(); // 防止默认行为
    setShowSettings(true);
  };

  // 处理关闭设置
  const handleCloseSettings = () => {
    setShowSettings(false);
  };

  // 处理卡片点击
  const handleCardClick = () => {
    if (!isEditMode && site.url) {
      window.open(site.url, '_blank');
    }
  };

  // 处理图标加载错误
  const handleIconError = () => {
    setIconError(true);
  };

  // 处理图片加载完成
  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  // 卡片内容
  const cardContent = (
    <Box
      sx={{
        height: '100%',
        position: 'relative',
        transition: 'transform 0.3s ease-in-out',
        ...(!isEditMode && {
          '&:hover': {
            transform: 'translateY(-4px)',
          },
        }),
      }}
    >
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 3,
          transition: 'box-shadow 0.3s ease-in-out',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: isDragging ? 8 : 2,
          '&:hover': !isEditMode
            ? {
                boxShadow: 5,
              }
            : {},
          overflow: 'hidden',
          backgroundColor: (theme) =>
            theme.palette.mode === 'dark' ? 'rgba(33, 33, 33, 0.9)' : 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(5px)',
        }}
      >
        {isEditMode ? (
          <Box
            sx={{
              height: '100%',
              p: { xs: 1.5, sm: 2 },
              cursor: 'grab',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Box position='absolute' top={8} right={8}>
              <DragIndicatorIcon fontSize='small' color='primary' />
            </Box>
            {/* 图标和名称 */}
            <Box display='flex' alignItems='center' mb={1}>
              {!iconError && site.icon ? (
                <Box position='relative' mr={1.5} width={32} height={32} flexShrink={0}>
                  <Skeleton
                    variant='rounded'
                    width={32}
                    height={32}
                    sx={{
                      display: !imageLoaded ? 'block' : 'none',
                      position: 'absolute',
                    }}
                  />
                  <Fade in={imageLoaded} timeout={500}>
                    <Box
                      component='img'
                      src={site.icon}
                      alt={site.name}
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 1,
                        objectFit: 'cover',
                      }}
                      onError={handleIconError}
                      onLoad={handleImageLoad}
                    />
                  </Fade>
                </Box>
              ) : (
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    mr: 1.5,
                    borderRadius: 1,
                    bgcolor: 'primary.light',
                    color: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 1,
                    borderColor: 'primary.main',
                    opacity: 0.8,
                  }}
                >
                  {fallbackIcon}
                </Box>
              )}
              <Typography
                variant='subtitle1'
                fontWeight='medium'
                noWrap
                sx={{
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                }}
              >
                {site.name}
              </Typography>
            </Box>

            {/* 描述 */}
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                flexGrow: 1,
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
              }}
            >
              {site.description || '暂无描述'}
            </Typography>
          </Box>
        ) : (
          <CardActionArea onClick={handleCardClick} sx={{ height: '100%' }}>
            <CardContent
              sx={{
                position: 'relative',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                p: { xs: 1.5, sm: 2 },
                '&:last-child': { pb: { xs: 1.5, sm: 2 } },
              }}
            >
              {/* 图标和名称 */}
              <Box display='flex' alignItems='center' mb={1}>
                {!iconError && site.icon ? (
                  <Box position='relative' mr={1.5} width={32} height={32} flexShrink={0}>
                    <Skeleton
                      variant='rounded'
                      width={32}
                      height={32}
                      sx={{
                        display: !imageLoaded ? 'block' : 'none',
                        position: 'absolute',
                      }}
                    />
                    <Fade in={imageLoaded} timeout={500}>
                      <Box
                        component='img'
                        src={site.icon}
                        alt={site.name}
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: 1,
                          objectFit: 'cover',
                        }}
                        onError={handleIconError}
                        onLoad={handleImageLoad}
                      />
                    </Fade>
                  </Box>
                ) : (
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      mr: 1.5,
                      borderRadius: 1,
                      bgcolor: 'primary.light',
                      color: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: 1,
                      borderColor: 'primary.main',
                      opacity: 0.8,
                    }}
                  >
                    {fallbackIcon}
                  </Box>
                )}
                <Typography
                  variant='subtitle1'
                  fontWeight='medium'
                  noWrap
                  sx={{
                    fontSize: { xs: '0.875rem', sm: '1rem' },
                  }}
                >
                  {site.name}
                </Typography>
              </Box>

              {/* 描述 */}
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  flexGrow: 1,
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                }}
              >
                {site.description || '暂无描述'}
              </Typography>

              {/* 设置按钮 */}
              <IconButton
                size='small'
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  bgcolor: 'action.hover',
                  opacity: 0,
                  transition: 'opacity 0.2s',
                  '&:hover': {
                    bgcolor: 'action.selected',
                  },
                  '.MuiCardActionArea-root:hover &': {
                    opacity: 1,
                  },
                }}
                onClick={handleSettingsClick}
                aria-label='网站设置'
              >
                <SettingsIcon fontSize='small' />
              </IconButton>
            </CardContent>
          </CardActionArea>
        )}
      </Card>
    </Box>
  );

  if (isEditMode) {
    return (
      <>
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
          {cardContent}
        </div>

        {showSettings && (
          <SiteSettingsModal
            site={site}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onClose={handleCloseSettings}
            iconApi={iconApi} // 传递iconApi给SiteSettingsModal
          />
        )}
      </>
    );
  }

  return (
    <>
      {cardContent}

      {showSettings && (
        <SiteSettingsModal
          site={site}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onClose={handleCloseSettings}
          iconApi={iconApi} // 传递iconApi给SiteSettingsModal
        />
      )}
    </>
  );
});

export default SiteCard;
