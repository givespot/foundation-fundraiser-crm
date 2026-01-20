import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings as SettingsIcon, Save, User } from 'lucide-react';

const currencies = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
];

export default function Settings() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const [formData, setFormData] = useState({
    full_name: '',
    preferred_currency: 'USD',
    notification_email: true,
    notification_follow_ups: true,
  });

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        preferred_currency: user.preferred_currency || 'USD',
        notification_email: user.notification_email !== false,
        notification_follow_ups: user.notification_follow_ups !== false,
      });
    }
  }, [user]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data) => {
      await base44.auth.updateMe(data);
    },
    onSuccess: () => {
      base44.auth.me().then(setUser);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateSettingsMutation.mutate(formData);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Settings */}
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader className="border-b border-gray-100 pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-gray-700">Full Name</Label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    className="bg-white border-gray-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700">Email</Label>
                  <Input
                    value={user?.email || ''}
                    disabled
                    className="bg-gray-50 border-gray-200 text-gray-500"
                  />
                  <p className="text-xs text-gray-500">Email cannot be changed</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700">Role</Label>
                  <Input
                    value={user?.role || ''}
                    disabled
                    className="bg-gray-50 border-gray-200 text-gray-500 capitalize"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700">Preferred Currency</Label>
                  <Select
                    value={formData.preferred_currency}
                    onValueChange={(value) => setFormData({...formData, preferred_currency: value})}
                  >
                    <SelectTrigger className="bg-white border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      {currencies.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.symbol} {currency.code} - {currency.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">This will be used for displaying amounts</p>
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    disabled={updateSettingsMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateSettingsMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader className="border-b border-gray-100 pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <SettingsIcon className="w-5 h-5" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Email Notifications</p>
                    <p className="text-sm text-gray-500">Receive email updates about your leads</p>
                  </div>
                  <Switch
                    checked={formData.notification_email}
                    onCheckedChange={(checked) => {
                      const newData = {...formData, notification_email: checked};
                      setFormData(newData);
                      updateSettingsMutation.mutate(newData);
                    }}
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Follow-up Reminders</p>
                    <p className="text-sm text-gray-500">Get reminded about upcoming follow-ups</p>
                  </div>
                  <Switch
                    checked={formData.notification_follow_ups}
                    onCheckedChange={(checked) => {
                      const newData = {...formData, notification_follow_ups: checked};
                      setFormData(newData);
                      updateSettingsMutation.mutate(newData);
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-0 shadow-sm">
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Multi-Currency Support</h3>
              <p className="text-sm text-gray-600">
                Set your preferred currency to view all pledges and donations in your local currency.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Account Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Member since</span>
                  <span className="font-medium text-gray-900">
                    {user?.created_date && new Date(user.created_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Role</span>
                  <span className="font-medium text-gray-900 capitalize">{user?.role}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}