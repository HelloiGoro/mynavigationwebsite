import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GroupWithSites } from '../types';
import { Paper, Typography, Box } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

interface SortableGroupItemProps {
  id: string;
  group: GroupWithSites;
}

export default function SortableGroupItem({ id, group }: SortableGroupItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
    zIndex: isDragging ? 9999 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      sx={{
        p: 3,
        borderRadius: 4,
        transition: isDragging ? 'none !important' : 'all 0.3s ease-in-out',
        border: '1px solid transparent',
        boxShadow: isDragging ? 8 : 2,
        cursor: 'grab',
        '&:active': { cursor: 'grabbing' },
        '&:hover': {
          borderColor: 'divider',
          boxShadow: 6,
        },
        ...(isDragging && {
          outline: '2px solid',
          outlineColor: 'primary.main',
          transform: 'none',
          '& *': {
            transition: 'none !important',
          },
        }),
      }}
      {...attributes}
      {...listeners}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          userSelect: 'none',
          transition: isDragging ? 'none' : 'inherit',
        }}
      >
        <DragIndicatorIcon
          sx={{
            mr: 2,
            color: 'primary.main',
            opacity: 0.7,
          }}
        />
        <Typography variant='h5' component='h2' fontWeight='600' color='text.primary'>
          {group.name}
        </Typography>
      </Box>
    </Paper>
  );
}
