import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Mail, Phone, Building2, Calendar, PoundSterling, User, Save, MapPin, Globe, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import ActivityTimeline from '../components/leads/ActivityTimeline';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Helper to get full name
const getFullName = (lead) => {
  if (lead?.first_name && lead?.last_name) return `${lead.first_name} ${lead.last_name}`;
  if (lead?.first_name) return lead.first_name;
  if (lead?.last_name) return lead.last_name;
  return 'Unknown';
};

// Helper to get user name
const getUserName = (userId, users) => {
  if (!userId) return null;
  const user = users?.find(u => u.id === userId);
  if (user) {
    if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`;
    if (user.first_name) return user.first_name;
    return user.email;
  }
  return null;
};

// Helper to get currency symbol
const getCurrencySymbol = (currency) => {
  const symbols = { GBP: '£', USD: '$', EUR: '€', CAD: 'C$', AUD: 'A$' };
  return symbols[currency] || currency || '£';
};

// Safe date formatter
const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    return format(new Date(dateString), 'dd/MM/yyyy');
  } catch {
    return '';
  }
};

const stages = [
  { id: 'new', label: 'New' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'interested', label: 'Interested' },
  { id: 'proposal_sent', label: 'Proposal Sent' },
  { id: 'committed', label: 'Committed' },
  { id: 'on_hold', label: 'On Hold' },
  { id: 'not_interested', label: 'Not Interested' },
];

export default function LeadDetails() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const leadId = urlParams.get('id');

  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedLead, setEditedLead] = useState(null);
  const [newActivity, setNewActivity] = useState({ type: 'note', description: '' });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
    queryFn: () => base44.entities.Activity.filter({ lead_id: leadId }, '-created_at'),
    enabled: !!leadId,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const updateLeadMutation = useMutation({
    mutationFn: (data) => base44.entities.Lead.update(leadId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setIsEditing(false);
    },
  });

  const deleteLeadMutation = useMutation({
    mutationFn: () => base44.entities.Lead.delete(leadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      navigate(createPageUrl('Leads'));
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
      const newMember = await base44.entities.Member.create({
        lead_id: lead.id,
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email,
        phone: lead.phone,
        organization: lead.organization,
        membership_tier: lead.membership_tier,
        pledge_amount: lead.pledge_amount,
        pledge_currency: lead.pledge_currency || 'GBP',
        pledge_frequency: lead.pledge_frequency,
        join_date: new Date().toISOString().split('T')[0],
      });
      await base44.entities.Lead.update(leadId, { stage: 'committed' });
      await base44.entities.Activity.create({
        lead_id: leadId,
        type: 'status_change',
        description: 'Lead converted to member',
        user_id: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });

  useEffect(() => {
    if (lead && !editedLead) {
      setEditedLead({ ...lead });
    }
  }, [lead]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Lead not found</p>
        <Link to={createPageUrl('Leads')}>
          <Button variant="outline" className="mt-4">Back to Leads</Button>
        </Link>
      </div>
    );
  }

  const handleSave = () => {
    const dataToSave = { ...editedLead };
    // Convert empty strings to null
    Object.keys(dataToSave).forEach(key => {
      if (dataToSave[key] === '') dataToSave[key] = null;
    });
    // Handle pledge amount
    if (dataToSave.pledge_amount) {
      dataToSave.pledge_amount = parseFloat(dataToSave.pledge_amount);
    }
    updateLeadMutation.mutate(dataToSave);
  };

  const handleAddActivity = () => {
    if (!newActivity.description.trim()) return;
    createActivityMutation.mutate({
      lead_id: leadId,
      type: newActivity.type,
      description: newActivity.description,
      user_id: user?.id,
    });
  };

  const handleDelete = () => {
    deleteLeadMutation.mutate();
    setShowDeleteDialog(false);
  };

  const fullName = getFullName(lead);
  const assignedUserName = getUserName(lead.assigned_to, allUsers);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={createPageUrl('Leads')}>
            <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                {stages.find(s => s.id === lead.stage)?.label || lead.stage}
              </Badge>
              {lead.interest_level && (
                <Badge className={`${
                  lead.interest_level === 'high' ? 'bg-red-50 text-red-700 border-red-200' :
                  lead.interest_level === 'medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                  'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {lead.interest_level} interest
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
          {lead.stage !== 'committed' && lead.stage !== 'not_interested' && (
            <Button
              onClick={() => convertToMemberMutation.mutate()}
              className="bg-green-600 hover:bg-green-700"
              disabled={convertToMemberMutation.isPending}
            >
              {convertToMemberMutation.isPending ? 'Converting...' : 'Convert to Member'}
            </Button>
          )}
        </div>
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
                      setEditedLead({ ...lead });
                    }}
                    className="border-gray-200"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={updateLeadMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateLeadMutation.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="pt-6">
              {isEditing ? (
                <div className="space-y-6">
                  {/* Personal Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Name *</Label>
                      <Input
                        value={editedLead?.first_name || ''}
                        onChange={(e) => setEditedLead({...editedLead, first_name: e.target.value})}
                        className="bg-white border-gray-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name *</Label>
                      <Input
                        value={editedLead?.last_name || ''}
                        onChange={(e) => setEditedLead({...editedLead, last_name: e.target.value})}
                        className="bg-white border-gray-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        value={editedLead?.email || ''}
                        onChange={(e) => setEditedLead({...editedLead, email: e.target.value})}
                        className="bg-white border-gray-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        value={editedLead?.phone || ''}
                        onChange={(e) => setEditedLead({...editedLead, phone: e.target.value})}
                        className="bg-white border-gray-200"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Organisation</Label>
                      <Input
                        value={editedLead?.organization || ''}
                        onChange={(e) => setEditedLead({...editedLead, organization: e.target.value})}
                        className="bg-white border-gray-200"
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-900 mb-3">Address</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 md:col-span-2">
                        <Label>Address Line 1</Label>
                        <Input
                          value={editedLead?.address_line1 || ''}
                          onChange={(e) => setEditedLead({...editedLead, address_line1: e.target.value})}
                          className="bg-white border-gray-200"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Address Line 2</Label>
                        <Input
                          value={editedLead?.address_line2 || ''}
                          onChange={(e) => setEditedLead({...editedLead, address_line2: e.target.value})}
                          className="bg-white border-gray-200"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Town/City</Label>
                        <Input
                          value={editedLead?.town_city || ''}
                          onChange={(e) => setEditedLead({...editedLead, town_city: e.target.value})}
                          className="bg-white border-gray-200"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>County</Label>
                        <Input
                          value={editedLead?.county || ''}
                          onChange={(e) => setEditedLead({...editedLead, county: e.target.value})}
                          className="bg-white border-gray-200"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Postcode</Label>
                        <Input
                          value={editedLead?.postcode || ''}
                          onChange={(e) => setEditedLead({...editedLead, postcode: e.target.value})}
                          className="bg-white border-gray-200"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Country</Label>
                        <Input
                          value={editedLead?.country || ''}
                          onChange={(e) => setEditedLead({...editedLead, country: e.target.value})}
                          className="bg-white border-gray-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Lead Details */}
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-900 mb-3">Lead Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Stage</Label>
                        <Select
                          value={editedLead?.stage || 'new'}
                          onValueChange={(value) => setEditedLead({...editedLead, stage: value})}
                        >
                          <SelectTrigger className="bg-white border-gray-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            {stages.map(s => (
                              <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Interest Level</Label>
                        <Select
                          value={editedLead?.interest_level || 'medium'}
                          onValueChange={(value) => setEditedLead({...editedLead, interest_level: value})}
                        >
                          <SelectTrigger className="bg-white border-gray-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Source</Label>
                        <Select
                          value={editedLead?.source || ''}
                          onValueChange={(value) => setEditedLead({...editedLead, source: value})}
                        >
                          <SelectTrigger className="bg-white border-gray-200">
                            <SelectValue placeholder="Select source" />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            <SelectItem value="website">Website</SelectItem>
                            <SelectItem value="referral">Referral</SelectItem>
                            <SelectItem value="event">Event</SelectItem>
                            <SelectItem value="social_media">Social Media</SelectItem>
                            <SelectItem value="email_campaign">Email Campaign</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Membership Tier</Label>
                        <Select
                          value={editedLead?.membership_tier || ''}
                          onValueChange={(value) => setEditedLead({...editedLead, membership_tier: value})}
                        >
                          <SelectTrigger className="bg-white border-gray-200">
                            <SelectValue placeholder="Select tier" />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            <SelectItem value="basic_member">Basic Member</SelectItem>
                            <SelectItem value="patron">Patron</SelectItem>
                            <SelectItem value="major_donor">Major Donor</SelectItem>
                            <SelectItem value="corporate_sponsor">Corporate Sponsor</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Next Follow-up</Label>
                        <Input
                          type="date"
                          value={editedLead?.next_follow_up || ''}
                          onChange={(e) => setEditedLead({...editedLead, next_follow_up: e.target.value})}
                          className="bg-white border-gray-200"
                        />
                      </div>
                      {user?.role === 'admin' && (
                        <div className="space-y-2">
                          <Label>Assigned To</Label>
                          <Select
                            value={editedLead?.assigned_to || 'unassigned'}
                            onValueChange={(value) => setEditedLead({...editedLead, assigned_to: value === 'unassigned' ? null : value})}
                          >
                            <SelectTrigger className="bg-white border-gray-200">
                              <SelectValue placeholder="Unassigned" />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {allUsers.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pledge Info */}
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-900 mb-3">Pledge Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Pledge Amount</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editedLead?.pledge_amount || ''}
                          onChange={(e) => setEditedLead({...editedLead, pledge_amount: e.target.value})}
                          className="bg-white border-gray-200"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Currency</Label>
                        <Select
                          value={editedLead?.pledge_currency || 'GBP'}
                          onValueChange={(value) => setEditedLead({...editedLead, pledge_currency: value})}
                        >
                          <SelectTrigger className="bg-white border-gray-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            <SelectItem value="GBP">£ GBP</SelectItem>
                            <SelectItem value="USD">$ USD</SelectItem>
                            <SelectItem value="EUR">€ EUR</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Frequency</Label>
                        <Select
                          value={editedLead?.pledge_frequency || ''}
                          onValueChange={(value) => setEditedLead({...editedLead, pledge_frequency: value})}
                        >
                          <SelectTrigger className="bg-white border-gray-200">
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            <SelectItem value="one_time">One Time</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="annual">Annual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="border-t pt-4">
                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea
                        value={editedLead?.notes || ''}
                        onChange={(e) => setEditedLead({...editedLead, notes: e.target.value})}
                        className="bg-white border-gray-200"
                        rows={4}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="space-y-6">
                  {/* Contact Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Mail className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="text-sm font-medium text-gray-900">{lead.email}</p>
                      </div>
                    </div>
                    {lead.phone && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Phone className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="text-xs text-gray-500">Phone</p>
                          <p className="text-sm font-medium text-gray-900">{lead.phone}</p>
                        </div>
                      </div>
                    )}
                    {lead.organization && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Building2 className="w-5 h-5 text-purple-600" />
                        <div>
                          <p className="text-xs text-gray-500">Organisation</p>
                          <p className="text-sm font-medium text-gray-900">{lead.organization}</p>
                        </div>
                      </div>
                    )}
                    {lead.next_follow_up && (
                      <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
                        <Calendar className="w-5 h-5 text-amber-600" />
                        <div>
                          <p className="text-xs text-gray-500">Next Follow-up</p>
                          <p className="text-sm font-medium text-gray-900">{formatDate(lead.next_follow_up)}</p>
                        </div>
                      </div>
                    )}
                    {assignedUserName && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <User className="w-5 h-5 text-cyan-600" />
                        <div>
                          <p className="text-xs text-gray-500">Assigned To</p>
                          <p className="text-sm font-medium text-gray-900">{assignedUserName}</p>
                        </div>
                      </div>
                    )}
                    {lead.pledge_amount && (
                      <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                        <PoundSterling className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="text-xs text-gray-500">Pledge</p>
                          <p className="text-sm font-medium text-gray-900">
                            {getCurrencySymbol(lead.pledge_currency)}{Number(lead.pledge_amount).toLocaleString()}
                            {lead.pledge_frequency && ` / ${lead.pledge_frequency.replace('_', ' ')}`}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Address */}
                  {(lead.address_line1 || lead.town_city || lead.postcode) && (
                    <div className="border-t pt-4">
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Address</p>
                          <p className="text-sm text-gray-900">
                            {[lead.address_line1, lead.address_line2, lead.town_city, lead.county, lead.postcode, lead.country]
                              .filter(Boolean)
                              .join(', ')}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {lead.notes && (
                    <div className="border-t pt-4">
                      <p className="text-xs text-gray-500 mb-2">Notes</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{lead.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <ActivityTimeline activities={activities} allUsers={allUsers} />
        </div>

        {/* Right Column */}
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
                <SelectTrigger className="bg-white border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
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
                className="bg-white border-gray-200"
                rows={4}
              />
              <Button
                onClick={handleAddActivity}
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={!newActivity.description.trim() || createActivityMutation.isPending}
              >
                {createActivityMutation.isPending ? 'Adding...' : 'Add Activity'}
              </Button>
            </CardContent>
          </Card>

          {/* Lead Stats */}
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="text-gray-900">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-6">
              {lead.source && (
                <div>
                  <p className="text-xs text-gray-500">Source</p>
                  <p className="text-sm text-gray-900 capitalize">{lead.source.replace(/_/g, ' ')}</p>
                </div>
              )}
              {lead.membership_tier && (
                <div>
                  <p className="text-xs text-gray-500">Membership Tier</p>
                  <Badge className="bg-purple-50 text-purple-700 border-purple-200 mt-1">
                    {lead.membership_tier.replace(/_/g, ' ')}
                  </Badge>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500">Created</p>
                <p className="text-sm text-gray-900">{formatDate(lead.created_at)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Last Updated</p>
                <p className="text-sm text-gray-900">{formatDate(lead.updated_at)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{fullName}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-200">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
