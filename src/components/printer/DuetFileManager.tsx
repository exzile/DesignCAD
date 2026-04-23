import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import './DuetFileManager.css';
import {
  Upload,
  FolderPlus,
  RefreshCw,
  Trash2,
  ChevronRight,
  Loader2,
  X,
  Search,
} from 'lucide-react';
import { usePrinterStore } from '../../store/printerStore';
import type { DuetFileInfo } from '../../types/duet';
import DuetFileEditor from './DuetFileEditor';
import { addToQueue } from './jobStatus/printQueueUtils';
import { FileInfoPanel } from './duetFileManager/FileInfoPanel';
import { NewFolderDialog, RenameDialog } from './duetFileManager/dialogs';
import { FILE_TABS, isGCodeFile, sortFiles } from './duetFileManager/helpers';
import type { SortDir, SortField } from './duetFileManager/helpers';
import { FileTable } from './duetFileManager/FileTable';

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function DuetFileManager() {
  const currentDirectory = usePrinterStore((s) => s.currentDirectory);
  const files = usePrinterStore((s) => s.files);
  const selectedFile = usePrinterStore((s) => s.selectedFile);
  const uploading = usePrinterStore((s) => s.uploading);
  const uploadProgress = usePrinterStore((s) => s.uploadProgress);
  const service = usePrinterStore((s) => s.service);
  const connected = usePrinterStore((s) => s.connected);

  const navigateToDirectory = usePrinterStore((s) => s.navigateToDirectory);
  const refreshFiles = usePrinterStore((s) => s.refreshFiles);
  const uploadFile = usePrinterStore((s) => s.uploadFile);
  const deleteFile = usePrinterStore((s) => s.deleteFile);
  const selectFile = usePrinterStore((s) => s.selectFile);
  const startPrint = usePrinterStore((s) => s.startPrint);
  const setError = usePrinterStore((s) => s.setError);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Batch-select state
  const [checkedFiles, setCheckedFiles] = useState<Set<string>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);

  // Tab bar state
  const [activeFileTab, setActiveFileTab] = useState<string>('gcodes');

  // File editor state
  const [editingFilePath, setEditingFilePath] = useState<string | null>(null);

  // Dialogs
  const [renameTarget, setRenameTarget] = useState<DuetFileInfo | null>(null);
  const [showNewFolder, setShowNewFolder] = useState(false);

  // Filtered and sorted file list
  const sortedFiles = useMemo(() => {
    const filtered = searchQuery
      ? files.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : files;
    return sortFiles(filtered, sortField, sortDir);
  }, [files, sortField, sortDir, searchQuery]);

  // Current tab root directory
  const currentTabRoot = useMemo(
    () => FILE_TABS.find((t) => t.id === activeFileTab)?.directory ?? '0:/gcodes',
    [activeFileTab],
  );

  // Breadcrumb segments relative to the current tab root
  const breadcrumbs = useMemo(() => {
    const parts = currentDirectory.split('/').filter(Boolean);
    const rootParts = currentTabRoot.split('/').filter(Boolean);
    const crumbs: { label: string; path: string }[] = [];
    let acc = '';
    for (let i = 0; i < parts.length; i++) {
      acc = acc ? `${acc}/${parts[i]}` : parts[i];
      // Show the root as the tab label, skip intermediate root parts
      if (i < rootParts.length - 1) continue;
      if (i === rootParts.length - 1) {
        const tab = FILE_TABS.find((t) => t.id === activeFileTab);
        crumbs.push({ label: tab?.label ?? parts[i], path: acc });
      } else {
        crumbs.push({ label: parts[i], path: acc });
      }
    }
    return crumbs;
  }, [currentDirectory, currentTabRoot, activeFileTab]);

  // Refresh on mount
  useEffect(() => {
    if (connected && service) {
      setLoading(true);
      refreshFiles().finally(() => setLoading(false));
    }
  }, [connected, service]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sort toggling
  const handleSort = useCallback(
    (field: SortField) => {
      if (field === sortField) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDir('asc');
      }
    },
    [sortField],
  );

  // Navigation
  const handleNavigate = useCallback(
    async (dir: string) => {
      setLoading(true);
      setSelectedName(null);
      try {
        await navigateToDirectory(dir);
      } finally {
        setLoading(false);
      }
    },
    [navigateToDirectory],
  );

  // Tab switching
  const handleTabSwitch = useCallback(
    async (tabId: string) => {
      const tab = FILE_TABS.find((t) => t.id === tabId);
      if (!tab) return;
      setActiveFileTab(tabId);
      setSelectedName(null);
      setLoading(true);
      try {
        await navigateToDirectory(tab.directory);
      } finally {
        setLoading(false);
      }
    },
    [navigateToDirectory],
  );

  // Open file in editor
  const handleEditFile = useCallback(
    (item: DuetFileInfo) => {
      setEditingFilePath(`${currentDirectory}/${item.name}`);
    },
    [currentDirectory],
  );

  // Click on a row
  const handleRowClick = useCallback(
    async (item: DuetFileInfo) => {
      if (item.type === 'd') {
        handleNavigate(`${currentDirectory}/${item.name}`);
      } else {
        setSelectedName(item.name);
        if (isGCodeFile(item.name)) {
          await selectFile(`${currentDirectory}/${item.name}`);
        }
      }
    },
    [currentDirectory, handleNavigate, selectFile],
  );

  // Upload via file picker
  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = e.target.files;
      if (!fileList) return;
      for (let i = 0; i < fileList.length; i++) {
        await uploadFile(fileList[i]);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [uploadFile],
  );

  // Drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      const droppedFiles = e.dataTransfer.files;
      if (!droppedFiles || droppedFiles.length === 0) return;
      for (let i = 0; i < droppedFiles.length; i++) {
        await uploadFile(droppedFiles[i]);
      }
    },
    [uploadFile],
  );

  // Refresh
  const handleRefresh = useCallback(async () => {
    setLoading(true);
    try {
      await refreshFiles();
    } finally {
      setLoading(false);
    }
  }, [refreshFiles]);

  // New folder
  const handleNewFolder = useCallback(
    async (name: string) => {
      if (!service) return;
      setShowNewFolder(false);
      try {
        await service.createDirectory(`${currentDirectory}/${name}`);
        await refreshFiles();
      } catch (err) {
        setError(`Failed to create folder: ${(err as Error).message}`);
      }
    },
    [service, currentDirectory, refreshFiles, setError],
  );

  // Rename
  const handleRename = useCallback(
    async (newName: string) => {
      if (!service || !renameTarget) return;
      const oldPath = `${currentDirectory}/${renameTarget.name}`;
      const newPath = `${currentDirectory}/${newName}`;
      setRenameTarget(null);
      try {
        await service.moveFile(oldPath, newPath);
        await refreshFiles();
      } catch (err) {
        setError(`Rename failed: ${(err as Error).message}`);
      }
    },
    [service, renameTarget, currentDirectory, refreshFiles, setError],
  );

  // Delete
  const handleDelete = useCallback(
    async (item: DuetFileInfo) => {
      const path = `${currentDirectory}/${item.name}`;
      if (!confirm(`Delete "${item.name}"?`)) return;
      try {
        await deleteFile(path);
        if (selectedName === item.name) {
          setSelectedName(null);
        }
      } catch (err) {
        setError(`Delete failed: ${(err as Error).message}`);
      }
    },
    [currentDirectory, deleteFile, selectedName, setError],
  );

  // Start print
  const handlePrint = useCallback(
    async (item: DuetFileInfo) => {
      await startPrint(`${currentDirectory}/${item.name}`);
    },
    [currentDirectory, startPrint],
  );

  // Queue for printing
  const handleQueue = useCallback(
    (item: DuetFileInfo) => {
      addToQueue(`${currentDirectory}/${item.name}`);
    },
    [currentDirectory],
  );

  // Simulate
  const handleSimulate = useCallback(
    async (item: DuetFileInfo) => {
      if (!service) return;
      try {
        await service.simulateFile(`${currentDirectory}/${item.name}`);
      } catch (err) {
        setError(`Simulate failed: ${(err as Error).message}`);
      }
    },
    [service, currentDirectory, setError],
  );

  // Download
  const handleDownload = useCallback(
    async (item: DuetFileInfo) => {
      if (!service) return;
      try {
        const blob = await service.downloadFile(`${currentDirectory}/${item.name}`);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = item.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        setError(`Download failed: ${(err as Error).message}`);
      }
    },
    [service, currentDirectory, setError],
  );

  // Toggle a single file's checked state
  const handleToggleCheck = useCallback((name: string) => {
    setCheckedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  // Select-all toggle (files only, not directories)
  const fileOnlyItems = useMemo(() => sortedFiles.filter((f) => f.type !== 'd'), [sortedFiles]);
  const allFilesChecked = fileOnlyItems.length > 0 && fileOnlyItems.every((f) => checkedFiles.has(f.name));

  const handleToggleAll = useCallback(() => {
    if (allFilesChecked) {
      setCheckedFiles(new Set());
    } else {
      setCheckedFiles(new Set(fileOnlyItems.map((f) => f.name)));
    }
  }, [allFilesChecked, fileOnlyItems]);

  // Batch delete all checked files sequentially
  const handleBatchDelete = useCallback(async () => {
    const names = Array.from(checkedFiles);
    if (names.length === 0) return;
    if (!confirm(`Delete ${names.length} selected file(s)?`)) return;
    setBatchDeleting(true);
    try {
      for (const name of names) {
        const path = `${currentDirectory}/${name}`;
        try {
          await deleteFile(path);
        } catch (err) {
          setError(`Delete failed for "${name}": ${(err as Error).message}`);
        }
      }
      setCheckedFiles(new Set());
      if (selectedName && names.includes(selectedName)) {
        setSelectedName(null);
      }
    } finally {
      setBatchDeleting(false);
    }
  }, [checkedFiles, currentDirectory, deleteFile, selectedName, setError]);

  // Clear checked files when navigating away or changing tabs
  useEffect(() => {
    setCheckedFiles(new Set());
  }, [currentDirectory, activeFileTab]);

  return (
    <div className="duet-file-mgr">
      {/* Tab bar */}
      <div className="duet-file-mgr__tab-bar">
        {FILE_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`duet-file-mgr__tab${activeFileTab === tab.id ? ' is-active' : ''}`}
            onClick={() => handleTabSwitch(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* System files warning */}
      {activeFileTab === 'sys' && (
        <div className="duet-file-mgr__warning-banner">
          <span className="duet-file-mgr__warning-icon">&#9888;</span>
          Editing system files can affect printer behavior. Be careful.
        </div>
      )}

      {/* Breadcrumbs */}
      <div className="duet-file-mgr__breadcrumbs">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.path} className="duet-file-mgr__breadcrumb-wrap">
            {i > 0 && (
              <span className="duet-file-mgr__breadcrumb-sep">
                <ChevronRight size={12} />
              </span>
            )}
            <button
              className={`duet-file-mgr__breadcrumb-item${i === breadcrumbs.length - 1 ? ' is-current' : ''}`}
              onClick={() => handleNavigate(crumb.path)}
            >
              {crumb.label}
            </button>
          </span>
        ))}
      </div>

      {/* Toolbar */}
      <div className="duet-file-mgr__toolbar">
        <button
          className="duet-file-mgr__toolbar-btn"
          onClick={handleUploadClick}
          disabled={uploading}
          title="Upload file"
        >
          <Upload size={14} />
          Upload
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={activeFileTab === 'gcodes' ? '.gcode,.g,.nc' : '.g,.gcode,.cfg,.csv,.json,.nc,.bin'}
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        <button
          className="duet-file-mgr__toolbar-btn"
          onClick={() => setShowNewFolder(true)}
          title="New folder"
        >
          <FolderPlus size={14} />
          New Folder
        </button>

        <button
          className="duet-file-mgr__toolbar-btn"
          onClick={handleRefresh}
          disabled={loading}
          title="Refresh"
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          Refresh
        </button>

        {uploading && (
          <div className="duet-file-mgr__progress-container">
            <div className="duet-file-mgr__progress-bar">
              <div className="duet-file-mgr__progress-fill" style={{ width: `${uploadProgress}%` }} />
            </div>
            <span className="duet-file-mgr__progress-text">{uploadProgress}%</span>
          </div>
        )}

        {checkedFiles.size > 0 && (
          <button
            className="duet-file-mgr__toolbar-btn duet-file-mgr__toolbar-btn--danger"
            onClick={handleBatchDelete}
            disabled={batchDeleting}
            title="Delete all selected files"
          >
            {batchDeleting ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
            Delete Selected ({checkedFiles.size})
          </button>
        )}
      </div>

      {/* Search / filter bar */}
      <div className="duet-file-mgr__search-bar">
        <Search size={14} className="duet-file-mgr__search-icon" />
        <input
          className="duet-file-mgr__search-input"
          type="text"
          placeholder="Filter files by name…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            className="duet-file-mgr__search-clear"
            onClick={() => setSearchQuery('')}
            title="Clear filter"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Body: file list + optional info panel */}
      <div className="duet-file-mgr__body">
        {/* File list with drag and drop */}
        <div
          className="duet-file-mgr__file-list"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {dragOver && (
            <div className="duet-file-mgr__drop-overlay">
              <Upload size={32} className="duet-file-mgr__drop-icon" />
              Drop files to upload
            </div>
          )}

          {loading ? (
            <div className="duet-file-mgr__loading">
              <Loader2 size={18} className="spin" />
              Loading...
            </div>
          ) : sortedFiles.length === 0 ? (
            <div className="duet-file-mgr__empty">
              {searchQuery ? `No files matching "${searchQuery}"` : 'This folder is empty'}
            </div>
          ) : (
            <FileTable
              allFilesChecked={allFilesChecked}
              checkedFiles={checkedFiles}
              currentDirectory={currentDirectory}
              selectedName={selectedName}
              sortField={sortField}
              sortDir={sortDir}
              sortedFiles={sortedFiles}
              onSort={handleSort}
              onToggleAll={handleToggleAll}
              onToggleCheck={handleToggleCheck}
              onRowClick={handleRowClick}
              onPrint={handlePrint}
              onQueue={handleQueue}
              onSimulate={handleSimulate}
              onEdit={handleEditFile}
              onDownload={handleDownload}
              onRename={setRenameTarget}
              onDelete={handleDelete}
            />
          )}
        </div>

        {/* Info panel for selected gcode file */}
        {selectedFile && (
          <FileInfoPanel
            fileInfo={selectedFile}
            onClose={() => {
              setSelectedName(null);
              usePrinterStore.setState({ selectedFile: null });
            }}
          />
        )}
      </div>

      {/* Dialogs */}
      {renameTarget && (
        <RenameDialog
          currentName={renameTarget.name}
          onConfirm={handleRename}
          onCancel={() => setRenameTarget(null)}
        />
      )}
      {showNewFolder && (
        <NewFolderDialog
          onConfirm={handleNewFolder}
          onCancel={() => setShowNewFolder(false)}
        />
      )}

      {/* File editor modal */}
      {editingFilePath && (
        <DuetFileEditor
          filePath={editingFilePath}
          onClose={() => {
            setEditingFilePath(null);
            // Refresh file list in case the file was saved
            handleRefresh();
          }}
        />
      )}
    </div>
  );
}
