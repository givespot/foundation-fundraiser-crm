import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter } from 'lucide-react';
import LeadCard from '../components/leads/LeadCard';
import LeadFilters from '../components/leads/LeadFilters';

const stages = [
  { id: 'new', label: 'New', color: 'blue' },
  { id: 'contacted', label: 'Contacted', color: 'purple' },
  { id: 'interested', label: 'Interested', color: 'yellow' },
  { id: 'proposal_sent', label: 'Proposal Sent', color: 'orange' },
  { id: 'committed', label: 'Committed', color: 'green' },
];

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
    queryFn: () => base44.entities.Lead.list('-updated_date'),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    enabled: user?.role === 'admin',
  });

  const updateLeadMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Lead.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  // Filter leads
  let filteredLeads = leads.filter(l => l.status === 'active');

  // Apply user filter (show only assigned if not admin)
  if (user?.role !== 'admin') {
    filteredLeads = filteredLeads.filter(l => l.assigned_to === user?.email);
  } else if (filters.assignedTo !== 'all') {
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
    filteredLeads = filteredLeads.filter(l =>
      l.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.organization?.toLowerCase().includes(searchTerm.toLowerCase())
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Leads Pipeline</h1>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Search leads by name, email, or organization..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-slate-800/50 border-slate-700 text-white"
          />
        </div>
        <LeadFilters 
          filters={filters} 
          setFilters={setFilters} 
          users={allUsers}
          isAdmin={user?.role === 'admin'}
        />
      </div>

      {/* Pipeline Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <div key={stage.id} className="min-w-[280px]">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-white">{stage.label}</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${stage.color}-500/20 text-${stage.color}-300`}>
                {leadsByStage[stage.id]?.length || 0}
              </span>
            </div>
            <div className="space-y-3 min-h-[400px]">
              {leadsByStage[stage.id]?.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onStageChange={handleStageChange}
                  stages={stages}
                />
              ))}
              {leadsByStage[stage.id]?.length === 0 && (
                <Card className="bg-slate-800/30 border-slate-700 border-dashed p-8">
                  <p className="text-slate-500 text-sm text-center">No leads</p>
                </Card>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}