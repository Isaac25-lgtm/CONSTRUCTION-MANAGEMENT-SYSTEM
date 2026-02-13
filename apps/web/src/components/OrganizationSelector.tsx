import { useAuthStore } from '../stores/authStore';
import { Building2, ChevronDown, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function OrganizationSelector() {
    const { user, selectedOrgId, setSelectedOrg } = useAuthStore();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const organizations = user?.organizations || [];
    const selectedOrg = organizations.find(org => org.organization_id === selectedOrgId);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!user || organizations.length === 0) {
        return null;
    }

    // Don't show selector if user only has one organization
    if (organizations.length === 1) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg border border-slate-700">
                <Building2 size={18} className="text-primary-400" />
                <span className="text-sm text-slate-300">{selectedOrg?.organization_name}</span>
            </div>
        );
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg border border-slate-700 hover:border-slate-600 transition"
            >
                <Building2 size={18} className="text-primary-400" />
                <span className="text-sm text-slate-300">{selectedOrg?.organization_name || 'Select Organization'}</span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
                    <div className="p-2">
                        <div className="text-xs text-slate-500 px-3 py-2 font-medium">Switch Organization</div>
                        {organizations.map((org) => (
                            <button
                                key={org.organization_id}
                                onClick={() => {
                                    setSelectedOrg(org.organization_id);
                                    setIsOpen(false);
                                }}
                                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-700 transition text-left"
                            >
                                <div className="flex-1">
                                    <div className="text-sm text-slate-200">{org.organization_name}</div>
                                    <div className="text-xs text-slate-500 capitalize">{org.org_role.replace('_', ' ')}</div>
                                </div>
                                {selectedOrgId === org.organization_id && (
                                    <Check size={16} className="text-primary-400" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
