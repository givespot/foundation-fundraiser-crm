import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Download } from 'lucide-react';
import LeadCard from '../components/leads/LeadCard';
import LeadFilters from '../components/leads/LeadFilters';
import * as XLSX from 'xlsx';

const stages = [
  { id: 'new', label: 'New', color: 'bg-blue-100', textColor: 'text-blue-700', dotColor: 'bg-blue-500' },
  { id: 'contacted', label: 'Contacted', color: 'bg-purple-100', textColor: 'text-purple-700', dotColor: 'bg-purple-500' },
  { id: 'interested', label: 'Interested', color: 'bg-yellow-100', textColor: 'text-yellow-700', dotColor: 'bg-yellow-500' },
  { id: 'proposal_sent', label: 'Proposal Sent', color: 'bg-orange-100', textColor: 'text-orange-700', dotColor: 'bg-orange-500' },
  { id: 'committed', label: 'Committed', color: 'bg-green-100', textColor: 'text-green-700', dotColor: 'bg-green-500' },
  { id: 'on_hold', label: 'On Hold', color: 'bg-gray-100', textColor: 'text-gray-700', dotColor: 'bg-gray-500' },
  { id: 'not_interested', label: 'Not Interested', color: 'bg-red-100', textColor: 'text-red-700', dotColor: 'bg-red-500' },
];

// Helper to get full name from first_name and last_name
const getFullName = (lead) => {
  if (lead.first_name && lead.last_name) return `${lead.first_name} ${lead.last_name}`;
  if (lead.first_name) return lead.first_name;
  if (lead.last_name) return lead.last_name;
  if (lead.full_name) return lead.full_name;
  return 'Unknown';
};

export default function Leads() {
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    assignedTo: 'all',
    interestLevel: 'all',
    source: 'all',
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list('-created_at'),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    enabled: user?.role === 'admin',
  });

  const deleteLeadMutation = useMutation({
    mutationFn: (id) => base44.entities.Lead.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const handleDeleteLead = (leadId) => {
    deleteLeadMutation.mutate(leadId);
  };

  const updateLeadMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Lead.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  // Start with all leads
  let filteredLeads = [...leads];

  // Apply user filter for admin filtering
  if (filters.assignedTo !== 'all') {
    if (filters.assignedTo === 'unassigned') {
      filteredLeads = filteredLeads.filter(l => !l.assigned_to);
    } else {
      filteredLeads = filteredLeads.filter(l => l.assigned_to === filters.assignedTo);
    }
  }

  // Apply other filters
  if (filters.interestLevel !== 'all') {
    filteredLeads = filteredLeads.filter(l => l.interest_level === filters.interestLevel);
  }
  if (filters.source !== 'all') {
    filteredLeads = filteredLeads.filter(l => l.source === filters.source);
  }

  // Search filter
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filteredLeads = filteredLeads.filter(l =>
      l.first_name?.toLowerCase().includes(term) ||
      l.last_name?.toLowerCase().includes(term) ||
      getFullName(l).toLowerCase().includes(term) ||
      l.email?.toLowerCase().includes(term) ||
      l.organization?.toLowerCase().includes(term) ||
      l.company?.toLowerCase().includes(term)
    );
  }

  // Group by stage
  const leadsByStage = stages.reduce((acc, stage) => {
    acc[stage.id] = filteredLeads.filter(l => l.stage === stage.id);
    return acc;
  }, {});

  const handleStageChange = (leadId, newStage) => {
    updateLeadMutation.mutate({
      id: leadId,
      data: { stage: newStage }
    });
  };

  // Export to XLS function
  const exportToXLS = () => {
    const exportData = filteredLeads.map(lead => ({
      'First Name': lead.first_name || '',
      'Last Name': lead.last_name || '',
      'Email': lead.email || '',
      'Phone': lead.phone || '',
      'Organisation': lead.organization || lead.company || '',
      'Stage': stages.find(s => s.id === lead.stage)?.label || lead.stage || '',
      'Interest Level': lead.interest_level || '',
      'Source': lead.source || '',
      'Membership Tier': lead.membership_tier?.replace(/_/g, ' ') || '',
      'Pledge Amount': lead.pledge_amount || '',
      'Pledge Currency': lead.pledge_currency || '',
      'Pledge Frequency': lead.pledge_frequency?.replace(/_/g, ' ') || '',
      'Address Line 1': lead.address_line1 || '',
      'Address Line 2': lead.address_line2 || '',
      'Town/City': lead.town_city || '',
      'County': lead.county || '',
      'Postcode': lead.postcode || '',
      'Country': lead.country || '',
      'Next Follow-up': lead.next_follow_up || '',
      'Notes': lead.notes || '',
      'Created At': lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-GB') : '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');
    
    // Auto-size columns
    const colWidths = Object.keys(exportData[0] || {}).map(key => ({
      wch: Math.max(key.length, 15)
    }));
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `leads-export-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Leads Pipeline</h1>
        <Button 
          onClick={exportToXLS}
          variant="outline"
          className="flex items-center gap-2"
          disabled={filteredLeads.length === 0}
        >
          <Download className="w-4 h-4" />
          Export to Excel
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search leads by name, email, or organisation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white border-gray-200 text-gray-900 h-10 rounded-lg shadow-sm"
          />
        </div>
        <LeadFilters
          filters={filters}
          setFilters={setFilters}
          users={allUsers}
          isAdmin={user?.role === 'admin'}
        />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-gray-500">Loading leads...</p>
        </div>
      )}

      {/* Pipeline Columns - Now with 7 stages */}
      {!isLoading && (
        <div className="overflow-x-auto pb-4">
          <div className="grid grid-cols-7 gap-3 min-w-[1400px]">
            {stages.map((stage) => (
              <div key={stage.id} className="min-w-[200px]">
                <div className={`mb-3 p-2.5 rounded-lg ${stage.color}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${stage.dotColor}`}></div>
                      <h3 className={`font-semibold text-sm ${stage.textColor}`}>{stage.label}</h3>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${stage.textColor}`}>
                      {leadsByStage[stage.id]?.length || 0}
                    </span>
                  </div>
                </div>
                <div className="space-y-3 min-h-[400px]">
                  {leadsByStage[stage.id]?.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      onStageChange={handleStageChange}
                      onDelete={handleDeleteLead}
                      stages={stages}
                      allUsers={allUsers}
                    />
                  ))}
                  {leadsByStage[stage.id]?.length === 0 && (
                    <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-6">
                      <p className="text-gray-400 text-xs text-center">No leads</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
