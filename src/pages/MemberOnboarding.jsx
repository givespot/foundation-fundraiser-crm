import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { UserPlus, CheckCircle, Clock, Mail } from 'lucide-react';
import { format } from 'date-fns';

export default function MemberOnboarding() {
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.list('-join_date'),
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['enrollments'],
    queryFn: () => base44.entities.MemberEnrollment.list('-enrolled_date'),
  });

  const { data: sequences = [] } = useQuery({
    queryKey: ['sequences'],
    queryFn: () => base44.entities.EmailSequence.filter({ is_onboarding: true }),
  });

  const enrollMutation = useMutation({
    mutationFn: (member_id) => base44.functions.invoke('enrollMemberOnboarding', { member_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    },
  });

  const filteredMembers = members.filter(m =>
    m.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getEnrollmentStatus = (memberId) => {
    return enrollments.find(e => e.member_id === memberId && e.status === 'active');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Member Onboarding</h1>
        <p className="text-gray-600 mt-1">Manage automated member onboarding sequences</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {enrollments.filter(e => e.status === 'active').length}
            </div>
            <p className="text-sm text-gray-600">Active Enrollments</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {enrollments.filter(e => e.status === 'completed').length}
            </div>
            <p className="text-sm text-gray-600">Completed</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{sequences.length}</div>
            <p className="text-sm text-gray-600">Onboarding Sequences</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="bg-white border-0 shadow-sm">
        <CardContent className="pt-6">
          <Input
            placeholder="Search members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-white border-gray-200"
          />
        </CardContent>
      </Card>

      {/* Members List */}
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-lg font-semibold text-gray-900">Members</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {filteredMembers.map((member) => {
              const enrollment = getEnrollmentStatus(member.id);
              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold">{member.full_name?.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{member.full_name}</p>
                        <p className="text-sm text-gray-500">{member.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {member.join_date && (
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Joined</p>
                        <p className="text-sm font-medium text-gray-700">
                          {format(new Date(member.join_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    )}

                    {enrollment ? (
                      <Badge className="bg-green-50 text-green-700 border-green-200">
                        <Clock className="w-3 h-3 mr-1" />
                        In Progress (Step {enrollment.current_step + 1})
                      </Badge>
                    ) : enrollments.find(e => e.member_id === member.id && e.status === 'completed') ? (
                      <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Completed
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => enrollMutation.mutate(member.id)}
                        disabled={enrollMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <UserPlus className="w-4 h-4 mr-1" />
                        Enroll
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredMembers.length === 0 && (
              <p className="text-center text-gray-500 py-8">No members found</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}