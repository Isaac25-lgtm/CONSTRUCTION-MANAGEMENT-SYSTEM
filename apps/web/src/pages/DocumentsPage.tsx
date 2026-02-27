import { useState, useRef } from 'react';
import { Upload, Download, Trash2, FileText, Image, File, Filter } from 'lucide-react';
import { useDataStore } from '../stores/dataStore';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';

export default function DocumentsPage() {
  const { documents, projects, addDocument, deleteDocument } = useDataStore();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterProject, setFilterProject] = useState<number | 'all'>('all');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'Report',
    projectId: '',
    uploadedBy: '',
    size: '',
    fileData: '', // Base64 encoded file data
    mimeType: '', // MIME type of the file
  });

  const filteredDocs = documents.filter(d => {
    const typeMatch = filterType === 'all' || d.type === filterType;
    const projectMatch = filterProject === 'all' || d.projectId === filterProject;
    return typeMatch && projectMatch;
  });

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<{ data: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Extract base64 data (remove data:mime;base64, prefix)
        const base64Data = result.split(',')[1];
        resolve({ data: base64Data, mimeType: file.type });
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleUpload = async () => {
    if (!selectedFile && !formData.name) {
      toast.error('Please select a file or enter a file name');
      return;
    }
    if (!formData.projectId) {
      toast.error('Please select a project');
      return;
    }
    if (!formData.uploadedBy) {
      toast.error('Please enter your name');
      return;
    }

    setIsUploading(true);

    try {
      const fileName = selectedFile ? selectedFile.name : formData.name;
      const fileSize = selectedFile
        ? (selectedFile.size / (1024 * 1024)).toFixed(1) + ' MB'
        : formData.size || '1.0 MB';

      let fileData = '';
      let mimeType = '';

      // Convert file to base64 if selected
      if (selectedFile) {
        const result = await fileToBase64(selectedFile);
        fileData = result.data;
        mimeType = result.mimeType;
      }

      const project = projects.find(p => p.id === parseInt(formData.projectId));
      addDocument({
        name: fileName,
        type: formData.type,
        projectId: parseInt(formData.projectId),
        project: project?.name || '',
        uploadedBy: formData.uploadedBy,
        date: new Date().toISOString().split('T')[0],
        size: fileSize,
        fileData,
        mimeType,
      });
      toast.success('Document uploaded successfully!');
      setShowUploadModal(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to upload document');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setFormData({ ...formData, name: file.name });

    // Auto-detect document type based on extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'dwg' || ext === 'dxf') {
      setFormData(prev => ({ ...prev, name: file.name, type: 'Drawing' }));
    } else if (ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'gif') {
      setFormData(prev => ({ ...prev, name: file.name, type: 'Photos' }));
    } else if (ext === 'pdf' || ext === 'doc' || ext === 'docx') {
      setFormData(prev => ({ ...prev, name: file.name, type: 'Report' }));
    } else {
      setFormData(prev => ({ ...prev, name: file.name }));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this document?')) {
      deleteDocument(id);
      toast.success('Document deleted');
    }
  };

  const handleDownload = (doc: typeof documents[0]) => {
    // If document has fileData (base64), create and download it
    if (doc.fileData && doc.mimeType) {
      try {
        // Decode base64 to binary
        const byteCharacters = atob(doc.fileData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: doc.mimeType });

        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = doc.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success(`Downloaded: ${doc.name}`);
      } catch (error) {
        console.error('Download error:', error);
        toast.error('Failed to download file');
      }
    } else {
      // For demo documents without actual file data, create a placeholder text file
      const placeholderContent = `BuildPro Document Placeholder\n\n` +
        `Document: ${doc.name}\n` +
        `Type: ${doc.type}\n` +
        `Project: ${doc.project}\n` +
        `Uploaded By: ${doc.uploadedBy}\n` +
        `Date: ${doc.date}\n` +
        `Size: ${doc.size}\n\n` +
        `This is a placeholder file. In production, the actual document content would be stored and retrieved from a backend server.`;

      const blob = new Blob([placeholderContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // Replace original extension with .txt for demo files
      const demoFileName = doc.name.replace(/\.[^/.]+$/, '') + '_placeholder.txt';
      link.download = demoFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Downloaded placeholder for: ${doc.name}`);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'Report',
      projectId: '',
      uploadedBy: '',
      size: '',
      fileData: '',
      mimeType: '',
    });
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'Drawing':
        return <FileText className="text-blue-500" size={20} />;
      case 'Photos':
        return <Image className="text-green-500" size={20} />;
      default:
        return <File className="text-gray-500" size={20} />;
    }
  };

  const docTypes = ['All Files', 'Drawing', 'Report', 'Photos', 'Contract', 'Permit'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Document Management</h1>
          <p className="text-gray-500 dark:text-gray-400">Centralized project documentation</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
        >
          <Upload size={18} /> Upload Document
        </button>
      </div>

      {/* Type Filters */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        {docTypes.map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type === 'All Files' ? 'all' : type)}
            className={`p-3 rounded-lg border text-center font-medium transition ${(type === 'All Files' && filterType === 'all') || filterType === type
              ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-400'
              : 'bg-white dark:bg-dark-800 border-gray-200 dark:border-dark-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-700'
              }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Project Filter */}
      <div className="flex items-center gap-4">
        <Filter size={18} className="text-gray-400" />
        <select
          value={filterProject === 'all' ? 'all' : filterProject}
          onChange={(e) => setFilterProject(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
          className="px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100"
        >
          <option value="all">All Projects</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <span className="text-sm text-gray-500 dark:text-gray-400">{filteredDocs.length} documents</span>
      </div>

      {/* Documents Table */}
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-dark-700">
              <tr>
                <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">File Name</th>
                <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">Type</th>
                <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">Project</th>
                <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">Uploaded By</th>
                <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">Date</th>
                <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">Size</th>
                <th className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map(doc => (
                <tr key={doc.id} className="border-t border-gray-200 dark:border-dark-700 hover:bg-gray-50 dark:hover:bg-dark-700">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {getFileIcon(doc.type)}
                      <span className="font-medium text-gray-900 dark:text-gray-100">{doc.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-gray-600 dark:text-gray-400">{doc.type}</td>
                  <td className="p-4 text-gray-600 dark:text-gray-400">{doc.project}</td>
                  <td className="p-4 text-gray-600 dark:text-gray-400">{doc.uploadedBy}</td>
                  <td className="p-4 text-gray-600 dark:text-gray-400">{doc.date}</td>
                  <td className="p-4 text-gray-600 dark:text-gray-400">{doc.size}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDownload(doc)}
                        className="p-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition"
                        title="Download"
                      >
                        <Download size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-dark-600 rounded-lg"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredDocs.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No documents found
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <Modal isOpen={showUploadModal} onClose={() => { setShowUploadModal(false); resetForm(); }} title="Upload Document" size="md">
        <div className="space-y-4">
          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              const files = e.target.files;
              if (files && files.length > 0) {
                handleFileSelect(files[0]);
              }
            }}
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.dwg,.dxf,.jpg,.jpeg,.png,.gif,.zip,.rar"
          />

          {/* Drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragging
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : selectedFile
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                : 'border-gray-300 dark:border-dark-600 hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-dark-700'
              }`}
          >
            {selectedFile ? (
              <>
                <FileText className="mx-auto text-green-500 mb-3" size={40} />
                <p className="text-green-700 dark:text-green-400 font-medium mb-1">{selectedFile.name}</p>
                <p className="text-sm text-green-600 dark:text-green-500">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB - Click to change file
                </p>
              </>
            ) : (
              <>
                <Upload className={`mx-auto mb-3 ${isDragging ? 'text-primary-500' : 'text-gray-400'}`} size={40} />
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  {isDragging ? 'Drop your file here!' : 'Drag and drop files here, or click to browse'}
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500">Supports: PDF, DOC, DWG, JPG, PNG, ZIP (Max 50MB)</p>
              </>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">File Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              placeholder="document_name.pdf"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Document Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              >
                <option value="Report">Report</option>
                <option value="Drawing">Drawing</option>
                <option value="Photos">Photos</option>
                <option value="Contract">Contract</option>
                <option value="Permit">Permit</option>
                <option value="Specification">Specification</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project *</label>
              <select
                value={formData.projectId}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Select project</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Uploaded By *</label>
            <input
              type="text"
              value={formData.uploadedBy}
              onChange={(e) => setFormData({ ...formData, uploadedBy: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              placeholder="Your name"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-dark-700">
            <button onClick={() => { setShowUploadModal(false); resetForm(); }} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg">
              Cancel
            </button>
            <button onClick={handleUpload} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
              Upload
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
