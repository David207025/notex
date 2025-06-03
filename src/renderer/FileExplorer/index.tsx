import React, { useEffect, useRef, useState } from 'react';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  TextField,
  Box,
  Collapse,
  Dialog,
  DialogTitle,
  DialogActions,
  Button,
  Menu,
  MenuItem,
  IconButton,
  ClickAwayListener,
  Typography,
} from '@mui/material';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import FolderIcon from '@mui/icons-material/Folder';
import DescriptionIcon from '@mui/icons-material/Description';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CloseIcon from '@mui/icons-material/Close';

interface FileTreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileTreeNode[];
}

interface FileExplorerProps {
  rootPath: string;
  openedFile: string;
  onOpenFile: (filePath: string) => void;
  onCloseFile: (filePath: string) => void;
}

export default function FileExplorer({
  rootPath,
  openedFile,
  onOpenFile,
  onCloseFile,
}: FileExplorerProps) {
  const [tree, setTree] = useState<FileTreeNode | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(),
  );
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  const [creatingType, setCreatingType] = useState<'file' | 'folder' | null>(
    null,
  );
  const [creatingValue, setCreatingValue] = useState<string>('');
  const [creatingInPath, setCreatingInPath] = useState<string | null>(null);
  const createInputRef = useRef<HTMLInputElement>(null);

  const [deletePath, setDeletePath] = useState<string | null>(null);

  // Context menu
  const [contextMenuAnchor, setContextMenuAnchor] =
    useState<null | HTMLElement>(null);
  const [contextMenuPath, setContextMenuPath] = useState<string | null>(null);
  const [movingPath, setMovingPath] = useState<string | null>(null);
  const [rootMenuAnchor, setRootMenuAnchor] = useState<null | HTMLElement>(
    null,
  );

  async function performMove(targetFolderPath: string) {
    if (!movingPath) return;
    const name = movingPath.split('/').pop();
    if (!name) return;

    onOpenFile('');

    const normalizedSource = movingPath.replace(/\/$/, '');
    const normalizedTarget = targetFolderPath.replace(/\/$/, '');

    const isDirectSubfolder =
      normalizedTarget.startsWith(normalizedSource + '/') &&
      normalizedTarget.slice(normalizedSource.length + 1).split('/').length ===
        1;

    if (normalizedSource === normalizedTarget || isDirectSubfolder) {
      alert('Cannot move a folder into itself or its direct subfolder');
      setMovingPath(null);
      return;
    }

    const newPath = normalizedTarget + '/' + name;
    try {
      await window.electron.renamePath(normalizedSource, newPath);
      const updatedTree = await window.electron.getFolderTree(rootPath);
      setTree(updatedTree);
      setExpandedFolders((prev) => new Set(prev).add(normalizedTarget));
    } catch (err) {
      console.error('Move failed', err);
    }

    setMovingPath(null);
    handleCloseContextMenu();
  }

  // Handler for click away:
  function handleClickAway() {
    if (creatingType) {
      console.log(creatingValue);
      if (creatingValue.trim() !== '') {
        finishCreating();
      }
      cancelCreating();
    }
  }

  // Load the entire folder tree once from IPC on mount or rootPath change
  useEffect(() => {
    async function loadTree() {
      try {
        const folderTree: FileTreeNode =
          await window.electron.getFolderTree(rootPath);
        setTree(folderTree);
        setExpandedFolders(new Set()); // collapsed initially
        setRenamingPath(null);
        setCreatingType(null);
      } catch (e) {
        console.error('Failed to load folder tree', e);
      }
    }
    loadTree();
  }, [rootPath]);

  function handleRootMenuOpen(event: React.MouseEvent<HTMLElement>) {
    setRootMenuAnchor(event.currentTarget);
    setContextMenuPath(rootPath); // Set contextMenuPath to root
  }

  function handleRootMenuClose() {
    setRootMenuAnchor(null);
    setContextMenuPath(null);
  }

  // Helper: toggle expanded folder
  function toggleFolder(path: string) {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(path)) newSet.delete(path);
      else newSet.add(path);
      return newSet;
    });
  }

  function renderRootMenu() {
    if (!contextMenuPath) return null;

    return (
      <Menu
        open={Boolean(rootMenuAnchor)}
        anchorEl={rootMenuAnchor}
        onClose={handleRootMenuClose}
      >
        {!movingPath && (
          <>
            <MenuItem
              onClick={() => {
                handleCreate('file');
                handleRootMenuClose();
              }}
            >
              <NoteAddIcon sx={{ mr: 1 }} />
              New File
            </MenuItem>
            <MenuItem
              onClick={() => {
                handleCreate('folder');
                handleRootMenuClose();
              }}
            >
              <CreateNewFolderIcon sx={{ mr: 1 }} />
              New Folder
            </MenuItem>
          </>
        )}

        {movingPath && (
          <>
            <MenuItem
              onClick={() => {
                performMove(rootPath);
                handleRootMenuClose();
              }}
            >
              Move Here
            </MenuItem>
            <MenuItem
              onClick={() => {
                setMovingPath(null);
                handleRootMenuClose();
              }}
            >
              Cancel Move
            </MenuItem>
          </>
        )}
      </Menu>
    );
  }

  // Recursive render function
  function renderTree(node: FileTreeNode, level = 0): React.ReactNode {
    const isExpanded = expandedFolders.has(node.path);
    const isRenaming = node.path === renamingPath;
    const isCreatingHere = creatingType && creatingInPath === node.path;

    // Skip non-`.ltxnote` files
    if (!node.isDirectory && !node.name.toLowerCase().endsWith('.ltxnote')) {
      return null;
    }

    if (node.path.endsWith('math2'))
      console.log({
        nodePath: node.path,
        creatingInPath,
        isCreatingHere,
        creatingType,
      });

    return (
      <React.Fragment key={node.path}>
        <ListItem
          disablePadding
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('text/plain', node.path);
          }}
          onDragOver={(e) => {
            if (node.isDirectory) e.preventDefault();
          }}
          onDrop={async (e) => {
            e.preventDefault();
            const draggedPath = e.dataTransfer.getData('text/plain');
            if (!draggedPath || draggedPath === node.path) return;
            if (draggedPath.startsWith(node.path + '/')) return; // prevent dropping into own subfolder
            const name = draggedPath.split('/').pop();
            if (!name) return;
            const newPath = node.path + '/' + name;
            try {
              await window.electron.renamePath(draggedPath, newPath);
              const updatedTree = await window.electron.getFolderTree(rootPath);
              setTree(updatedTree);
              setExpandedFolders((prev) => new Set(prev).add(node.path));
            } catch (err) {
              console.error('Move failed', err);
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenuAnchor(e.currentTarget);
            setContextMenuPath(node.path);
          }}
        >
          <ListItemButton
            sx={{
              pl: 2 + level * 2,
              backgroundColor:
                node.path === openedFile
                  ? 'rgba(25, 118, 210, 0.15)' // Highlight color for opened file
                  : movingPath === node.path
                    ? 'rgba(25, 118, 210, 0.10)'
                    : 'inherit',
              borderRadius: 1,
              boxShadow:
                node.path === openedFile
                  ? 'inset 2px 0 0 #1976d2'
                  : movingPath === node.path
                    ? '0 0 8px rgba(25,118,210,0.3)'
                    : 'none',
              transition: 'background-color 0.2s ease',
            }}
            onClick={() => {
              if (node.isDirectory) toggleFolder(node.path);
            }}
            onDoubleClick={() => {
              requestAnimationFrame(() => {
                if (!node.isDirectory) onOpenFile(node.path);
              });
            }}
          >
            {node.isDirectory ? (
              isExpanded ? (
                <ExpandLessIcon />
              ) : (
                <ExpandMoreIcon />
              )
            ) : (
              <Box sx={{ width: 24 }} />
            )}

            {node.isDirectory ? (
              <FolderIcon sx={{ ml: 1, mr: 1 }} />
            ) : (
              <DescriptionIcon sx={{ ml: 1, mr: 1 }} />
            )}

            {isRenaming ? (
              <TextField
                variant="standard"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={finishRenaming}
                onKeyDown={onRenameKeyDown}
                inputRef={renameInputRef}
                sx={{ flexGrow: 1 }}
              />
            ) : (
              <ListItemText
                disableTypography
                primary={
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        flexGrow: 1,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {node.name.toLowerCase().endsWith('.ltxnote')
                        ? node.name.slice(0, -8)
                        : node.name}
                    </Typography>
                    {node.path === openedFile && (
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={(e) => {
                          requestAnimationFrame(() => {
                            onCloseFile(node.path);
                          });
                        }}
                        sx={{ ml: 1 }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                }
              />
            )}
          </ListItemButton>
        </ListItem>

        {node.isDirectory && (
          <Collapse
            in={(isExpanded || isCreatingHere) as boolean}
            timeout="auto"
            unmountOnExit
          >
            <List disablePadding>
              {node.children?.map((child) => renderTree(child, level + 1))}

              {/* Show input field when creating in this folder */}
              {isCreatingHere && (
                <ClickAwayListener onClickAway={handleClickAway}>
                  <ListItem
                    disablePadding
                    sx={{
                      pl: 2 + (level + 1) * 2,
                      backgroundColor:
                        creatingInPath === node.path
                          ? 'rgba(25, 118, 210, 0.15)'
                          : 'inherit',
                      borderRadius: 1,
                      boxShadow: '0 0 8px rgba(25,118,210,0.3)',
                      transition: 'background-color 0.3s ease',
                    }}
                  >
                    <TextField
                      sx={{ ml: (level + 1) * 2 }}
                      variant="standard"
                      placeholder={`New ${creatingType}`}
                      value={creatingValue}
                      onChange={(e) => setCreatingValue(e.target.value)}
                      onKeyDown={onCreateKeyDown}
                      inputRef={createInputRef}
                      fullWidth
                      autoFocus
                    />
                  </ListItem>
                </ClickAwayListener>
              )}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  }

  // Helpers for renaming, creating, deleting here (similar logic, but updating tree locally or reloading tree from IPC)

  function getParentPath(filePath: string) {
    const parts = filePath.split('/');
    parts.pop();
    return parts.join('/') || rootPath;
  }

  function startRenaming(path: string, currentName: string) {
    if (path === openedFile || openedFile.startsWith(path + '/')) {
      alert('Close the file or any of its children before renaming.');
      handleCloseContextMenu();
      return;
    }
    setRenamingPath(path);
    setRenameValue(
      currentName.toLowerCase().endsWith('.ltxnote')
        ? currentName.slice(0, -8)
        : currentName,
    );
    handleCloseContextMenu();
  }

  async function finishRenaming() {
    if (!renamingPath) return;
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenamingPath(null);
      setRenameValue('');
      return;
    }

    const ext = renamingPath.toLowerCase().endsWith('.ltxnote')
      ? '.ltxnote'
      : '';
    try {
      await window.electron.renamePath(renamingPath, trimmed + ext);
      // reload tree after rename
      const updatedTree = await window.electron.getFolderTree(rootPath);
      setTree(updatedTree);
    } catch (e) {
      console.error('Rename failed', e);
    }
    setRenamingPath(null);
    setRenameValue('');
  }

  function onRenameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') finishRenaming();
    else if (e.key === 'Escape') {
      setRenamingPath(null);
      setRenameValue('');
    }
  }

  async function finishCreating() {
    const trimmed = creatingValue.trim();
    if (!trimmed || !creatingInPath) {
      setTimeout(cancelCreating, 100);
      return;
    }

    const currentNode = tree && findNodeByPath(tree, creatingInPath);
    if (!currentNode || !currentNode.children) return;

    const existingNames = new Set(
      currentNode.children.map((child) => child.name.toLowerCase()),
    );
    const targetName =
      creatingType === 'file'
        ? trimmed.toLowerCase().endsWith('.ltxnote')
          ? trimmed
          : trimmed + '.ltxnote'
        : trimmed;

    if (existingNames.has(targetName.toLowerCase())) {
      alert(`A ${creatingType} named "${targetName}" already exists.`);
      return;
    }

    const invalidCharacters = /[<>:"/\\|?*]/;
    if (invalidCharacters.test(trimmed)) {
      alert('Name contains invalid characters.');
      return;
    }

    try {
      if (creatingType === 'folder') {
        await window.electron.createFolder(creatingInPath, trimmed);
      } else if (creatingType === 'file') {
        await window.electron.createFile(creatingInPath, targetName);
      }
      const updatedTree = await window.electron.getFolderTree(rootPath);
      setTree(updatedTree);
      setExpandedFolders((prev) => new Set(prev).add(creatingInPath));
    } catch (e) {
      console.error('Create failed', e);
    }

    setTimeout(cancelCreating, 100);
  }

  function cancelCreating() {
    setCreatingType(null);
    setCreatingValue('');
    setCreatingInPath(null);
  }

  function onCreateKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') finishCreating();
    else if (e.key === 'Escape') cancelCreating();
  }

  async function confirmDelete() {
    if (!deletePath) return;

    const isTryingToDeleteOpenFile =
      openedFile === deletePath || openedFile.startsWith(deletePath + '/');
    if (isTryingToDeleteOpenFile) {
      alert('Close the file or any of its children before deleting.');
      setDeletePath(null);
      return;
    }

    try {
      await window.electron.deletePath(deletePath);
      const updatedTree = await window.electron.getFolderTree(rootPath);
      setTree(updatedTree);
    } catch (e) {
      console.error('Delete failed', e);
    }

    setDeletePath(null);
  }

  function handleCloseContextMenu() {
    setContextMenuAnchor(null);
    setContextMenuPath(null);
  }

  function handleCreate(type: 'file' | 'folder') {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      newSet.add(contextMenuPath as string);
      return newSet;
    });
    setCreatingType(type);
    setCreatingValue('');
    setCreatingInPath(contextMenuPath);
    handleCloseContextMenu();
  }

  function handleRename() {
    if (!contextMenuPath) return;
    // Find node by path to get current name
    if (!tree) return;
    const node = findNodeByPath(tree, contextMenuPath);
    if (node) startRenaming(node.path, node.name);
    handleCloseContextMenu();
  }

  function handleDelete() {
    if (!contextMenuPath) return;
    setDeletePath(contextMenuPath);
    handleCloseContextMenu();
  }

  // Helper to find node by path in tree
  function findNodeByPath(
    node: FileTreeNode,
    path: string,
  ): FileTreeNode | null {
    if (node.path === path) return node;
    if (node.isDirectory && node.children) {
      for (const child of node.children) {
        const found = findNodeByPath(child, path);
        if (found) return found;
      }
    }
    return null;
  }

  // Autofocus inputs when they appear
  useEffect(() => {
    if (renamingPath && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingPath]);

  useEffect(() => {
    if (creatingType && createInputRef.current) {
      createInputRef.current.focus();
    }
  }, [creatingType]);

  function renderContextMenu() {
    if (!contextMenuPath) return null;

    const isFolder = (() => {
      if (!tree) return false;
      const node = findNodeByPath(tree, contextMenuPath);
      return node?.isDirectory ?? false;
    })();

    return (
      <Menu
        open={Boolean(contextMenuAnchor)}
        anchorEl={contextMenuAnchor}
        onClose={handleCloseContextMenu}
      >
        {!movingPath && (
          <div>
            <MenuItem
              onClick={() => {
                handleCreate('file');
              }}
            >
              <NoteAddIcon sx={{ mr: 1 }} />
              New File
            </MenuItem>
            <MenuItem
              onClick={() => {
                handleCreate('folder');
              }}
            >
              <CreateNewFolderIcon sx={{ mr: 1 }} />
              New Folder
            </MenuItem>
            <MenuItem onClick={handleRename}>Rename</MenuItem>
            <MenuItem onClick={handleDelete}>Delete</MenuItem>
            <MenuItem
              onClick={() => {
                setMovingPath(contextMenuPath);
                handleCloseContextMenu();
              }}
            >
              Move
            </MenuItem>
          </div>
        )}

        {movingPath && isFolder && (
          <MenuItem onClick={() => performMove(contextMenuPath!)}>
            Move Here
          </MenuItem>
        )}

        {movingPath && (
          <MenuItem
            onClick={() => {
              setMovingPath(null);
              handleCloseContextMenu();
            }}
          >
            Cancel Move
          </MenuItem>
        )}
      </Menu>
    );
  }

  if (!tree) return <div>Loading...</div>;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, pl: 2, mt: 2 }}>
        <FolderIcon sx={{ mr: 1 }} />
        <Box sx={{ flexGrow: 1, fontWeight: 'bold' }}>Notex</Box>
        <IconButton
          size="small"
          onClick={handleRootMenuOpen}
          aria-label="root directory menu"
        >
          <MoreVertIcon />
        </IconButton>
      </Box>

      {/* Root level creation buttons with similar highlight when active */}
      {creatingInPath === rootPath && (
        <ClickAwayListener onClickAway={handleClickAway}>
          <ListItem
            disablePadding
            sx={{
              backgroundColor: 'rgba(25, 118, 210, 0.15)',
              borderRadius: 1,
              boxShadow: '0 0 8px rgba(25,118,210,0.3)',
              transition: 'background-color 0.3s ease',
              pl: 2,
              mb: 1,
            }}
          >
            <TextField
              variant="standard"
              placeholder={`New ${creatingType}`}
              value={creatingValue}
              onChange={(e) => setCreatingValue(e.target.value)}
              onKeyDown={onCreateKeyDown}
              inputRef={createInputRef}
              fullWidth
              autoFocus
            />
          </ListItem>
        </ClickAwayListener>
      )}

      <List>{tree.children?.map((child) => renderTree(child))}</List>

      {renderRootMenu()}
      {renderContextMenu()}

      <Dialog open={Boolean(deletePath)} onClose={() => setDeletePath(null)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <Box sx={{ p: 2 }}>
          Are you sure you want to delete{' '}
          <strong>{deletePath?.split('assets/notes/')[1]}</strong>?
        </Box>
        <DialogActions>
          <Button onClick={() => setDeletePath(null)}>Cancel</Button>
          <Button color="error" onClick={confirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
