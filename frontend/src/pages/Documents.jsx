import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import {
  Upload,
  Download,
  Trash2,
  FileText,
  File,
  Search,
  Filter,
  Star,
  X,
  History,
  Clock,
  Edit3,
  Check,
  Plus,
  FolderOpen,
  Eye,
  Table,
  FileSearch,
  Sparkles,
  Loader2,
} from 'lucide-react';

const cardStyle = {
  backgroundColor: 'var(--bg-card)',
  borderColor: 'var(--border-color)',
};

const inputStyle = {
  backgroundColor: 'var(--bg-secondary)',
  borderColor: 'var(--border-color)',
  color: 'var(--text-primary)',
};

// File type icons mapping
const FILE_TYPE_ICONS = {
  pdf: { icon: FileText, color: '#ef4444' },
  docx: { icon: FileText, color: '#3b82f6' },
  xlsx: { icon: FileText, color: '#22c55e' },
  txt: { icon: File, color: '#6b7280' },
};

const formatFileSize = (bytes) => {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('hu-HU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const Documents = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterKnowledge, setFilterKnowledge] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Category for upload
  const [uploadCategory, setUploadCategory] = useState('');
  const [uploadAsKnowledge, setUploadAsKnowledge] = useState(false);

  // Version history modal
  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const [versionDoc, setVersionDoc] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  // Categories
  const [categories, setCategories] = useState([]);
  const [filterCategory, setFilterCategory] = useState('');

  // Category editing
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editCategoryValue, setEditCategoryValue] = useState('');

  // New category input for upload
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);

  // Document preview modal
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewContent, setPreviewContent] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Content search
  const [contentSearchEnabled, setContentSearchEnabled] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchingContent, setSearchingContent] = useState(false);

  // AI Summarization
  const [summarizing, setSummarizing] = useState(false);

  const loadCategories = useCallback(async () => {
    try {
      const res = await api.get('/v1/documents/categories');
      setCategories(res.data);
    } catch {
      // Silently fail - categories are optional
    }
  }, []);

  const loadDocuments = useCallback(async () => {
    try {
      let url = '/v1/documents';
      const params = new URLSearchParams();

      if (filterType) params.append('file_type', filterType);
      if (filterCategory) params.append('category', filterCategory);
      if (filterKnowledge === 'true') params.append('is_knowledge_base', 'true');
      if (filterKnowledge === 'false') params.append('is_knowledge_base', 'false');

      if (params.toString()) url += `?${params.toString()}`;

      const res = await api.get(url);
      let docs = res.data;

      // Client-side search filtering
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        docs = docs.filter(
          (doc) =>
            doc.original_filename.toLowerCase().includes(query) ||
            (doc.category && doc.category.toLowerCase().includes(query))
        );
      }

      setDocuments(docs);
    } catch {
      toast.error('Hiba a dokumentumok betöltésekor!');
    } finally {
      setLoading(false);
    }
  }, [filterType, filterCategory, filterKnowledge, searchQuery]);

  useEffect(() => {
    loadDocuments();
    loadCategories();
  }, [loadDocuments, loadCategories]);

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);

      let url = '/v1/documents/upload';
      const params = new URLSearchParams();
      if (uploadCategory) params.append('category', uploadCategory);
      if (uploadAsKnowledge) params.append('is_knowledge_base', 'true');
      if (params.toString()) url += `?${params.toString()}`;

      try {
        await api.post(url, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success(`${file.name} feltöltve!`);
      } catch (err) {
        const errorMsg = err.response?.data?.detail || 'Feltöltési hiba';
        toast.error(`${file.name}: ${errorMsg}`);
      }
    }

    setUploading(false);
    loadDocuments();
  };

  const handleFileInputChange = (e) => {
    handleFileUpload(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDownload = async (doc) => {
    try {
      const res = await api.get(`/v1/documents/${doc.id}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.original_filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Hiba a fájl letöltésekor!');
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Biztosan törölni szeretnéd: ${doc.original_filename}?`)) {
      return;
    }

    try {
      await api.delete(`/v1/documents/${doc.id}`);
      toast.success('Dokumentum törölve!');
      loadDocuments();
    } catch {
      toast.error('Hiba a dokumentum törlésekor!');
    }
  };

  const handleToggleKnowledge = async (doc) => {
    try {
      await api.post(`/v1/documents/${doc.id}/toggle-knowledge`);
      toast.success(
        doc.is_knowledge
          ? 'Eltávolítva a tudásbázisból'
          : 'Hozzáadva a tudásbázishoz'
      );
      loadDocuments();
    } catch {
      toast.error('Hiba a tudásbázis állapot módosításakor!');
    }
  };

  const handleShowVersions = async (doc) => {
    setVersionDoc(doc);
    setVersionModalOpen(true);
    setLoadingVersions(true);

    try {
      const res = await api.get(`/v1/documents/${doc.id}/versions`);
      setVersions(res.data);
    } catch {
      toast.error('Hiba a verziók betöltésekor!');
      setVersions([]);
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleDownloadVersion = async (mainDocId, version) => {
    try {
      const res = await api.get(`/v1/documents/${mainDocId}/versions/${version.id}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${version.original_filename}_v${version.version}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Hiba a verzió letöltésekor!');
    }
  };

  const closeVersionModal = () => {
    setVersionModalOpen(false);
    setVersionDoc(null);
    setVersions([]);
  };

  // Preview functions
  const handleShowPreview = async (doc) => {
    setPreviewDoc(doc);
    setPreviewModalOpen(true);
    setLoadingPreview(true);
    setPreviewContent(null);

    try {
      const res = await api.get(`/v1/documents/${doc.id}/preview`);
      setPreviewContent(res.data);
    } catch {
      toast.error('Hiba az előnézet betöltésekor!');
      setPreviewContent({ error: 'Hiba az előnézet betöltésekor' });
    } finally {
      setLoadingPreview(false);
    }
  };

  const closePreviewModal = () => {
    setPreviewModalOpen(false);
    setPreviewDoc(null);
    setPreviewContent(null);
  };

  // Content search function
  const handleContentSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchingContent(true);
    try {
      const res = await api.get(`/v1/documents/search?q=${encodeURIComponent(searchQuery)}&content_search=true`);
      setSearchResults(res.data);
    } catch {
      toast.error('Hiba a tartalomkeresés során!');
      setSearchResults([]);
    } finally {
      setSearchingContent(false);
    }
  };

  const clearSearchResults = () => {
    setSearchResults([]);
    setContentSearchEnabled(false);
  };

  // AI Summary generation
  const handleGenerateSummary = async (doc) => {
    setSummarizing(true);
    try {
      const res = await api.post(`/v1/documents/${doc.id}/summarize`);
      toast.success('Összefoglaló sikeresen generálva!');
      // Update the preview doc with the new summary
      setPreviewDoc(prev => prev ? { ...prev, summary: res.data.summary } : prev);
      // Reload documents to update the list
      loadDocuments();
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Hiba az összefoglaló generálása közben';
      toast.error(errorMsg);
    } finally {
      setSummarizing(false);
    }
  };

  const handleStartEditCategory = (doc) => {
    setEditingCategoryId(doc.id);
    setEditCategoryValue(doc.category || '');
  };

  const handleCancelEditCategory = () => {
    setEditingCategoryId(null);
    setEditCategoryValue('');
  };

  const handleSaveCategory = async (doc) => {
    try {
      await api.put(`/v1/documents/${doc.id}`, { category: editCategoryValue || null });
      toast.success('Kategória frissítve!');
      setEditingCategoryId(null);
      setEditCategoryValue('');
      loadDocuments();
      loadCategories();
    } catch {
      toast.error('Hiba a kategória frissítésekor!');
    }
  };

  const getFileIcon = (fileType) => {
    const config = FILE_TYPE_ICONS[fileType] || FILE_TYPE_ICONS.txt;
    const IconComponent = config.icon;
    return <IconComponent size={20} style={{ color: config.color }} />;
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterType('');
    setFilterCategory('');
    setFilterKnowledge('');
    setSearchResults([]);
    setContentSearchEnabled(false);
  };

  const hasActiveFilters = searchQuery || filterType || filterCategory || filterKnowledge || searchResults.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Dokumentumok
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Dokumentumok feltöltése és kezelése
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded border transition-colors ${
              hasActiveFilters ? 'bg-blue-50' : ''
            }`}
            style={{
              ...inputStyle,
              borderColor: hasActiveFilters ? 'var(--accent)' : 'var(--border-color)',
            }}
            data-testid="toggle-filters-btn"
          >
            <Filter size={18} />
            Szűrők
            {hasActiveFilters && (
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: 'var(--accent)' }}
              />
            )}
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="rounded-lg border p-4" style={cardStyle} data-testid="filters-panel">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Keresés
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2"
                    style={{ color: 'var(--text-secondary)' }}
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Fájlnév vagy kategória..."
                    className="w-full pl-10 pr-3 py-2 rounded border"
                    style={inputStyle}
                    data-testid="search-input"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && contentSearchEnabled) {
                        handleContentSearch();
                      }
                    }}
                  />
                </div>
                <button
                  onClick={handleContentSearch}
                  disabled={!searchQuery.trim() || searchingContent}
                  className={`px-3 py-2 rounded border flex items-center gap-1 transition-colors ${
                    contentSearchEnabled ? 'bg-blue-50' : ''
                  }`}
                  style={{
                    ...inputStyle,
                    borderColor: contentSearchEnabled ? 'var(--accent)' : 'var(--border-color)',
                    opacity: !searchQuery.trim() ? 0.5 : 1,
                  }}
                  title="Keresés dokumentumok tartalmában"
                  data-testid="content-search-btn"
                >
                  <FileSearch size={18} />
                  {searchingContent ? '...' : 'Tartalom'}
                </button>
              </div>
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={contentSearchEnabled}
                  onChange={(e) => {
                    setContentSearchEnabled(e.target.checked);
                    if (!e.target.checked) {
                      setSearchResults([]);
                    }
                  }}
                  className="w-4 h-4 rounded"
                  data-testid="content-search-checkbox"
                />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Keresés dokumentumok tartalmában
                </span>
              </label>
            </div>

            {/* Type Filter */}
            <div className="min-w-[150px]">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Típus
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 rounded border"
                style={inputStyle}
                data-testid="type-filter"
              >
                <option value="">Mind</option>
                <option value="pdf">PDF</option>
                <option value="docx">DOCX</option>
                <option value="xlsx">XLSX</option>
                <option value="txt">TXT</option>
              </select>
            </div>

            {/* Category Filter */}
            <div className="min-w-[150px]">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Kategória
              </label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2 rounded border"
                style={inputStyle}
                data-testid="category-filter"
              >
                <option value="">Mind</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Knowledge Base Filter */}
            <div className="min-w-[150px]">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Tudásbázis
              </label>
              <select
                value={filterKnowledge}
                onChange={(e) => setFilterKnowledge(e.target.value)}
                className="w-full px-3 py-2 rounded border"
                style={inputStyle}
                data-testid="knowledge-filter"
              >
                <option value="">Mind</option>
                <option value="true">Csak tudásbázis</option>
                <option value="false">Nem tudásbázis</option>
              </select>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-2 rounded hover:bg-gray-500/10 transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                data-testid="clear-filters-btn"
              >
                <X size={18} />
                Törlés
              </button>
            )}
          </div>
        </div>
      )}

      {/* Upload Section */}
      <div className="rounded-lg border p-4" style={cardStyle}>
        <h2 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Upload size={18} />
          Fájl feltöltés
        </h2>

        {/* Upload Options */}
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
              Kategória (opcionális)
            </label>
            <div className="flex gap-2">
              {!showNewCategoryInput ? (
                <>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="flex-1 px-3 py-2 rounded border"
                    style={inputStyle}
                    data-testid="upload-category-select"
                  >
                    <option value="">-- Nincs kategória --</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewCategoryInput(true);
                      setUploadCategory('');
                    }}
                    className="px-3 py-2 rounded border flex items-center gap-1 hover:bg-gray-500/10 transition-colors"
                    style={inputStyle}
                    title="Új kategória"
                    data-testid="new-category-btn"
                  >
                    <Plus size={16} />
                    Új
                  </button>
                </>
              ) : (
                <>
                  <input
                    type="text"
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    placeholder="Új kategória neve..."
                    className="flex-1 px-3 py-2 rounded border"
                    style={inputStyle}
                    data-testid="upload-category-input"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewCategoryInput(false);
                      setUploadCategory('');
                    }}
                    className="px-3 py-2 rounded border flex items-center gap-1 hover:bg-gray-500/10 transition-colors"
                    style={inputStyle}
                    title="Mégse"
                    data-testid="cancel-new-category-btn"
                  >
                    <X size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={uploadAsKnowledge}
                onChange={(e) => setUploadAsKnowledge(e.target.checked)}
                className="w-4 h-4 rounded"
                data-testid="upload-knowledge-checkbox"
              />
              <span className="text-sm flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                <Star size={16} />
                Tudásbázishoz hozzáadás
              </span>
            </label>
          </div>
        </div>

        {/* Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
            dragOver ? 'border-blue-500 bg-blue-50/10' : ''
          }`}
          style={{ borderColor: dragOver ? 'var(--accent)' : 'var(--border-color)' }}
          onClick={() => fileInputRef.current?.click()}
          data-testid="file-dropzone"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            className="hidden"
            multiple
            accept=".pdf,.docx,.xlsx,.txt"
            data-testid="file-input"
          />
          <Upload size={40} className="mx-auto mb-3" style={{ color: 'var(--text-secondary)' }} />
          <p className="text-lg font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            {uploading ? 'Feltöltés...' : 'Húzd ide a fájlokat'}
          </p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            vagy kattints a tallózáshoz
          </p>
          <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
            Támogatott formátumok: PDF, DOCX, XLSX, TXT
          </p>
        </div>
      </div>

      {/* Documents List */}
      <div className="rounded-lg border p-4" style={cardStyle}>
        <h2 className="font-semibold mb-4 flex items-center justify-between" style={{ color: 'var(--text-primary)' }}>
          <span className="flex items-center gap-2">
            <FileText size={18} />
            Dokumentumok ({documents.length})
          </span>
        </h2>

        {loading ? (
          <div className="text-center py-8">
            <p style={{ color: 'var(--text-secondary)' }}>Betöltés...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8">
            <FileText size={48} className="mx-auto mb-3" style={{ color: 'var(--text-secondary)' }} />
            <p style={{ color: 'var(--text-secondary)' }}>
              {hasActiveFilters
                ? 'Nincs a szűrésnek megfelelő dokumentum'
                : 'Még nincsenek dokumentumok feltöltve'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="documents-table">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <th className="text-left py-3 px-2 font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Fájl
                  </th>
                  <th className="text-left py-3 px-2 font-medium hidden sm:table-cell" style={{ color: 'var(--text-secondary)' }}>
                    Méret
                  </th>
                  <th className="text-left py-3 px-2 font-medium hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>
                    Kategória
                  </th>
                  <th className="text-left py-3 px-2 font-medium hidden lg:table-cell" style={{ color: 'var(--text-secondary)' }}>
                    Dátum
                  </th>
                  <th className="text-left py-3 px-2 font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Tudásbázis
                  </th>
                  <th className="text-right py-3 px-2 font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Műveletek
                  </th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr
                    key={doc.id}
                    className="border-b hover:bg-gray-500/5 transition-colors"
                    style={{ borderColor: 'var(--border-color)' }}
                    data-testid={`document-row-${doc.id}`}
                  >
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        {getFileIcon(doc.file_type)}
                        <span className="truncate max-w-[200px]" style={{ color: 'var(--text-primary)' }}>
                          {doc.original_filename}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-2 hidden sm:table-cell" style={{ color: 'var(--text-secondary)' }}>
                      {formatFileSize(doc.file_size)}
                    </td>
                    <td className="py-3 px-2 hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>
                      {editingCategoryId === doc.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editCategoryValue}
                            onChange={(e) => setEditCategoryValue(e.target.value)}
                            className="w-24 px-2 py-1 rounded border text-sm"
                            style={inputStyle}
                            data-testid={`edit-category-input-${doc.id}`}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveCategory(doc);
                              if (e.key === 'Escape') handleCancelEditCategory();
                            }}
                          />
                          <button
                            onClick={() => handleSaveCategory(doc)}
                            className="p-1 rounded hover:bg-green-100 transition-colors"
                            title="Mentés"
                            data-testid={`save-category-btn-${doc.id}`}
                          >
                            <Check size={14} className="text-green-600" />
                          </button>
                          <button
                            onClick={handleCancelEditCategory}
                            className="p-1 rounded hover:bg-red-100 transition-colors"
                            title="Mégse"
                            data-testid={`cancel-category-btn-${doc.id}`}
                          >
                            <X size={14} className="text-red-500" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 group">
                          <span className="flex items-center gap-1">
                            {doc.category ? (
                              <>
                                <FolderOpen size={14} />
                                {doc.category}
                              </>
                            ) : (
                              '-'
                            )}
                          </span>
                          <button
                            onClick={() => handleStartEditCategory(doc)}
                            className="p-1 rounded hover:bg-gray-500/10 transition-colors opacity-0 group-hover:opacity-100"
                            title="Kategória szerkesztése"
                            data-testid={`edit-category-btn-${doc.id}`}
                          >
                            <Edit3 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-2 hidden lg:table-cell" style={{ color: 'var(--text-secondary)' }}>
                      {formatDate(doc.created_at)}
                    </td>
                    <td className="py-3 px-2">
                      <button
                        onClick={() => handleToggleKnowledge(doc)}
                        className={`p-1.5 rounded transition-colors ${
                          doc.is_knowledge ? 'text-yellow-500' : 'hover:bg-gray-500/10'
                        }`}
                        style={{
                          color: doc.is_knowledge ? '#eab308' : 'var(--text-secondary)',
                        }}
                        title={doc.is_knowledge ? 'Tudásbázisban van' : 'Hozzáadás a tudásbázishoz'}
                        data-testid={`knowledge-toggle-${doc.id}`}
                      >
                        <Star size={18} fill={doc.is_knowledge ? 'currentColor' : 'none'} />
                      </button>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleShowPreview(doc)}
                          className="p-2 rounded hover:bg-gray-500/10 transition-colors"
                          title="Előnézet"
                          data-testid={`preview-btn-${doc.id}`}
                        >
                          <Eye size={18} style={{ color: 'var(--text-secondary)' }} />
                        </button>
                        <button
                          onClick={() => handleShowVersions(doc)}
                          className="p-2 rounded hover:bg-gray-500/10 transition-colors"
                          title="Verziótörténet"
                          data-testid={`versions-btn-${doc.id}`}
                        >
                          <History size={18} style={{ color: 'var(--text-secondary)' }} />
                        </button>
                        <button
                          onClick={() => handleDownload(doc)}
                          className="p-2 rounded hover:bg-gray-500/10 transition-colors"
                          title="Letöltés"
                          data-testid={`download-btn-${doc.id}`}
                        >
                          <Download size={18} style={{ color: 'var(--accent)' }} />
                        </button>
                        <button
                          onClick={() => handleDelete(doc)}
                          className="p-2 rounded hover:bg-red-100 transition-colors"
                          title="Törlés"
                          data-testid={`delete-btn-${doc.id}`}
                        >
                          <Trash2 size={18} className="text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Version History Modal */}
      {versionModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={closeVersionModal}
          data-testid="version-modal-backdrop"
        >
          <div
            className="rounded-lg border p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
            style={cardStyle}
            onClick={(e) => e.stopPropagation()}
            data-testid="version-modal"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <History size={20} />
                Verziótörténet
              </h2>
              <button
                onClick={closeVersionModal}
                className="p-2 rounded hover:bg-gray-500/10 transition-colors"
                data-testid="close-version-modal"
              >
                <X size={20} style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>

            {versionDoc && (
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                {versionDoc.original_filename}
              </p>
            )}

            {loadingVersions ? (
              <div className="text-center py-8">
                <p style={{ color: 'var(--text-secondary)' }}>Betöltés...</p>
              </div>
            ) : versions.length === 0 ? (
              <div className="text-center py-8">
                <p style={{ color: 'var(--text-secondary)' }}>Nincsenek korábbi verziók</p>
              </div>
            ) : (
              <div className="space-y-2">
                {versions.map((version, index) => (
                  <div
                    key={version.id}
                    className="flex items-center justify-between p-3 rounded border"
                    style={{ borderColor: 'var(--border-color)', backgroundColor: index === 0 ? 'var(--bg-secondary)' : 'transparent' }}
                    data-testid={`version-row-${version.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium"
                        style={{
                          backgroundColor: index === 0 ? 'var(--accent)' : 'var(--border-color)',
                          color: index === 0 ? 'white' : 'var(--text-primary)',
                        }}
                      >
                        v{version.version}
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {index === 0 ? 'Jelenlegi verzió' : `Verzió ${version.version}`}
                        </p>
                        <p className="text-xs flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                          <Clock size={12} />
                          {formatDate(version.created_at)}
                          <span className="mx-1">•</span>
                          {formatFileSize(version.file_size)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownloadVersion(versionDoc.id, version)}
                      className="p-2 rounded hover:bg-gray-500/10 transition-colors flex items-center gap-1 text-sm"
                      style={{ color: 'var(--accent)' }}
                      data-testid={`download-version-${version.id}`}
                    >
                      <Download size={16} />
                      Letöltés
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={closePreviewModal}
          data-testid="preview-modal-backdrop"
        >
          <div
            className="rounded-lg border p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            style={cardStyle}
            onClick={(e) => e.stopPropagation()}
            data-testid="preview-modal"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Eye size={20} />
                Előnézet
              </h2>
              <button
                onClick={closePreviewModal}
                className="p-2 rounded hover:bg-gray-500/10 transition-colors"
                data-testid="close-preview-modal"
              >
                <X size={20} style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>

            {previewDoc && (
              <div className="mb-4">
                <p className="text-sm flex items-center gap-2 mb-3" style={{ color: 'var(--text-secondary)' }}>
                  {getFileIcon(previewDoc.file_type)}
                  {previewDoc.original_filename}
                </p>

                {/* AI Summary Section */}
                <div className="p-3 rounded border mb-3" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                      <Sparkles size={16} style={{ color: 'var(--accent)' }} />
                      AI Összefoglaló
                    </span>
                    <button
                      onClick={() => handleGenerateSummary(previewDoc)}
                      disabled={summarizing}
                      className="flex items-center gap-1 px-3 py-1.5 rounded text-sm transition-colors"
                      style={{
                        backgroundColor: 'var(--accent)',
                        color: 'white',
                        opacity: summarizing ? 0.7 : 1,
                      }}
                      data-testid="generate-summary-btn"
                    >
                      {summarizing ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Generálás...
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} />
                          {previewDoc.summary ? 'Újragenerálás' : 'Összefoglaló generálás'}
                        </>
                      )}
                    </button>
                  </div>
                  {previewDoc.summary ? (
                    <p className="text-sm" style={{ color: 'var(--text-primary)' }} data-testid="document-summary">
                      {previewDoc.summary}
                    </p>
                  ) : (
                    <p className="text-sm italic" style={{ color: 'var(--text-secondary)' }}>
                      Még nincs összefoglaló. Kattints a gombra a generáláshoz.
                    </p>
                  )}
                </div>
              </div>
            )}

            {loadingPreview ? (
              <div className="text-center py-8">
                <p style={{ color: 'var(--text-secondary)' }}>Betöltés...</p>
              </div>
            ) : previewContent?.error ? (
              <div className="text-center py-8">
                <p className="text-red-500">{previewContent.error}</p>
              </div>
            ) : previewContent?.preview_url ? (
              // PDF inline viewer
              <div className="w-full" style={{ height: '70vh' }}>
                <iframe
                  src={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${previewContent.preview_url}`}
                  className="w-full h-full rounded border"
                  style={{ borderColor: 'var(--border-color)' }}
                  title={previewDoc?.original_filename}
                  data-testid="pdf-preview-iframe"
                />
              </div>
            ) : previewContent?.table_data ? (
              // XLSX table viewer
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="xlsx-preview-table">
                  <tbody>
                    {previewContent.table_data.map((row, rowIndex) => (
                      <tr
                        key={rowIndex}
                        className={`border-b ${rowIndex === 0 ? 'font-semibold' : ''}`}
                        style={{ borderColor: 'var(--border-color)' }}
                      >
                        {row.map((cell, cellIndex) => (
                          <td
                            key={cellIndex}
                            className="py-2 px-3"
                            style={{
                              color: 'var(--text-primary)',
                              backgroundColor: rowIndex === 0 ? 'var(--bg-secondary)' : 'transparent',
                            }}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : previewContent?.content ? (
              // Text content viewer (DOCX, TXT)
              <div
                className="p-4 rounded border overflow-auto whitespace-pre-wrap font-mono text-sm"
                style={{
                  borderColor: 'var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  maxHeight: '60vh',
                }}
                data-testid="text-preview-content"
              >
                {previewContent.content}
              </div>
            ) : (
              <div className="text-center py-8">
                <p style={{ color: 'var(--text-secondary)' }}>Nincs megjeleníthető tartalom</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search Results Panel */}
      {searchResults.length > 0 && (
        <div className="rounded-lg border p-4" style={cardStyle} data-testid="search-results-panel">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <FileSearch size={18} />
              Keresési eredmények ({searchResults.length})
            </h2>
            <button
              onClick={clearSearchResults}
              className="flex items-center gap-1 px-3 py-1 rounded hover:bg-gray-500/10 transition-colors text-sm"
              style={{ color: 'var(--text-secondary)' }}
              data-testid="clear-search-results-btn"
            >
              <X size={16} />
              Bezárás
            </button>
          </div>

          <div className="space-y-4">
            {searchResults.map((result) => (
              <div
                key={result.id}
                className="p-4 rounded border"
                style={{ borderColor: 'var(--border-color)' }}
                data-testid={`search-result-${result.id}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getFileIcon(result.file_type)}
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {result.original_filename}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                      {result.match_count} találat
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleShowPreview(result)}
                      className="p-1 rounded hover:bg-gray-500/10 transition-colors"
                      title="Előnézet"
                    >
                      <Eye size={16} style={{ color: 'var(--text-secondary)' }} />
                    </button>
                    <button
                      onClick={() => handleDownload(result)}
                      className="p-1 rounded hover:bg-gray-500/10 transition-colors"
                      title="Letöltés"
                    >
                      <Download size={16} style={{ color: 'var(--accent)' }} />
                    </button>
                  </div>
                </div>

                {result.matches.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {result.matches.slice(0, 5).map((match, idx) => (
                      <div
                        key={idx}
                        className="text-sm p-2 rounded"
                        style={{ backgroundColor: 'var(--bg-secondary)' }}
                        data-testid={`search-match-${result.id}-${idx}`}
                      >
                        {match.line_number > 0 && (
                          <span className="text-xs mr-2" style={{ color: 'var(--text-secondary)' }}>
                            #{match.line_number}
                          </span>
                        )}
                        <span
                          style={{ color: 'var(--text-primary)' }}
                          dangerouslySetInnerHTML={{
                            __html: match.highlighted_text
                              .replace(/\*\*(.+?)\*\*/g, '<mark style="background-color: #fef08a; padding: 0 2px; border-radius: 2px;">$1</mark>')
                          }}
                        />
                      </div>
                    ))}
                    {result.matches.length > 5 && (
                      <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                        ... és még {result.matches.length - 5} további találat
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Documents;
