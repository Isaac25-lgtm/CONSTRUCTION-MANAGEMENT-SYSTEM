import { useState } from 'react';
import { Upload, Download, Trash2, FileText, Image, File, Filter } from 'lucide-react';
import { useDataStore } from '../stores/dataStore';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';

export default function DocumentsPage() {
  const { documents, projects, addDocument, deleteDocument } = useDataStore();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterProject, setFilterProject] = useState<number | 'all'>('all');

  const [formData, setFormData] = useState({
    name: '',
    type: 'Report',
    projectId: '',
    uploadedBy: '',
    size: '',
  });

  const filteredDocs = documents.filter(d => {
    const typeMatch = filterType === 'all' || d.type === filterType;
    const projectMatch = filterProject === 'all' || d.projectId === filterProject;
    return typeMatch && projectMatch;
  });

  const handleUpload = () => {
    if (!formData.name || !formData.projectId || !formData.uploadedBy) {
      toast.error('Please fill in all required fields');
      return;
    }
    const project = projects.find(p => p.id === parseInt(formData.projectId));
    addDocument({
      name: formData.name,
      type: formData.type,
      projectId: parseInt(formData.projectId),
      project: project?.name || '',
      uploadedBy: formData.uploadedBy,
      date: new Date().toISOString().split('T')[0],
      size: formData.size || '1.0 MB',
    });
    toast.success('Document uploaded successfully!');
    setShowUploadModal(false);
    resetForm();
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this document?')) {
      deleteDocument(id);
      toast.success('Document deleted');
    }
  };

  const handleDownload = (name: string) => {
    toast.success(`Downloading ${name}...`);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'Report',
      projectId: '',
      uploadedBy: '',
      size: '',
    });
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
            className={`p-3 rounded-lg border text-center font-medium transition ${
              (type === 'All Files' && filterType === 'all') || filterType === type
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
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 overflow-hidden">
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
                <tr key={doc.id} className="border-t border-gray-100 dark:border-dark-700 hover:bg-gray-50 dark:hover:bg-dark-700">
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
                        onClick={() => handleDownload(doc.name)}
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
          <div className="border-2 border-dashed border-gray-300 dark:border-dark-600 rounded-lg p-8 text-center">
            <Upload className="mx-auto text-gray-400 mb-3" size={40} />
            <p className="text-gray-600 dark:text-gray-400 mb-2">Drag and drop files here, or click to browse</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">Supports: PDF, DOC, DWG, JPG, PNG, ZIP (Max 50MB)</p>
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
