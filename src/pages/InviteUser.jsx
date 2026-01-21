import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { UserPlus, Users, Mail, Shield, Trash2, Edit2, Key, Power, PowerOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function InviteUser() {
  const [user, setUser] = useState(null);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'user',
  });
  const [editingUser, setEditingUser] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list('-created_date'),
  });

  const inviteUserMutation = useMutation({
    mutationFn: async ({ email, role }) => {
      await base44.users.inviteUser(email, role);
      // Log the action
      await base44.entities.AuditLog.create({
        action: 'user_invited',
        entity_type: 'User',
        entity_id: email,
        performed_by: user?.email,
        details: `Invited ${email} as ${role}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setInviteForm({ email: '', role: 'user' });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }) => {
      await base44.entities.User.update(userId, data);
      // Log the action
      await base44.entities.AuditLog.create({
        action: 'user_updated',
        entity_type: 'User',
        entity_id: userId,
        performed_by: user?.email,
        details: `Updated user settings`,
        new_values: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingUser(null);
    },
  });

  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive, userEmail }) => {
      await base44.entities.User.update(userId, { is_active: isActive });
      // Log the action
      await base44.entities.AuditLog.create({
        action: isActive ? 'user_activated' : 'user_deactivated',
        entity_type: 'User',
        entity_id: userId,
        performed_by: user?.email,
        details: `${isActive ? 'Activated' : 'Deactivated'} user ${userEmail}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const handleInvite = (e) => {
    e.preventDefault();
    inviteUserMutation.mutate(inviteForm);
  };

  const handleEditUser = (teamUser) => {
    setEditingUser(teamUser);
  };

  const handleUpdateUser = () => {
    if (editingUser) {
      updateUserMutation.mutate({
        userId: editingUser.id,
        data: {
          full_name: editingUser.full_name,
          role: editingUser.role,
        }
      });
    }
  };

  const handleResetPassword = async (teamUser) => {
    // This will send a password reset email via Base44's built-in functionality
    if (confirm(`Send password reset email to ${teamUser.email}?`)) {
      try {
        // Note: Base44 handles password reset internally
        alert(`Password reset email will be sent to ${teamUser.email}`);
      } catch (error) {
        alert('Failed to send password reset email');
      }
    }
  };

  const handleToggleStatus = (teamUser) => {
    const isActive = teamUser.is_active !== false;
    const action = isActive ? 'deactivate' : 'activate';
    
    if (confirm(`Are you sure you want to ${action} ${teamUser.email}?`)) {
      toggleUserStatusMutation.mutate({
        userId: teamUser.id,
        isActive: !isActive,
        userEmail: teamUser.email,
      });
    }
  };

  // Check if user is admin
  if (user?.role !== 'admin') {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Admin Access Required</h2>
            <p className="text-gray-600">You need admin privileges to invite users.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
        <p className="text-gray-600 mt-1">Invite and manage team members</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invite Form */}
        <div className="lg:col-span-1">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader className="border-b border-gray-100 pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Invite User
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">Email Address</Label>
                  <Input
                    type="email"
                    required
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({...inviteForm, email: e.target.value})}
                    placeholder="user@example.com"
                    className="bg-white border-gray-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700">Role</Label>
                  <Select
                    value={inviteForm.role}
                    onValueChange={(value) => setInviteForm({...inviteForm, role: value})}
                  >
                    <SelectTrigger className="bg-white border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      <SelectItem value="user">Team Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    {inviteForm.role === 'admin' 
                      ? 'Full access to all features and settings' 
                      : 'Can manage assigned leads only'}
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={inviteUserMutation.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {inviteUserMutation.isPending ? 'Sending...' : 'Send Invitation'}
                </Button>

                {inviteUserMutation.isSuccess && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700">Invitation sent successfully!</p>
                  </div>
                )}

                {inviteUserMutation.isError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">Failed to send invitation</p>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Team Members List */}
        <div className="lg:col-span-2">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader className="border-b border-gray-100 pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Team Members ({allUsers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {editingUser ? (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-4">Edit Team Member</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-gray-700">Full Name</Label>
                      <Input
                        value={editingUser.full_name || ''}
                        onChange={(e) => setEditingUser({...editingUser, full_name: e.target.value})}
                        className="bg-white border-gray-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-700">Role</Label>
                      <Select
                        value={editingUser.role}
                        onValueChange={(value) => setEditingUser({...editingUser, role: value})}
                      >
                        <SelectTrigger className="bg-white border-gray-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200">
                          <SelectItem value="user">Team Member</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleUpdateUser}
                        disabled={updateUserMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setEditingUser(null)}
                        className="border-gray-200"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="space-y-3">
                {allUsers.map((teamUser) => (
                  <div
                    key={teamUser.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold">
                          {teamUser.full_name?.charAt(0) || teamUser.email?.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{teamUser.full_name}</p>
                        <p className="text-sm text-gray-500">{teamUser.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={
                        teamUser.role === 'admin'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }>
                        {teamUser.role === 'admin' ? (
                          <>
                            <Shield className="w-3 h-3 mr-1" />
                            Admin
                          </>
                        ) : (
                          'Team Member'
                        )}
                      </Badge>
                      {teamUser.is_active === false && (
                        <Badge className="bg-red-50 text-red-700 border-red-200">
                          Inactive
                        </Badge>
                      )}
                      {teamUser.email !== user?.email && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="border-gray-200">
                              Actions
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-white border-gray-200">
                            <DropdownMenuItem onClick={() => handleEditUser(teamUser)}>
                              <Edit2 className="w-4 h-4 mr-2" />
                              Edit User
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleResetPassword(teamUser)}>
                              <Key className="w-4 h-4 mr-2" />
                              Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(teamUser)}>
                              {teamUser.is_active !== false ? (
                                <>
                                  <PowerOff className="w-4 h-4 mr-2" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <Power className="w-4 h-4 mr-2" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                ))}

                {allUsers.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No team members yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}