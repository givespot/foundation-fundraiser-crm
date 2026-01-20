import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Award, Mail, Phone, Building2, DollarSign, Calendar, Search } from 'lucide-react';
import { format } from 'date-fns';

const tierColors = {
  basic_member: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  patron: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  major_donor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  corporate_sponsor: 'bg-green-500/20 text-green-300 border-green-500/30',
};

export default function Members() {
  const [searchTerm, setSearchTerm] = React.useState('');

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.list('-join_date'),
  });

  const filteredMembers = members.filter(m =>
    m.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.organization?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPledges = members.reduce((sum, m) => sum + (m.pledge_amount || 0), 0);
  const activeMembers = members.filter(m => m.membership_status === 'active').length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Foundation Members</h1>
          <p className="text-slate-400 mt-1">Our valued supporters</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Active Members</CardTitle>
            <Award className="w-4 h-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{activeMembers}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Total Members</CardTitle>
            <Award className="w-4 h-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{members.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Pledged Amount</CardTitle>
            <DollarSign className="w-4 h-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">${totalPledges.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
        <Input
          placeholder="Search members..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-slate-800/50 border-slate-700 text-white"
        />
      </div>

      {/* Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMembers.map((member) => (
          <Card key={member.id} className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-all">
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white text-lg">{member.full_name}</h3>
                    {member.organization && (
                      <div className="flex items-center gap-1 mt-1">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <p className="text-xs text-slate-400">{member.organization}</p>
                      </div>
                    )}
                  </div>
                  <Badge variant="outline" className={`${tierColors[member.membership_tier]} border`}>
                    <Award className="w-3 h-3 mr-1" />
                    {member.membership_tier?.replace(/_/g, ' ')}
                  </Badge>
                </div>

                {/* Contact */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Mail className="w-3 h-3" />
                    <span className="truncate">{member.email}</span>
                  </div>
                  {member.phone && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Phone className="w-3 h-3" />
                      <span>{member.phone}</span>
                    </div>
                  )}
                </div>

                {/* Pledge */}
                {member.pledge_amount && (
                  <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-400" />
                        <span className="text-sm font-semibold text-green-300">
                          ${member.pledge_amount.toLocaleString()}
                        </span>
                      </div>
                      {member.pledge_frequency && (
                        <span className="text-xs text-green-400/70">
                          {member.pledge_frequency.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Join Date */}
                <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-700">
                  <Calendar className="w-3 h-3" />
                  <span>Joined {format(new Date(member.join_date || member.created_date), 'MMM d, yyyy')}</span>
                </div>

                {/* Status */}
                <div className="flex justify-between items-center">
                  <Badge className={
                    member.membership_status === 'active'
                      ? 'bg-green-500/20 text-green-300'
                      : 'bg-slate-500/20 text-slate-400'
                  }>
                    {member.membership_status}
                  </Badge>
                  {member.total_donated > 0 && (
                    <span className="text-xs text-slate-400">
                      Total donated: ${member.total_donated.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredMembers.length === 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-12 text-center">
            <Award className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">
              {searchTerm ? 'No members found matching your search.' : 'No members yet. Start converting leads!'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}