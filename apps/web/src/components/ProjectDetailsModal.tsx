import { useRef, useState } from 'react';
import {
    Download, MapPin, Calendar, Users, X,
    ClipboardList, AlertTriangle, FileText, DollarSign, MessageSquare, Flag,
    CheckCircle, Clock, AlertCircle
} from 'lucide-react';
import { useDataStore, Project } from '../stores/dataStore';
import StatusBadge from './ui/StatusBadge';
import ProgressBar from './ui/ProgressBar';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(amount);
};

const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' });
};

interface ProjectDetailsModalProps {
    project: Project;
    onClose: () => void;
}

type TabType = 'overview' | 'tasks' | 'risks' | 'documents' | 'budget' | 'communication' | 'milestones';

export default function ProjectDetailsModal({ project, onClose }: ProjectDetailsModalProps) {
    const { tasks, risks, documents, expenses, messages, milestones } = useDataStore();
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const contentRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);

    // Filter data for this project
    const projectTasks = tasks.filter(t => t.projectId === project.id);
    const projectRisks = risks.filter(r => r.projectId === project.id);
    const projectDocs = documents.filter(d => d.projectId === project.id);
    const projectExpenses = expenses.filter(e => e.projectId === project.id);
    const projectMessages = messages.filter(m => m.projectId === project.id);
    const projectMilestones = milestones.filter(m => m.projectId === project.id);

    // Calculate metrics
    const totalExpenses = projectExpenses.reduce((sum, e) => sum + e.amount, 0);
    const completedTasks = projectTasks.filter(t => t.status === 'Completed').length;
    const highRisks = projectRisks.filter(r => r.impact === 'High' || r.probability === 'High').length;
    const pendingExpenses = projectExpenses.filter(e => e.status === 'Pending').length;

    const tabs: { id: TabType; label: string; icon: React.ReactNode; count?: number }[] = [
        { id: 'overview', label: 'Overview', icon: <ClipboardList size={16} /> },
        { id: 'tasks', label: 'Tasks', icon: <CheckCircle size={16} />, count: projectTasks.length },
        { id: 'risks', label: 'Risks', icon: <AlertTriangle size={16} />, count: projectRisks.length },
        { id: 'documents', label: 'Documents', icon: <FileText size={16} />, count: projectDocs.length },
        { id: 'budget', label: 'Budget', icon: <DollarSign size={16} />, count: projectExpenses.length },
        { id: 'communication', label: 'Messages', icon: <MessageSquare size={16} />, count: projectMessages.length },
        { id: 'milestones', label: 'Milestones', icon: <Flag size={16} />, count: projectMilestones.length },
    ];

    const handleExportPDF = async () => {
        setIsExporting(true);
        toast.loading('Generating PDF Report...', { id: 'pdf-export' });

        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 15;
            const contentWidth = pageWidth - (margin * 2);
            let y = margin;

            // Helper functions
            const addNewPageIfNeeded = (requiredSpace: number) => {
                if (y + requiredSpace > pageHeight - margin) {
                    pdf.addPage();
                    y = margin;
                    return true;
                }
                return false;
            };

            const drawColoredBox = (x: number, yPos: number, w: number, h: number, color: [number, number, number]) => {
                pdf.setFillColor(color[0], color[1], color[2]);
                pdf.roundedRect(x, yPos, w, h, 2, 2, 'F');
            };

            const getStatusColor = (status: string): [number, number, number] => {
                switch (status) {
                    case 'Completed': return [34, 197, 94];
                    case 'In Progress': return [59, 130, 246];
                    case 'Planning': return [168, 85, 247];
                    case 'On Hold': return [234, 179, 8];
                    case 'High': case 'Critical': return [239, 68, 68];
                    case 'Medium': return [234, 179, 8];
                    case 'Low': return [34, 197, 94];
                    case 'Active': return [239, 68, 68];
                    case 'Approved': return [34, 197, 94];
                    case 'Pending': return [234, 179, 8];
                    case 'On Track': return [59, 130, 246];
                    default: return [107, 114, 128];
                }
            };

            // ========== HEADER ==========
            // Blue header background
            pdf.setFillColor(37, 99, 235);
            pdf.rect(0, 0, pageWidth, 45, 'F');

            // BuildPro logo text
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            pdf.text('BUILDPRO', margin, 12);

            // Project name
            pdf.setFontSize(22);
            pdf.setFont('helvetica', 'bold');
            pdf.text(project.name, margin, 28);

            // Location
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            pdf.text(`📍 ${project.location || 'No location specified'}`, margin, 38);

            // Status and Priority badges (top right)
            const statusColor = getStatusColor(project.status);
            const priorityColor = getStatusColor(project.priority);

            pdf.setFillColor(255, 255, 255);
            pdf.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
            pdf.roundedRect(pageWidth - margin - 55, 20, 25, 8, 2, 2, 'F');
            pdf.setFontSize(8);
            pdf.text(project.status, pageWidth - margin - 52, 25);

            pdf.roundedRect(pageWidth - margin - 28, 20, 25, 8, 2, 2, 'F');
            pdf.setTextColor(priorityColor[0], priorityColor[1], priorityColor[2]);
            pdf.text(project.priority, pageWidth - margin - 25, 25);

            // Report date
            pdf.setTextColor(200, 200, 255);
            pdf.setFontSize(8);
            pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - margin - 45, 38);

            y = 55;

            // ========== PROJECT OVERVIEW ==========
            pdf.setTextColor(30, 41, 59);
            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'bold');
            pdf.text('PROJECT OVERVIEW', margin, y);
            y += 10;

            // Info grid
            const boxWidth = (contentWidth - 10) / 2;
            const infoBoxHeight = 35;

            // Left box - Project Info
            drawColoredBox(margin, y, boxWidth, infoBoxHeight, [248, 250, 252]);
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(30, 41, 59);
            pdf.text('Project Information', margin + 5, y + 8);

            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(9);
            pdf.setTextColor(100, 116, 139);
            pdf.text(`Manager: ${project.manager}`, margin + 5, y + 16);
            pdf.text(`Start: ${formatDate(project.startDate)}`, margin + 5, y + 23);
            pdf.text(`End: ${formatDate(project.endDate)}`, margin + 5, y + 30);

            // Right box - Budget Info
            drawColoredBox(margin + boxWidth + 10, y, boxWidth, infoBoxHeight, [248, 250, 252]);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(30, 41, 59);
            pdf.text('Budget Overview', margin + boxWidth + 15, y + 8);

            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(100, 116, 139);
            pdf.text(`Total: ${formatCurrency(project.budget)}`, margin + boxWidth + 15, y + 16);
            pdf.setTextColor(234, 88, 12);
            pdf.text(`Spent: ${formatCurrency(project.spent)}`, margin + boxWidth + 15, y + 23);
            pdf.setTextColor(34, 197, 94);
            pdf.text(`Remaining: ${formatCurrency(project.budget - project.spent)}`, margin + boxWidth + 15, y + 30);

            y += infoBoxHeight + 10;

            // Progress bar
            pdf.setTextColor(30, 41, 59);
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'bold');
            pdf.text(`Overall Progress: ${project.progress}%`, margin, y);
            y += 5;

            // Progress bar background
            pdf.setFillColor(226, 232, 240);
            pdf.roundedRect(margin, y, contentWidth, 6, 2, 2, 'F');
            // Progress bar fill
            const progressColor = project.progress >= 70 ? [34, 197, 94] : project.progress >= 40 ? [59, 130, 246] : [234, 179, 8];
            pdf.setFillColor(progressColor[0], progressColor[1], progressColor[2]);
            pdf.roundedRect(margin, y, (contentWidth * project.progress) / 100, 6, 2, 2, 'F');

            y += 15;

            // Description
            if (project.description) {
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(9);
                pdf.setTextColor(100, 116, 139);
                const descLines = pdf.splitTextToSize(project.description, contentWidth);
                pdf.text(descLines, margin, y);
                y += descLines.length * 5 + 10;
            }

            // ========== TASKS SECTION ==========
            addNewPageIfNeeded(15);
            pdf.setFillColor(59, 130, 246);
            pdf.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'bold');
            pdf.text(`TASKS (${projectTasks.length})`, margin + 5, y + 6);
            y += 15;

            if (projectTasks.length > 0) {
                projectTasks.forEach((task, index) => {
                    addNewPageIfNeeded(20);
                    const taskColor = getStatusColor(task.status);

                    // Task status indicator
                    pdf.setFillColor(taskColor[0], taskColor[1], taskColor[2]);
                    pdf.circle(margin + 3, y + 2, 2, 'F');

                    pdf.setTextColor(30, 41, 59);
                    pdf.setFontSize(10);
                    pdf.setFont('helvetica', 'bold');
                    pdf.text(task.name, margin + 10, y + 3);

                    pdf.setFont('helvetica', 'normal');
                    pdf.setFontSize(8);
                    pdf.setTextColor(100, 116, 139);
                    pdf.text(`Assigned: ${task.assignee} | Due: ${formatDate(task.dueDate)} | Progress: ${task.progress}%`, margin + 10, y + 9);

                    // Mini progress bar
                    pdf.setFillColor(226, 232, 240);
                    pdf.roundedRect(margin + 10, y + 11, 50, 3, 1, 1, 'F');
                    pdf.setFillColor(taskColor[0], taskColor[1], taskColor[2]);
                    pdf.roundedRect(margin + 10, y + 11, (50 * task.progress) / 100, 3, 1, 1, 'F');

                    y += 20;
                });
            } else {
                pdf.setTextColor(100, 116, 139);
                pdf.setFontSize(9);
                pdf.text('No tasks added yet', margin, y);
                y += 10;
            }

            y += 5;

            // ========== RISKS SECTION ==========
            addNewPageIfNeeded(15);
            pdf.setFillColor(239, 68, 68);
            pdf.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'bold');
            pdf.text(`RISKS (${projectRisks.length})`, margin + 5, y + 6);
            y += 15;

            if (projectRisks.length > 0) {
                projectRisks.forEach((risk, index) => {
                    addNewPageIfNeeded(25);

                    pdf.setTextColor(30, 41, 59);
                    pdf.setFontSize(10);
                    pdf.setFont('helvetica', 'bold');
                    pdf.text(risk.description, margin, y);

                    // Risk badges
                    const probColor = getStatusColor(risk.probability);
                    const impactColor = getStatusColor(risk.impact);

                    pdf.setFontSize(7);
                    pdf.setFont('helvetica', 'normal');

                    // Probability badge
                    pdf.setFillColor(probColor[0], probColor[1], probColor[2]);
                    pdf.roundedRect(margin, y + 4, 25, 5, 1, 1, 'F');
                    pdf.setTextColor(255, 255, 255);
                    pdf.text(`Prob: ${risk.probability}`, margin + 2, y + 7.5);

                    // Impact badge
                    pdf.setFillColor(impactColor[0], impactColor[1], impactColor[2]);
                    pdf.roundedRect(margin + 28, y + 4, 25, 5, 1, 1, 'F');
                    pdf.text(`Impact: ${risk.impact}`, margin + 30, y + 7.5);

                    pdf.setTextColor(100, 116, 139);
                    pdf.setFontSize(8);
                    pdf.text(`Owner: ${risk.owner} | Mitigation: ${risk.mitigation.substring(0, 60)}...`, margin, y + 14);

                    y += 22;
                });
            } else {
                pdf.setTextColor(100, 116, 139);
                pdf.setFontSize(9);
                pdf.text('No risks identified', margin, y);
                y += 10;
            }

            y += 5;

            // ========== DOCUMENTS SECTION ==========
            addNewPageIfNeeded(15);
            pdf.setFillColor(168, 85, 247);
            pdf.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'bold');
            pdf.text(`DOCUMENTS (${projectDocs.length})`, margin + 5, y + 6);
            y += 15;

            if (projectDocs.length > 0) {
                projectDocs.forEach((doc, index) => {
                    addNewPageIfNeeded(15);

                    pdf.setTextColor(30, 41, 59);
                    pdf.setFontSize(9);
                    pdf.setFont('helvetica', 'bold');
                    pdf.text(`📄 ${doc.name}`, margin, y);

                    pdf.setFont('helvetica', 'normal');
                    pdf.setTextColor(100, 116, 139);
                    pdf.setFontSize(8);
                    pdf.text(`${doc.type} | ${doc.size} | Uploaded by ${doc.uploadedBy} on ${doc.date}`, margin, y + 5);

                    y += 12;
                });
            } else {
                pdf.setTextColor(100, 116, 139);
                pdf.setFontSize(9);
                pdf.text('No documents uploaded', margin, y);
                y += 10;
            }

            y += 5;

            // ========== EXPENSES SECTION ==========
            addNewPageIfNeeded(15);
            pdf.setFillColor(34, 197, 94);
            pdf.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'bold');
            pdf.text(`EXPENSES (${projectExpenses.length}) - Total: ${formatCurrency(totalExpenses)}`, margin + 5, y + 6);
            y += 15;

            if (projectExpenses.length > 0) {
                projectExpenses.forEach((expense, index) => {
                    addNewPageIfNeeded(15);

                    pdf.setTextColor(30, 41, 59);
                    pdf.setFontSize(9);
                    pdf.setFont('helvetica', 'bold');
                    pdf.text(expense.description, margin, y);

                    // Amount on the right
                    pdf.setTextColor(34, 197, 94);
                    pdf.text(formatCurrency(expense.amount), pageWidth - margin - 30, y);

                    pdf.setFont('helvetica', 'normal');
                    pdf.setTextColor(100, 116, 139);
                    pdf.setFontSize(8);
                    pdf.text(`${expense.category} | ${expense.vendor} | ${expense.date} | Status: ${expense.status}`, margin, y + 5);

                    y += 12;
                });
            } else {
                pdf.setTextColor(100, 116, 139);
                pdf.setFontSize(9);
                pdf.text('No expenses recorded', margin, y);
                y += 10;
            }

            y += 5;

            // ========== MILESTONES SECTION ==========
            addNewPageIfNeeded(15);
            pdf.setFillColor(234, 179, 8);
            pdf.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'bold');
            pdf.text(`MILESTONES (${projectMilestones.length})`, margin + 5, y + 6);
            y += 15;

            if (projectMilestones.length > 0) {
                projectMilestones.forEach((milestone, index) => {
                    addNewPageIfNeeded(15);
                    const msColor = getStatusColor(milestone.status);

                    pdf.setFillColor(msColor[0], msColor[1], msColor[2]);
                    pdf.circle(margin + 3, y + 2, 3, 'F');

                    pdf.setTextColor(30, 41, 59);
                    pdf.setFontSize(10);
                    pdf.setFont('helvetica', 'bold');
                    pdf.text(milestone.name, margin + 10, y + 3);

                    pdf.setFont('helvetica', 'normal');
                    pdf.setFontSize(8);
                    pdf.setTextColor(100, 116, 139);
                    pdf.text(`📅 ${formatDate(milestone.date)} | Status: ${milestone.status}`, margin + 10, y + 9);

                    y += 15;
                });
            } else {
                pdf.setTextColor(100, 116, 139);
                pdf.setFontSize(9);
                pdf.text('No milestones defined', margin, y);
                y += 10;
            }

            // ========== FOOTER ==========
            const totalPages = pdf.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                pdf.setPage(i);
                pdf.setFillColor(248, 250, 252);
                pdf.rect(0, pageHeight - 12, pageWidth, 12, 'F');
                pdf.setTextColor(100, 116, 139);
                pdf.setFontSize(8);
                pdf.text(`BuildPro - Construction Project Management | Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
            }

            // Save the PDF
            pdf.save(`${project.name.replace(/\s+/g, '_')}_Project_Report.pdf`);
            toast.success('PDF Report downloaded!', { id: 'pdf-export' });
        } catch (error) {
            console.error('PDF Export error:', error);
            toast.error('Failed to generate PDF', { id: 'pdf-export' });
        } finally {
            setIsExporting(false);
        }
    };

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'High': return 'text-red-500 bg-red-500/10';
            case 'Medium': return 'text-yellow-500 bg-yellow-500/10';
            case 'Low': return 'text-green-500 bg-green-500/10';
            default: return 'text-gray-500 bg-gray-500/10';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="relative w-full max-w-6xl max-h-[90vh] bg-white dark:bg-dark-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-dark-700 bg-gradient-to-r from-primary-600 to-primary-700">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <ClipboardList className="text-white" size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">{project.name}</h2>
                            <p className="text-primary-100 flex items-center gap-2">
                                <MapPin size={14} /> {project.location || 'No location'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExportPDF}
                            disabled={isExporting}
                            className="flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition disabled:opacity-50"
                        >
                            <Download size={18} />
                            {isExporting ? 'Exporting...' : 'Download Report'}
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 p-2 bg-gray-50 dark:bg-dark-900 border-b border-gray-200 dark:border-dark-700 overflow-x-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${activeTab === tab.id
                                ? 'bg-primary-600 text-white'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-700'
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                            {tab.count !== undefined && tab.count > 0 && (
                                <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id ? 'bg-white/20' : 'bg-gray-200 dark:bg-dark-600'
                                    }`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div ref={contentRef} className="flex-1 overflow-y-auto p-6 bg-white dark:bg-dark-800">
                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            {/* Status Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-xl border border-blue-500/20">
                                    <div className="flex items-center gap-2 text-blue-500 mb-2">
                                        <CheckCircle size={18} />
                                        <span className="text-sm font-medium">Tasks</span>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{completedTasks}/{projectTasks.length}</p>
                                    <p className="text-sm text-gray-500">Completed</p>
                                </div>
                                <div className="p-4 bg-gradient-to-br from-red-500/10 to-red-600/5 rounded-xl border border-red-500/20">
                                    <div className="flex items-center gap-2 text-red-500 mb-2">
                                        <AlertTriangle size={18} />
                                        <span className="text-sm font-medium">Risks</span>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{highRisks}</p>
                                    <p className="text-sm text-gray-500">High Priority</p>
                                </div>
                                <div className="p-4 bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-xl border border-green-500/20">
                                    <div className="flex items-center gap-2 text-green-500 mb-2">
                                        <DollarSign size={18} />
                                        <span className="text-sm font-medium">Budget Used</span>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{Math.round(project.spent / project.budget * 100)}%</p>
                                    <p className="text-sm text-gray-500">{formatCurrency(project.spent)}</p>
                                </div>
                                <div className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-xl border border-purple-500/20">
                                    <div className="flex items-center gap-2 text-purple-500 mb-2">
                                        <FileText size={18} />
                                        <span className="text-sm font-medium">Documents</span>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{projectDocs.length}</p>
                                    <p className="text-sm text-gray-500">Uploaded</p>
                                </div>
                            </div>

                            {/* Project Details */}
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="p-5 bg-gray-50 dark:bg-dark-700 rounded-xl">
                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Project Information</h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Status</span>
                                            <StatusBadge status={project.status} />
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Priority</span>
                                            <StatusBadge status={project.priority} />
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Manager</span>
                                            <span className="text-gray-900 dark:text-white font-medium">{project.manager}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Start Date</span>
                                            <span className="text-gray-900 dark:text-white">{formatDate(project.startDate)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">End Date</span>
                                            <span className="text-gray-900 dark:text-white">{formatDate(project.endDate)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-5 bg-gray-50 dark:bg-dark-700 rounded-xl">
                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Budget Overview</h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Total Budget</span>
                                            <span className="text-gray-900 dark:text-white font-bold">{formatCurrency(project.budget)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Amount Spent</span>
                                            <span className="text-orange-500 font-medium">{formatCurrency(project.spent)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Remaining</span>
                                            <span className="text-green-500 font-medium">{formatCurrency(project.budget - project.spent)}</span>
                                        </div>
                                        <div className="pt-3">
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-gray-500">Budget Progress</span>
                                                <span className="text-gray-900 dark:text-white">{Math.round(project.spent / project.budget * 100)}%</span>
                                            </div>
                                            <ProgressBar progress={Math.round(project.spent / project.budget * 100)} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Progress */}
                            <div className="p-5 bg-gray-50 dark:bg-dark-700 rounded-xl">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="font-semibold text-gray-900 dark:text-white">Overall Progress</h3>
                                    <span className="text-2xl font-bold text-primary-600">{project.progress}%</span>
                                </div>
                                <ProgressBar progress={project.progress} />
                                {project.description && (
                                    <p className="mt-4 text-gray-600 dark:text-gray-400">{project.description}</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Tasks Tab */}
                    {activeTab === 'tasks' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Project Tasks ({projectTasks.length})
                                </h3>
                                <div className="flex gap-2 text-sm">
                                    <span className="px-3 py-1 bg-green-500/10 text-green-500 rounded-full">
                                        {completedTasks} Completed
                                    </span>
                                    <span className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full">
                                        {projectTasks.filter(t => t.status === 'In Progress').length} In Progress
                                    </span>
                                </div>
                            </div>
                            {projectTasks.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 dark:bg-dark-700 rounded-xl">
                                    <ClipboardList className="mx-auto text-gray-400 mb-3" size={40} />
                                    <p className="text-gray-500">No tasks added to this project yet</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {projectTasks.map(task => (
                                        <div key={task.id} className="p-4 bg-gray-50 dark:bg-dark-700 rounded-xl border border-gray-200 dark:border-dark-600">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-3">
                                                    <div className={`mt-1 w-3 h-3 rounded-full ${task.status === 'Completed' ? 'bg-green-500' :
                                                        task.status === 'In Progress' ? 'bg-blue-500' : 'bg-gray-400'
                                                        }`} />
                                                    <div>
                                                        <h4 className="font-medium text-gray-900 dark:text-white">{task.name}</h4>
                                                        <p className="text-sm text-gray-500">Assigned to: {task.assignee}</p>
                                                        {task.description && (
                                                            <p className="text-sm text-gray-400 mt-1">{task.description}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="text-right">
                                                        <StatusBadge status={task.status} />
                                                        <p className="text-xs text-gray-500 mt-1">Due: {formatDate(task.dueDate)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-3 flex items-center gap-3">
                                                <div className="flex-1">
                                                    <ProgressBar progress={task.progress} />
                                                </div>
                                                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{task.progress}%</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Risks Tab */}
                    {activeTab === 'risks' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Risk Register ({projectRisks.length})
                                </h3>
                                <div className="flex gap-2 text-sm">
                                    <span className="px-3 py-1 bg-red-500/10 text-red-500 rounded-full">
                                        {projectRisks.filter(r => r.status === 'Active').length} Active
                                    </span>
                                </div>
                            </div>
                            {projectRisks.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 dark:bg-dark-700 rounded-xl">
                                    <AlertTriangle className="mx-auto text-gray-400 mb-3" size={40} />
                                    <p className="text-gray-500">No risks identified for this project</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {projectRisks.map(risk => (
                                        <div key={risk.id} className="p-4 bg-gray-50 dark:bg-dark-700 rounded-xl border border-gray-200 dark:border-dark-600">
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <h4 className="font-medium text-gray-900 dark:text-white">{risk.description}</h4>
                                                    <p className="text-sm text-gray-500 mt-1">Owner: {risk.owner}</p>
                                                </div>
                                                <StatusBadge status={risk.status} />
                                            </div>
                                            <div className="flex gap-4 mb-3">
                                                <div className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(risk.probability)}`}>
                                                    Probability: {risk.probability}
                                                </div>
                                                <div className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(risk.impact)}`}>
                                                    Impact: {risk.impact}
                                                </div>
                                            </div>
                                            <div className="p-3 bg-white dark:bg-dark-600 rounded-lg">
                                                <p className="text-sm text-gray-500 mb-1">Mitigation Strategy:</p>
                                                <p className="text-sm text-gray-700 dark:text-gray-300">{risk.mitigation}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Documents Tab */}
                    {activeTab === 'documents' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                Project Documents ({projectDocs.length})
                            </h3>
                            {projectDocs.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 dark:bg-dark-700 rounded-xl">
                                    <FileText className="mx-auto text-gray-400 mb-3" size={40} />
                                    <p className="text-gray-500">No documents uploaded yet</p>
                                </div>
                            ) : (
                                <div className="grid md:grid-cols-2 gap-4">
                                    {projectDocs.map(doc => (
                                        <div key={doc.id} className="p-4 bg-gray-50 dark:bg-dark-700 rounded-xl border border-gray-200 dark:border-dark-600 flex items-center gap-4">
                                            <div className="w-12 h-12 bg-primary-500/10 rounded-xl flex items-center justify-center">
                                                <FileText className="text-primary-500" size={24} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-medium text-gray-900 dark:text-white truncate">{doc.name}</h4>
                                                <p className="text-sm text-gray-500">{doc.type} • {doc.size}</p>
                                                <p className="text-xs text-gray-400">Uploaded by {doc.uploadedBy} on {doc.date}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Budget Tab */}
                    {activeTab === 'budget' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Expenses ({projectExpenses.length})
                                </h3>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalExpenses)}</p>
                                    <p className="text-sm text-gray-500">Total Expenses</p>
                                </div>
                            </div>
                            {projectExpenses.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 dark:bg-dark-700 rounded-xl">
                                    <DollarSign className="mx-auto text-gray-400 mb-3" size={40} />
                                    <p className="text-gray-500">No expenses recorded yet</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {projectExpenses.map(expense => (
                                        <div key={expense.id} className="p-4 bg-gray-50 dark:bg-dark-700 rounded-xl border border-gray-200 dark:border-dark-600">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h4 className="font-medium text-gray-900 dark:text-white">{expense.description}</h4>
                                                    <p className="text-sm text-gray-500">{expense.category} • {expense.vendor}</p>
                                                    <p className="text-xs text-gray-400">{expense.date} • Logged by {expense.loggedBy}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(expense.amount)}</p>
                                                    <StatusBadge status={expense.status} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Communication Tab */}
                    {activeTab === 'communication' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                Project Messages ({projectMessages.length})
                            </h3>
                            {projectMessages.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 dark:bg-dark-700 rounded-xl">
                                    <MessageSquare className="mx-auto text-gray-400 mb-3" size={40} />
                                    <p className="text-gray-500">No messages in this project</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {projectMessages.map(msg => (
                                        <div key={msg.id} className="flex gap-4 p-4 bg-gray-50 dark:bg-dark-700 rounded-xl">
                                            <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                                {msg.avatar}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-medium text-gray-900 dark:text-white">{msg.sender}</span>
                                                    <span className="text-xs text-gray-500">{msg.time}</span>
                                                </div>
                                                <p className="text-gray-600 dark:text-gray-400">{msg.message}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Milestones Tab */}
                    {activeTab === 'milestones' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                Project Milestones ({projectMilestones.length})
                            </h3>
                            {projectMilestones.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 dark:bg-dark-700 rounded-xl">
                                    <Flag className="mx-auto text-gray-400 mb-3" size={40} />
                                    <p className="text-gray-500">No milestones defined yet</p>
                                </div>
                            ) : (
                                <div className="relative">
                                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-dark-600" />
                                    <div className="space-y-6">
                                        {projectMilestones.map((milestone, index) => (
                                            <div key={milestone.id} className="relative flex items-start gap-4 pl-12">
                                                <div className={`absolute left-4 w-5 h-5 rounded-full border-4 ${milestone.status === 'Completed' ? 'bg-green-500 border-green-200' :
                                                    milestone.status === 'On Track' ? 'bg-blue-500 border-blue-200' :
                                                        'bg-gray-400 border-gray-200'
                                                    }`} />
                                                <div className="flex-1 p-4 bg-gray-50 dark:bg-dark-700 rounded-xl">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="font-medium text-gray-900 dark:text-white">{milestone.name}</h4>
                                                        <StatusBadge status={milestone.status} />
                                                    </div>
                                                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                                                        <Calendar size={14} /> {formatDate(milestone.date)}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
