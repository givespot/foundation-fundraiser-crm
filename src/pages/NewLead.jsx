import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { UserPlus, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function NewLead() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    enabled: user?.role === 'admin',
  });

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    organization: '',
    stage: 'new',
    membership_tier: '',
    pledge_amount: '',
    pledge_currency: user?.preferred_currency || 'USD',
    pledge_frequency: '',
    source: '',
    interest_level: 'medium',
    assigned_to: '',
    next_follow_up: '',
    notes: '',
  });

  const createLeadMutation = useMutation({
    mutationFn: (data) => base44.entities.Lead.create(data),
    onSuccess: async (newLead) => {
      // Log activity
      await base44.entities.Activity.create({
        lead_id: newLead.id,
        activity_type: 'note',
        description: 'Lead created',
        performed_by: user?.email,
        activity_date: new Date().toISOString(),
      });
      
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      navigate(createPageUrl('Leads'));
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const cleanedData = {
      ...formData,
      pledge_amount: formData.pledge_amount ? parseFloat(formData.pledge_amount) : null,
      assigned_to: formData.assigned_to || (user?.role === 'admin' ? null : user?.email),
    };

    // Remove empty strings
    Object.keys(cleanedData).forEach(key => {
      if (cleanedData[key] === '') {
        cleanedData[key] = null;
      }
    });

    createLeadMutation.mutate(cleanedData);
  };

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to={createPageUrl('Leads')}>
          <Button variant="ghost" className="text-slate-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white">Add New Lead</h1>
          <p className="text-slate-400 mt-1">Capture potential member information</p>
        </div>
      </div>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Lead Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Full Name *</Label>
                <Input
                  required
                  value={formData.full_name}
                  onChange={(e) => handleChange('full_name', e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-white"
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Email *</Label>
                <Input
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-white"
                  placeholder="john@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-white"
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Organization</Label>
                <Input
                  value={formData.organization}
                  onChange={(e) => handleChange('organization', e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-white"
                  placeholder="Company name"
                />
              </div>
            </div>

            {/* Lead Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Source</Label>
                <Select value={formData.source} onValueChange={(value) => handleChange('source', value)}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                    <SelectValue placeholder="How did they find us?" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
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
                <Label className="text-slate-300">Interest Level</Label>
                <Select value={formData.interest_level} onValueChange={(value) => handleChange('interest_level', value)}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Membership Tier</Label>
                <Select value={formData.membership_tier} onValueChange={(value) => handleChange('membership_tier', value)}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                    <SelectValue placeholder="Desired membership level" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="basic_member">Basic Member</SelectItem>
                    <SelectItem value="patron">Patron</SelectItem>
                    <SelectItem value="major_donor">Major Donor</SelectItem>
                    <SelectItem value="corporate_sponsor">Corporate Sponsor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Next Follow-up Date</Label>
                <Input
                  type="date"
                  value={formData.next_follow_up}
                  onChange={(e) => handleChange('next_follow_up', e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
              </div>
            </div>

            {/* Pledge Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-700">Pledge Amount</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.pledge_amount}
                  onChange={(e) => handleChange('pledge_amount', e.target.value)}
                  className="bg-white border-gray-200"
                  placeholder="1000"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700">Currency</Label>
                <Select value={formData.pledge_currency} onValueChange={(value) => handleChange('pledge_currency', value)}>
                  <SelectTrigger className="bg-white border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem value="USD">$ USD</SelectItem>
                    <SelectItem value="EUR">€ EUR</SelectItem>
                    <SelectItem value="GBP">£ GBP</SelectItem>
                    <SelectItem value="CAD">C$ CAD</SelectItem>
                    <SelectItem value="AUD">A$ AUD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700">Frequency</Label>
                <Select value={formData.pledge_frequency} onValueChange={(value) => handleChange('pledge_frequency', value)}>
                  <SelectTrigger className="bg-white border-gray-200">
                    <SelectValue placeholder="How often?" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem value="one_time">One Time</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Assignment (Admin only) */}
            {user?.role === 'admin' && (
              <div className="space-y-2">
                <Label className="text-slate-300">Assign To</Label>
                <Select value={formData.assigned_to} onValueChange={(value) => handleChange('assigned_to', value)}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {allUsers.map((u) => (
                      <SelectItem key={u.email} value={u.email}>
                        {u.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-slate-300">Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white"
                rows={4}
                placeholder="Any additional information..."
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-4">
              <Link to={createPageUrl('Leads')}>
                <Button variant="outline" type="button" className="border-slate-600 text-slate-300">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={createLeadMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {createLeadMutation.isPending ? 'Creating...' : 'Create Lead'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}