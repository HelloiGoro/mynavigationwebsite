import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import { Group } from '../API/http';

interface EditGroupDialogProps {
  open: boolean;
  group: Group | null;
  onClose: () => void;
  onSave: (group: Group) => void;
  onDelete: (groupId: number) => void;
}

const EditGroupDialog: React.FC<EditGroupDialogProps> = ({
  open,
  group,
  onClose,
  onSave,
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 当弹窗打开时，初始化名称
  React.useEffect(() => {
    if (group) {
      setName(group.name);
    }
    // 关闭删除确认状态
    setShowDeleteConfirm(false);
  }, [group, open]);

  const handleSave = () => {
    if (!group || !name.trim()) return;

    onSave({
      ...group,
      name: name.trim(),
    });
  };

  const handleDelete = () => {
    if (!group) return;

    if (!showDeleteConfirm) {
      // 显示删除确认
      setShowDeleteConfirm(true);
    } else {
      // 确认删除
      onDelete(group.id!);
    }
  };

  if (!group) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle>编辑分组</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2, mt: 1 }}>
          <TextField
            label='分组名称'
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            variant='outlined'
            autoFocus
          />
        </Box>

        {showDeleteConfirm && (
          <Alert severity='warning' sx={{ mt: 2 }}>
            <Typography variant='body2'>
              确定要删除分组 "{group.name}" 吗？
              <strong>删除此分组将同时删除该分组下的所有网站。</strong>
              此操作无法撤销。
            </Typography>
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        {!showDeleteConfirm ? (
          <>
            <Button onClick={onClose} color='inherit'>
              取消
            </Button>
            <Button onClick={handleDelete} color='error' variant='outlined'>
              删除
            </Button>
            <Button
              onClick={handleSave}
              color='primary'
              variant='contained'
              disabled={!name.trim()}
            >
              保存
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => setShowDeleteConfirm(false)} color='inherit'>
              取消
            </Button>
            <Button onClick={handleDelete} color='error' variant='contained'>
              确认删除
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default EditGroupDialog;
