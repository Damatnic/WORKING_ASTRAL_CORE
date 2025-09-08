'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderIcon,
  DocumentIcon,
  PhotoIcon,
  VideoCameraIcon,
  MusicalNoteIcon,
  ArchiveBoxIcon,
  CloudArrowUpIcon,
  CloudArrowDownIcon,
  ShareIcon,
  TrashIcon,
  PencilIcon,
  EyeIcon,
  LinkIcon,
  FolderPlusIcon,
  DocumentPlusIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  Bars3Icon,
  Squares2X2Icon,
  ChevronRightIcon,
  ChevronDownIcon,
  XMarkIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  UserGroupIcon,
  CalendarIcon,
  TagIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  ClipboardDocumentIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import {
  FolderIcon as FolderIconSolid,
  DocumentIcon as DocumentIconSolid,
  PhotoIcon as PhotoIconSolid,
  HeartIcon as HeartIconSolid
} from '@heroicons/react/24/solid';
import { formatDistance, format } from 'date-fns';

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  mimeType?: string;
  size?: number;
  path: string;
  parentId?: string;
  createdAt: Date;
  modifiedAt: Date;
  createdBy: string;
  modifiedBy: string;
  isShared: boolean;
  isEncrypted: boolean;
  isStarred: boolean;
  shareSettings?: {
    isPublic: boolean;
    allowDownload: boolean;
    allowEdit: boolean;
    expiresAt?: Date;
    sharedWith: Array<{
      userId: string;
      userName: string;
      role: string;
      permissions: ('view' | 'edit' | 'delete' | 'share')[];
    }>;
  };
  tags: string[];
  version: number;
  versions?: Array<{
    id: string;
    version: number;
    createdAt: Date;
    createdBy: string;
    comment: string;
    size: number;
  }>;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    pageCount?: number;
    uploadStatus: 'uploading' | 'completed' | 'failed' | 'processing';
    uploadProgress?: number;
    virusScan?: {
      status: 'pending' | 'clean' | 'infected' | 'failed';
      scannedAt?: Date;
    };
    thumbnailUrl?: string;
  };
  permissions: {
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canShare: boolean;
    canDownload: boolean;
  };
}

interface UploadTask {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'failed' | 'paused';
  error?: string;
}

const FileManager: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('/');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState<'name' | 'modified' | 'size' | 'type'>('modified');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'documents' | 'images' | 'videos' | 'audio' | 'folders'>('all');
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [shareModalFile, setShareModalFile] = useState<FileItem | null>(null);
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewFolderModal, setShowNewFolderModal] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);

  // Load files from API
  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const loadFiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (currentPath) queryParams.append('path', currentPath);
      if (sortBy) queryParams.append('sortBy', sortBy);
      if (sortOrder) queryParams.append('sortOrder', sortOrder);
      if (searchQuery.trim()) queryParams.append('search', searchQuery.trim());
      if (filterType !== 'all') queryParams.append('type', filterType);

      const response = await fetch(`/api/platform/files?${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch files');
      }
      
      const data = await response.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error('Failed to load files:', error);
      setError('Failed to load files. Please try again.');
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPath, sortBy, sortOrder, searchQuery, filterType]);

  const getFileIcon = (file: FileItem) => {
    if (file.type === 'folder') {
      return <FolderIconSolid className="w-8 h-8 text-blue-600" />;
    }

    const mimeType = file.mimeType || '';
    if (mimeType.startsWith('image/')) {
      return <PhotoIconSolid className="w-8 h-8 text-green-600" />;
    } else if (mimeType.startsWith('video/')) {
      return <VideoCameraIcon className="w-8 h-8 text-purple-600" />;
    } else if (mimeType.startsWith('audio/')) {
      return <MusicalNoteIcon className="w-8 h-8 text-pink-600" />;
    } else if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) {
      return <DocumentIconSolid className="w-8 h-8 text-red-600" />;
    } else if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('archive')) {
      return <ArchiveBoxIcon className="w-8 h-8 text-orange-600" />;
    } else {
      return <DocumentIcon className="w-8 h-8 text-gray-600" />;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const filteredFiles = files
    .filter(file => {
      if (filterType !== 'all') {
        if (filterType === 'folders' && file.type !== 'folder') return false;
        if (filterType === 'documents' && file.type === 'folder') return false;
        if (filterType === 'images' && !file.mimeType?.startsWith('image/')) return false;
        if (filterType === 'videos' && !file.mimeType?.startsWith('video/')) return false;
        if (filterType === 'audio' && !file.mimeType?.startsWith('audio/')) return false;
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return file.name.toLowerCase().includes(query) ||
               file.tags.some(tag => tag.toLowerCase().includes(query));
      }

      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'modified':
          comparison = a.modifiedAt.getTime() - b.modifiedAt.getTime();
          break;
        case 'size':
          comparison = (a.size || 0) - (b.size || 0);
          break;
        case 'type':
          if (a.type === b.type) {
            comparison = a.name.localeCompare(b.name);
          } else {
            comparison = a.type === 'folder' ? -1 : 1;
          }
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const handleFileSelect = (fileId: string, isCtrlClick: boolean = false) => {
    if (isCtrlClick) {
      setSelectedFiles(prev => 
        prev.includes(fileId) 
          ? prev.filter(id => id !== fileId)
          : [...prev, fileId]
      );
    } else {
      setSelectedFiles([fileId]);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files) return;

    const newTasks: UploadTask[] = Array.from(files).map(file => ({
      id: `upload_${Date.now()}_${Math.random()}`,
      file,
      progress: 0,
      status: 'uploading' as const
    }));

    setUploadTasks(prev => [...prev, ...newTasks]);

    // Upload files one by one
    for (const task of newTasks) {
      try {
        const formData = new FormData();
        formData.append('file', task.file);
        formData.append('path', currentPath);

        const xhr = new XMLHttpRequest();
        
        // Track upload progress
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = (e.loaded / e.total) * 100;
            setUploadTasks(prev => prev.map(t => 
              t.id === task.id ? { ...t, progress } : t
            ));
          }
        });

        // Handle upload completion
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploadTasks(prev => prev.map(t => 
              t.id === task.id ? { ...t, progress: 100, status: 'completed' as const } : t
            ));
            // Reload files after successful upload
            loadFiles();
          } else {
            throw new Error(`Upload failed with status ${xhr.status}`);
          }
        });

        // Handle upload error
        xhr.addEventListener('error', () => {
          setUploadTasks(prev => prev.map(t => 
            t.id === task.id ? { ...t, status: 'failed' as const, error: 'Upload failed' } : t
          ));
        });

        // Send the request
        xhr.open('POST', '/api/platform/files/upload');
        xhr.send(formData);
      } catch (error) {
        console.error('Upload error:', error);
        setUploadTasks(prev => prev.map(t => 
          t.id === task.id ? { ...t, status: 'failed' as const, error: 'Upload failed' } : t
        ));
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    handleFileUpload(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const openShareModal = (file: FileItem) => {
    setShareModalFile(file);
    setShowShareModal(true);
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const response = await fetch('/api/platform/files/folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newFolderName,
          path: currentPath,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create folder');
      }

      const data = await response.json();
      
      // Reload files to show the new folder
      await loadFiles();
      
      setNewFolderName('');
      setShowNewFolderModal(false);
    } catch (error) {
      console.error('Failed to create folder:', error);
      setError('Failed to create folder. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
          <button
            onClick={() => {
              setError(null);
              loadFiles();
            }}
            className="ml-auto text-red-600 hover:text-red-700 text-sm font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <FolderIconSolid className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">File Manager</h1>
              <p className="text-gray-600">Secure document sharing and management</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowNewFolderModal(true)}
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <FolderPlusIcon className="w-5 h-5" />
              <span>New Folder</span>
            </button>
            
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <CloudArrowUpIcon className="w-5 h-5" />
              <span>Upload Files</span>
            </button>
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
          <button 
            onClick={() => setCurrentPath('/')}
            className="hover:text-blue-600"
          >
            Home
          </button>
          {currentPath !== '/' && currentPath.split('/').filter(Boolean).map((segment, index, array) => (
            <React.Fragment key={index}>
              <ChevronRightIcon className="w-4 h-4" />
              <button
                onClick={() => {
                  const newPath = '/' + array.slice(0, index + 1).join('/');
                  setCurrentPath(newPath);
                }}
                className="hover:text-blue-600"
              >
                {segment}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Search and Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="relative flex-1 min-w-64">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search files and folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Files</option>
            <option value="folders">Folders</option>
            <option value="documents">Documents</option>
            <option value="images">Images</option>
            <option value="videos">Videos</option>
            <option value="audio">Audio</option>
          </select>

          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [by, order] = e.target.value.split('-');
              setSortBy(by as any);
              setSortOrder(order as any);
            }}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="modified-desc">Modified (Newest)</option>
            <option value="modified-asc">Modified (Oldest)</option>
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="size-desc">Size (Largest)</option>
            <option value="size-asc">Size (Smallest)</option>
            <option value="type-asc">Type</option>
          </select>

          <div className="flex border border-gray-300 rounded-lg">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
            >
              <Bars3Icon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
            >
              <Squares2X2Icon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Selected Files Actions */}
        {selectedFiles.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-blue-800 font-medium">
                {selectedFiles.length} item(s) selected
              </span>
              <div className="flex space-x-2">
                <button 
                  onClick={() => {
                    const firstSelectedFile = files.find(f => selectedFiles.includes(f.id));
                    if (firstSelectedFile) openShareModal(firstSelectedFile);
                  }}
                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 px-2 py-1 rounded">
                  <ShareIcon className="w-4 h-4" />
                  <span>Share</span>
                </button>
                <button 
                  onClick={async () => {
                    for (const fileId of selectedFiles) {
                      const file = files.find(f => f.id === fileId);
                      if (file && file.type === 'file') {
                        try {
                          const response = await fetch(`/api/platform/files/download/${fileId}`);
                          if (!response.ok) throw new Error('Download failed');
                          
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = file.name;
                          document.body.appendChild(a);
                          a.click();
                          window.URL.revokeObjectURL(url);
                          document.body.removeChild(a);
                        } catch (error) {
                          console.error('Download failed:', error);
                          setError('Failed to download file');
                        }
                      }
                    }
                  }}
                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 px-2 py-1 rounded">
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  <span>Download</span>
                </button>
                <button 
                  onClick={async () => {
                    if (confirm(`Are you sure you want to delete ${selectedFiles.length} item(s)?`)) {
                      for (const fileId of selectedFiles) {
                        try {
                          const response = await fetch(`/api/platform/files/${fileId}`, {
                            method: 'DELETE',
                          });
                          if (!response.ok) throw new Error('Delete failed');
                        } catch (error) {
                          console.error('Delete failed:', error);
                          setError('Failed to delete files');
                        }
                      }
                      // Reload files after deletion
                      await loadFiles();
                      setSelectedFiles([]);
                    }
                  }}
                  className="flex items-center space-x-1 text-red-600 hover:text-red-700 px-2 py-1 rounded">
                  <TrashIcon className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upload Progress */}
      {uploadTasks.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900">Upload Progress</h3>
            <button
              onClick={() => setUploadTasks([])}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-3">
            {uploadTasks.map((task) => (
              <div key={task.id} className="flex items-center space-x-3">
                <DocumentIcon className="w-5 h-5 text-gray-400" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{task.file.name}</span>
                    <span className="text-sm text-gray-500">
                      {task.status === 'completed' ? '100%' : `${Math.round(task.progress)}%`}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        task.status === 'completed' ? 'bg-green-500' : 
                        task.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${task.status === 'completed' ? 100 : task.progress}%` }}
                    />
                  </div>
                </div>
                {task.status === 'completed' && (
                  <CheckCircleIcon className="w-5 h-5 text-green-500" />
                )}
                {task.status === 'failed' && (
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* File List */}
      <div className="bg-white rounded-lg shadow-md">
        <div
          ref={dragRef}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="min-h-64"
        >
          {viewMode === 'list' ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedFiles(filteredFiles.map(f => f.id));
                          } else {
                            setSelectedFiles([]);
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Modified
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shared
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredFiles.map((file) => (
                    <motion.tr
                      key={file.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`hover:bg-gray-50 cursor-pointer ${
                        selectedFiles.includes(file.id) ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => {
                        if (file.type === 'folder') {
                          setCurrentPath(file.path);
                        } else {
                          handleFileSelect(file.id);
                        }
                      }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedFiles.includes(file.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleFileSelect(file.id, true);
                          }}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          {getFileIcon(file)}
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-900">
                                {file.name}
                              </span>
                              {file.isEncrypted && (
                                <LockClosedIcon className="w-3 h-3 text-green-600" />
                              )}
                              {file.isStarred && (
                                <HeartIconSolid className="w-3 h-3 text-yellow-500" />
                              )}
                            </div>
                            {file.tags.length > 0 && (
                              <div className="flex space-x-1 mt-1">
                                {file.tags.slice(0, 3).map((tag) => (
                                  <span
                                    key={tag}
                                    className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {file.type === 'folder' ? '—' : formatFileSize(file.size)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDistance(file.modifiedAt, new Date(), { addSuffix: true })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {file.isShared ? (
                          <div className="flex items-center space-x-1">
                            <UserGroupIcon className="w-4 h-4 text-blue-600" />
                            <span className="text-sm text-blue-600">
                              {file.shareSettings?.sharedWith.length || 0}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {file.permissions.canView && (
                            <button 
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  // For folders, navigate into them
                                  if (file.type === 'folder') {
                                    setCurrentPath(file.path);
                                  } else {
                                    // For files, open preview or download
                                    const response = await fetch(`/api/platform/files/preview/${file.id}`);
                                    if (!response.ok) throw new Error('Preview failed');
                                    
                                    const data = await response.json();
                                    if (data.previewUrl) {
                                      window.open(data.previewUrl, '_blank');
                                    } else {
                                      // Fallback to download if preview not available
                                      const downloadResponse = await fetch(`/api/platform/files/download/${file.id}`);
                                      if (!downloadResponse.ok) throw new Error('Download failed');
                                      
                                      const blob = await downloadResponse.blob();
                                      const url = window.URL.createObjectURL(blob);
                                      window.open(url, '_blank');
                                      setTimeout(() => window.URL.revokeObjectURL(url), 100);
                                    }
                                  }
                                } catch (error) {
                                  console.error('View failed:', error);
                                  setError('Failed to view file');
                                }
                              }}
                              className="text-gray-400 hover:text-gray-600">
                              <EyeIcon className="w-4 h-4" />
                            </button>
                          )}
                          {file.permissions.canShare && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openShareModal(file);
                              }}
                              className="text-gray-400 hover:text-blue-600"
                            >
                              <ShareIcon className="w-4 h-4" />
                            </button>
                          )}
                          {file.permissions.canDownload && file.type === 'file' && (
                            <button 
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  const response = await fetch(`/api/platform/files/download/${file.id}`);
                                  if (!response.ok) throw new Error('Download failed');
                                  
                                  const blob = await response.blob();
                                  const url = window.URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = file.name;
                                  document.body.appendChild(a);
                                  a.click();
                                  window.URL.revokeObjectURL(url);
                                  document.body.removeChild(a);
                                } catch (error) {
                                  console.error('Download failed:', error);
                                  setError('Failed to download file');
                                }
                              }}
                              className="text-gray-400 hover:text-green-600">
                              <ArrowDownTrayIcon className="w-4 h-4" />
                            </button>
                          )}
                          {file.permissions.canDelete && (
                            <button 
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (confirm(`Are you sure you want to delete ${file.name}?`)) {
                                  try {
                                    const response = await fetch(`/api/platform/files/${file.id}`, {
                                      method: 'DELETE',
                                    });
                                    if (!response.ok) throw new Error('Delete failed');
                                    
                                    // Reload files after deletion
                                    await loadFiles();
                                  } catch (error) {
                                    console.error('Delete failed:', error);
                                    setError('Failed to delete file');
                                  }
                                }
                              }}
                              className="text-gray-400 hover:text-red-600">
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredFiles.map((file) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`relative p-4 border-2 border-dashed border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-all ${
                    selectedFiles.includes(file.id) ? 'border-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => {
                    if (file.type === 'folder') {
                      setCurrentPath(file.path);
                    } else {
                      handleFileSelect(file.id);
                    }
                  }}
                >
                  <div className="text-center">
                    <div className="mb-3 flex justify-center">
                      {file.metadata?.thumbnailUrl && file.type === 'file' ? (
                        <img
                          src={file.metadata.thumbnailUrl}
                          alt={file.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                      ) : (
                        getFileIcon(file)
                      )}
                    </div>
                    <h3 className="text-sm font-medium text-gray-900 truncate" title={file.name}>
                      {file.name}
                    </h3>
                    {file.type === 'file' && (
                      <p className="text-xs text-gray-500 mt-1">
                        {formatFileSize(file.size)}
                      </p>
                    )}
                  </div>

                  <div className="absolute top-2 right-2 flex space-x-1">
                    {file.isEncrypted && (
                      <LockClosedIcon className="w-3 h-3 text-green-600" />
                    )}
                    {file.isStarred && (
                      <HeartIconSolid className="w-3 h-3 text-yellow-500" />
                    )}
                    {file.isShared && (
                      <UserGroupIcon className="w-3 h-3 text-blue-600" />
                    )}
                  </div>

                  <input
                    type="checkbox"
                    checked={selectedFiles.includes(file.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleFileSelect(file.id, true);
                    }}
                    className="absolute top-2 left-2 rounded border-gray-300"
                  />
                </motion.div>
              ))}
            </div>
          )}

          {filteredFiles.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              <FolderIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No files found</h3>
              <p>Upload files or create folders to get started</p>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-lg p-6 w-96 max-w-90vw"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Upload Files</h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <CloudArrowUpIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-sm text-gray-600 mb-2">
                  Drag and drop files here, or click to select
                </p>
                <p className="text-xs text-gray-500">
                  Maximum file size: 100MB
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={(e) => {
                  handleFileUpload(e.target.files);
                  // Reset the input value to allow re-uploading the same file
                  if (e.target) e.target.value = '';
                }}
                className="hidden"
              />

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Folder Modal */}
      <AnimatePresence>
        {showNewFolderModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-lg p-6 w-96 max-w-90vw"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Create New Folder</h3>
                <button
                  onClick={() => setShowNewFolderModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Folder Name
                </label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Enter folder name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && createFolder()}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowNewFolderModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={createFolder}
                  disabled={!newFolderName.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Create Folder
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && shareModalFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-lg p-6 w-96 max-w-90vw max-h-90vh overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Share File</h3>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-6">
                <div className="flex items-center space-x-3 mb-3">
                  {getFileIcon(shareModalFile)}
                  <div>
                    <h4 className="font-medium text-gray-900">{shareModalFile.name}</h4>
                    <p className="text-sm text-gray-500">
                      {shareModalFile.type === 'file' ? formatFileSize(shareModalFile.size) : 'Folder'}
                    </p>
                  </div>
                </div>
              </div>

              {shareModalFile.shareSettings && (
                <div className="space-y-4">
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">Currently shared with:</h5>
                    <div className="space-y-2">
                      {shareModalFile.shareSettings.sharedWith.map((share, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <span className="font-medium text-gray-900">{share.userName}</span>
                            <span className="text-sm text-gray-500 ml-2">({share.role})</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {share.permissions.join(', ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <input
                        type="text"
                        placeholder="Add people..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button 
                        onClick={async () => {
                          // Implement share functionality via API
                          try {
                            const response = await fetch(`/api/platform/files/${shareModalFile.id}/share`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({
                                // Add share configuration here
                              }),
                            });
                            if (!response.ok) throw new Error('Share failed');
                            
                            // Reload files to update share status
                            await loadFiles();
                            setShowShareModal(false);
                          } catch (error) {
                            console.error('Share failed:', error);
                            setError('Failed to share file');
                          }
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                        Share
                      </button>
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={shareModalFile.shareSettings.allowDownload}
                          onChange={() => {}}
                          className="rounded border-gray-300 mr-2"
                        />
                        <span className="text-sm text-gray-700">Allow download</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={shareModalFile.shareSettings.allowEdit}
                          onChange={() => {}}
                          className="rounded border-gray-300 mr-2"
                        />
                        <span className="text-sm text-gray-700">Allow editing</span>
                      </label>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <button 
                      onClick={async () => {
                        try {
                          const response = await fetch(`/api/platform/files/${shareModalFile.id}/share-link`);
                          if (!response.ok) throw new Error('Failed to get share link');
                          
                          const data = await response.json();
                          await navigator.clipboard.writeText(data.shareLink);
                          alert('Share link copied to clipboard!');
                        } catch (error) {
                          console.error('Failed to get share link:', error);
                          setError('Failed to get share link');
                        }
                      }}
                      className="flex items-center space-x-2 text-blue-600 hover:text-blue-700">
                      <LinkIcon className="w-4 h-4" />
                      <span>Copy share link</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowShareModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FileManager;