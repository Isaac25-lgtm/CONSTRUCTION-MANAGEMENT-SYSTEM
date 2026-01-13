import { useState } from 'react';
import { Send, Paperclip, Search } from 'lucide-react';
import { useDataStore } from '../stores/dataStore';
import toast from 'react-hot-toast';

export default function CommunicationPage() {
  const { messages, projects, addMessage } = useDataStore();
  const [newMessage, setNewMessage] = useState('');
  const [filterProject, setFilterProject] = useState<number | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMessages = messages.filter(m => {
    const projectMatch = filterProject === 'all' || m.projectId === filterProject;
    const searchMatch = !searchTerm || m.message.toLowerCase().includes(searchTerm.toLowerCase()) || m.sender.toLowerCase().includes(searchTerm.toLowerCase());
    return projectMatch && searchMatch;
  });

  const teamMembers = [
    { name: 'John Okello', role: 'Project Manager', status: 'online', avatar: 'JO' },
    { name: 'Sarah Nambi', role: 'Site Engineer', status: 'online', avatar: 'SN' },
    { name: 'Peter Wasswa', role: 'Project Manager', status: 'away', avatar: 'PW' },
    { name: 'Site Supervisor', role: 'Field Supervisor', status: 'online', avatar: 'SS' },
    { name: 'Finance Team', role: 'Accounts', status: 'offline', avatar: 'FT' },
  ];

  const announcements = [
    { id: 1, title: 'Site Safety Briefing', content: 'Mandatory safety briefing for all site workers on Monday 9 AM.', date: '2025-01-13' },
    { id: 2, title: 'Material Delivery Update', content: 'Steel delivery rescheduled to next week due to supplier delays.', date: '2025-01-12' },
  ];

  const handleSendMessage = () => {
    if (!newMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }
    addMessage({
      sender: 'You',
      message: newMessage,
      time: 'Just now',
      avatar: 'PM',
      projectId: filterProject === 'all' ? undefined : filterProject,
    });
    toast.success('Message sent!');
    setNewMessage('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Communication Hub</h1>
          <p className="text-gray-500 dark:text-gray-400">Team messaging and announcements</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Team Members Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Online Team */}
          <div className="bg-white dark:bg-dark-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-dark-700">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Team Members</h3>
            <div className="space-y-3">
              {teamMembers.map((member, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-dark-700 rounded-lg cursor-pointer">
                  <div className="relative">
                    <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-primary-700 dark:text-primary-400 font-semibold text-sm">
                      {member.avatar}
                    </div>
                    <span className={`absolute bottom-0 right-0 w-3 h-3 ${getStatusColor(member.status)} rounded-full border-2 border-white dark:border-dark-800`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{member.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Announcements */}
          <div className="bg-white dark:bg-dark-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-dark-700">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Announcements</h3>
            <div className="space-y-3">
              {announcements.map(ann => (
                <div key={ann.id} className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">{ann.title}</p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">{ann.content}</p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">{ann.date}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="lg:col-span-3 bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 flex flex-col h-[600px]">
          {/* Header */}
          <div className="p-4 border-b border-gray-100 dark:border-dark-700 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <select
                value={filterProject === 'all' ? 'all' : filterProject}
                onChange={(e) => setFilterProject(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100 text-sm"
              >
                <option value="all">All Projects</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100 text-sm w-48"
              />
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {filteredMessages.map(msg => (
              <div key={msg.id} className={`flex gap-3 ${msg.sender === 'You' ? 'flex-row-reverse' : ''}`}>
                <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-primary-700 dark:text-primary-400 font-semibold text-sm flex-shrink-0">
                  {msg.avatar}
                </div>
                <div className={`max-w-[70%] ${msg.sender === 'You' ? 'text-right' : ''}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 dark:text-gray-100">{msg.sender}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{msg.time}</span>
                  </div>
                  <div className={`p-3 rounded-lg ${
                    msg.sender === 'You' 
                      ? 'bg-primary-600 text-white' 
                      : 'bg-gray-100 dark:bg-dark-700 text-gray-900 dark:text-gray-100'
                  }`}>
                    {msg.message}
                  </div>
                </div>
              </div>
            ))}
            {filteredMessages.length === 0 && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                No messages yet. Start a conversation!
              </div>
            )}
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-gray-100 dark:border-dark-700">
            <div className="flex items-center gap-3">
              <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg">
                <Paperclip size={20} />
              </button>
              <input
                type="text"
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100"
              />
              <button 
                onClick={handleSendMessage}
                className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
