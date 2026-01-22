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

// Helper to get user display name
const getUserName = (user) => {
  if (!user) return 'Unknown';
  if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`;
  if (user.first_name) return user.first_name;
  if (user.full_name) return user.full_name;
  return user.email || 'Unknown';
};

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
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    organization: '',
    address_line1: '',
    address_line2: '',
    town_city: '',
    county: '',
    postcode: '',
    country: 'United Kingdom',
    stage: 'new',
    membership_tier: '',
    pledge_amount: '',
    pledge_currency: 'GBP',
    pledge_frequency: '',
    source: '',
    source_other: '',
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
        type: 'note',
        description: 'Lead created',
        user_id: user?.id,
        
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
      assigned_to: formData.assigned_to || null,
      created_by: user?.id,
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
          <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Add New Lead</h1>
          <p className="text-gray-600 mt-1">Capture potential member information</p>
        </div>
      </div>

      <Card className="bg-white border-0 shadow-sm">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-gray-900 flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Lead Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-700">First Name *</Label>
                <Input
                  required
                  value={formData.first_name}
                  onChange={(e) => handleChange('first_name', e.target.value)}
                  className="bg-white border-gray-200 text-gray-900"
                  placeholder="John"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700">Last Name *</Label>
                <Input
                  required
                  value={formData.last_name}
                  onChange={(e) => handleChange('last_name', e.target.value)}
                  className="bg-white border-gray-200 text-gray-900"
                  placeholder="Doe"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700">Email *</Label>
                <Input
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="bg-white border-gray-200 text-gray-900"
                  placeholder="john@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700">Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="bg-white border-gray-200 text-gray-900"
                  placeholder="+44 7700 900000"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-gray-700">Organisation</Label>
                <Input
                  value={formData.organization}
                  onChange={(e) => handleChange('organization', e.target.value)}
                  className="bg-white border-gray-200 text-gray-900"
                  placeholder="Company name"
                />
              </div>
            </div>

            {/* Address (UK Format) */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Address</h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">Address Line 1</Label>
                  <Input
                    value={formData.address_line1}
                    onChange={(e) => handleChange('address_line1', e.target.value)}
                    className="bg-white border-gray-200 text-gray-900"
                    placeholder="Street address"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">Address Line 2</Label>
                  <Input
                    value={formData.address_line2}
                    onChange={(e) => handleChange('address_line2', e.target.value)}
                    className="bg-white border-gray-200 text-gray-900"
                    placeholder="Apartment, suite, etc. (optional)"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-700">Town/City</Label>
                    <Input
                      value={formData.town_city}
                      onChange={(e) => handleChange('town_city', e.target.value)}
                      className="bg-white border-gray-200 text-gray-900"
                      placeholder="London"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700">County</Label>
                    <Input
                      value={formData.county}
                      onChange={(e) => handleChange('county', e.target.value)}
                      className="bg-white border-gray-200 text-gray-900"
                      placeholder="Greater London (optional)"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-700">Postcode</Label>
                    <Input
                      value={formData.postcode}
                      onChange={(e) => handleChange('postcode', e.target.value)}
                      className="bg-white border-gray-200 text-gray-900"
                      placeholder="SW1A 1AA"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700">Country</Label>
                    <Input
                      value={formData.country}
                      onChange={(e) => handleChange('country', e.target.value)}
                      className="bg-white border-gray-200 text-gray-900"
                      placeholder="United Kingdom"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Lead Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Lead Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">Source</Label>
                  <Select value={formData.source} onValueChange={(value) => handleChange('source', value)}>
                    <SelectTrigger className="bg-white border-gray-200 text-gray-900">
                      <SelectValue placeholder="How did they find us?" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="event">Event</SelectItem>
                      <SelectItem value="social_media">Social Media</SelectItem>
                      <SelectItem value="email_campaign">Email Campaign</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.source === 'other' && (
                  <div className="space-y-2">
                    <Label className="text-gray-700">Please specify</Label>
                    <Input
                      value={formData.source_other}
                      onChange={(e) => handleChange('source_other', e.target.value)}
                      className="bg-white border-gray-200 text-gray-900"
                      placeholder="Please provide more details"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-gray-700">Interest Level</Label>
                  <Select value={formData.interest_level} onValueChange={(value) => handleChange('interest_level', value)}>
                    <SelectTrigger className="bg-white border-gray-200 text-gray-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700">Membership Tier</Label>
                  <Select value={formData.membership_tier} onValueChange={(value) => handleChange('membership_tier', value)}>
                    <SelectTrigger className="bg-white border-gray-200 text-gray-900">
                      <SelectValue placeholder="Desired membership level" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      <SelectItem value="basic_member">Basic Member</SelectItem>
                      <SelectItem value="patron">Patron</SelectItem>
                      <SelectItem value="major_donor">Major Donor</SelectItem>
                      <SelectItem value="corporate_sponsor">Corporate Sponsor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700">Next Follow-up Date</Label>
                  <Input
                    type="date"
                    value={formData.next_follow_up}
                    onChange={(e) => handleChange('next_follow_up', e.target.value)}
                    className="bg-white border-gray-200 text-gray-900"
                  />
                </div>

                {/* Assignment (Admin only) */}
                {user?.role === 'admin' && (
                  <div className="space-y-2">
                    <Label className="text-gray-700">Assign To</Label>
                    <Select value={formData.assigned_to} onValueChange={(value) => handleChange('assigned_to', value)}>
                      <SelectTrigger className="bg-white border-gray-200 text-gray-900">
                        <SelectValue placeholder="Select team member" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {allUsers.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {getUserName(u)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            {/* Pledge Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Pledge Information</h3>
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
                      <SelectItem value="GBP">£ GBP</SelectItem>
                      <SelectItem value="USD">$ USD</SelectItem>
                      <SelectItem value="EUR">€ EUR</SelectItem>
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
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-gray-700">Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                className="bg-white border-gray-200 text-gray-900"
                rows={4}
                placeholder="Any additional information..."
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Link to={createPageUrl('Leads')}>
                <Button variant="outline" type="button" className="border-gray-200 text-gray-700">
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
