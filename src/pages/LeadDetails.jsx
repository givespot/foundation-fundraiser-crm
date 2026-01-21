import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Mail, Phone, Building2, Calendar, DollarSign, User, Save } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import ActivityTimeline from '../components/leads/ActivityTimeline';

export default function LeadDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const leadId = urlParams.get('id');
  
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedLead, setEditedLead] = useState(null);
  const [newActivity, setNewActivity] = useState({ type: 'note', description: '' });

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: lead, isLoading } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: async () => {
      const leads = await base44.entities.Lead.filter({ id: leadId });
      return leads[0];
    },
    enabled: !!leadId,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['activities', leadId],
    queryFn: () => base44.entities.Activity.filter({ lead_id: leadId }, '-created_date'),
    enabled: !!leadId,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    enabled: user?.role === 'admin',
  });

  const updateLeadMutation = useMutation({
    mutationFn: (data) => base44.entities.Lead.update(leadId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setIsEditing(false);
    },
  });

  const createActivityMutation = useMutation({
    mutationFn: (data) => base44.entities.Activity.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', leadId] });
      setNewActivity({ type: 'note', description: '' });
    },
  });

  const convertToMemberMutation = useMutation({
    mutationFn: async () => {
      // Check if user has permission
      if (!user || (user.role !== 'admin' && user.role !== 'user')) {
        throw new Error('Unauthorized');
      }
      
      const newMember = await base44.entities.Member.create({
        lead_id: lead.id,
        full_name: lead.full_name,
        email: lead.email,
        phone: lead.phone,
        organization: lead.organization,
        membership_tier: lead.membership_tier,
        pledge_amount: lead.pledge_amount,
        pledge_currency: lead.pledge_currency || 'USD',
        pledge_frequency: lead.pledge_frequency,
        join_date: new Date().toISOString().split('T')[0],
      });
      await base44.entities.Lead.update(leadId, { status: 'converted' });
      await base44.entities.Activity.create({
        lead_id: leadId,
        activity_type: 'status_change',
        description: 'Lead converted to member',
        performed_by: user?.email,
        activity_date: new Date().toISOString(),
      });
      
      // Enroll in onboarding sequence
      try {
        await base44.functions.invoke('enrollMemberOnboarding', { member_id: newMember.id });
      } catch (error) {
        console.error('Failed to enroll in onboarding:', error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });

  useEffect(() => {
    if (lead && !editedLead) {
      setEditedLead(lead);
    }
  }, [lead]);

  if (isLoading || !lead) {
    return <div className="text-gray-900">Loading...</div>;
  }

  const handleSave = () => {
    updateLeadMutation.mutate(editedLead);
  };

  const handleAddActivity = () => {
    if (!newActivity.description.trim()) return;
    
    createActivityMutation.mutate({
      lead_id: leadId,
      activity_type: newActivity.type,
      description: newActivity.description,
      performed_by: user?.email,
      activity_date: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={createPageUrl('Leads')}>
            <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Leads
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{lead.full_name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                {lead.stage.replace('_', ' ')}
              </Badge>
              <Badge className={`${
                lead.interest_level === 'high' ? 'bg-red-50 text-red-700 border-red-200' :
                lead.interest_level === 'medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                'bg-blue-50 text-blue-700 border-blue-200'
              }`}>
                {lead.interest_level} interest
              </Badge>
            </div>
          </div>
        </div>
        {lead.status === 'active' && (
          <Button
            onClick={() => convertToMemberMutation.mutate()}
            className="bg-green-600 hover:bg-green-700"
          >
            Convert to Member
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Lead Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100">
              <CardTitle className="text-gray-900">Lead Information</CardTitle>
              {!isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="border-gray-200 text-gray-700 hover:text-gray-900"
                >
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      setEditedLead(lead);
                    }}
                    className="border-gray-200"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {isEditing ? (
                <>
                  <div>
                    <label className="text-sm text-gray-700">Full Name</label>
                    <Input
                      value={editedLead?.full_name || ''}
                      onChange={(e) => setEditedLead({...editedLead, full_name: e.target.value})}
                      className="bg-white border-gray-200 text-gray-900 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-700">Email</label>
                    <Input
                      value={editedLead?.email || ''}
                      onChange={(e) => setEditedLead({...editedLead, email: e.target.value})}
                      className="bg-white border-gray-200 text-gray-900 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-700">Phone</label>
                    <Input
                      value={editedLead?.phone || ''}
                      onChange={(e) => setEditedLead({...editedLead, phone: e.target.value})}
                      className="bg-white border-gray-200 text-gray-900 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-700">Organisation</label>
                    <Input
                      value={editedLead?.organization || ''}
                      onChange={(e) => setEditedLead({...editedLead, organization: e.target.value})}
                      className="bg-white border-gray-200 text-gray-900 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-700">Stage</label>
                    <Select
                      value={editedLead?.stage}
                      onValueChange={(value) => setEditedLead({...editedLead, stage: value})}
                    >
                      <SelectTrigger className="bg-white border-gray-200 text-gray-900 mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="interested">Interested</SelectItem>
                        <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
                        <SelectItem value="committed">Committed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm text-gray-700">Interest Level</label>
                    <Select
                      value={editedLead?.interest_level}
                      onValueChange={(value) => setEditedLead({...editedLead, interest_level: value})}
                    >
                      <SelectTrigger className="bg-white border-gray-200 text-gray-900 mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm text-gray-700">Next Follow-up Date</label>
                    <Input
                      type="date"
                      value={editedLead?.next_follow_up || ''}
                      onChange={(e) => setEditedLead({...editedLead, next_follow_up: e.target.value})}
                      className="bg-white border-gray-200 text-gray-900 mt-1"
                    />
                  </div>
                  {user?.role === 'admin' && (
                    <div>
                      <label className="text-sm text-gray-700">Assigned To</label>
                      <Select
                        value={editedLead?.assigned_to || ''}
                        onValueChange={(value) => setEditedLead({...editedLead, assigned_to: value})}
                      >
                        <SelectTrigger className="bg-white border-gray-200 text-gray-900 mt-1">
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200">
                          {allUsers.map((u) => (
                            <SelectItem key={u.email} value={u.email}>
                              {u.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-xs text-gray-600">Email</p>
                      <p className="text-sm text-gray-900">{lead.email}</p>
                    </div>
                  </div>
                  {lead.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-xs text-gray-600">Phone</p>
                        <p className="text-sm text-gray-900">{lead.phone}</p>
                      </div>
                    </div>
                  )}
                  {lead.organization && (
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-purple-600" />
                      <div>
                        <p className="text-xs text-gray-600">Organisation</p>
                        <p className="text-sm text-gray-900">{lead.organization}</p>
                      </div>
                    </div>
                  )}
                  {lead.next_follow_up && (
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-amber-600" />
                      <div>
                        <p className="text-xs text-gray-600">Next Follow-up</p>
                        <p className="text-sm text-gray-900">
                          {format(new Date(lead.next_follow_up), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  )}
                  {lead.assigned_to && (
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-cyan-600" />
                      <div>
                        <p className="text-xs text-gray-600">Assigned To</p>
                        <p className="text-sm text-gray-900">{lead.assigned_to}</p>
                      </div>
                    </div>
                  )}
                  {lead.pledge_amount && (
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-xs text-gray-600">Pledge Amount</p>
                        <p className="text-sm text-gray-900">
                          ${lead.pledge_amount.toLocaleString()} / {lead.pledge_frequency}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {lead.notes && !isEditing && (
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-600 mb-2">Notes</p>
                  <p className="text-sm text-gray-700">{lead.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <ActivityTimeline activities={activities} />
        </div>

        {/* Right Column - Quick Actions */}
        <div className="space-y-6">
          {/* Add Activity */}
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="text-gray-900">Log Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <Select
                value={newActivity.type}
                onValueChange={(value) => setNewActivity({...newActivity, type: value})}
              >
                <SelectTrigger className="bg-white border-gray-200 text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="call">Phone Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="note">Note</SelectItem>
                </SelectContent>
              </Select>
              <Textarea
                placeholder="What happened?"
                value={newActivity.description}
                onChange={(e) => setNewActivity({...newActivity, description: e.target.value})}
                className="bg-white border-gray-200 text-gray-900"
                rows={4}
              />
              <Button
                onClick={handleAddActivity}
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={!newActivity.description.trim()}
              >
                Add Activity
              </Button>
            </CardContent>
          </Card>

          {/* Lead Stats */}
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="text-gray-900">Lead Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-6">
              <div>
                <p className="text-xs text-gray-600">Source</p>
                <p className="text-sm text-gray-900 capitalize">{lead.source?.replace('_', ' ')}</p>
              </div>
              {lead.membership_tier && (
                <div>
                  <p className="text-xs text-gray-600">Membership Tier</p>
                  <Badge className="bg-purple-50 text-purple-700 border-purple-200 mt-1">
                    {lead.membership_tier.replace(/_/g, ' ')}
                  </Badge>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-600">Created</p>
                <p className="text-sm text-gray-900">
                  {format(new Date(lead.created_date), 'MMM d, yyyy')}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Last Updated</p>
                <p className="text-sm text-gray-900">
                  {format(new Date(lead.updated_date), 'MMM d, yyyy')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}