import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, TrendingUp, DollarSign, Bell, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function Dashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list(),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.list(),
  });

  // Filter for user's leads or all if admin
  const myLeads = user?.role === 'admin' 
    ? leads 
    : leads.filter(l => l.assigned_to === user?.email);

  // Calculate stats
  const activeLeads = myLeads.filter(l => l.status === 'active').length;
  const totalPledges = myLeads.reduce((sum, l) => sum + (l.pledge_amount || 0), 0);
  const conversionRate = myLeads.length > 0 
    ? ((myLeads.filter(l => l.status === 'converted').length / myLeads.length) * 100).toFixed(1)
    : 0;

  // Upcoming follow-ups
  const upcomingFollowUps = myLeads
    .filter(l => l.next_follow_up && l.status === 'active')
    .sort((a, b) => new Date(a.next_follow_up) - new Date(b.next_follow_up))
    .slice(0, 5);

  // Stage breakdown
  const stageBreakdown = {
    new: myLeads.filter(l => l.stage === 'new' && l.status === 'active').length,
    contacted: myLeads.filter(l => l.stage === 'contacted' && l.status === 'active').length,
    interested: myLeads.filter(l => l.stage === 'interested' && l.status === 'active').length,
    proposal_sent: myLeads.filter(l => l.stage === 'proposal_sent' && l.status === 'active').length,
    committed: myLeads.filter(l => l.stage === 'committed' && l.status === 'active').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          Welcome back, {user?.full_name?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-600">Here's what's happening with your leads today</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{activeLeads}</div>
            <p className="text-sm text-gray-600">Active Leads</p>
            <p className="text-xs text-gray-400 mt-1">
              {user?.role === 'admin' ? 'Total in pipeline' : 'Assigned to you'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">${totalPledges.toLocaleString()}</div>
            <p className="text-sm text-gray-600">Total Pledges</p>
            <p className="text-xs text-gray-400 mt-1">From active leads</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{conversionRate}%</div>
            <p className="text-sm text-gray-600">Conversion Rate</p>
            <p className="text-xs text-gray-400 mt-1">Leads to members</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{members.length}</div>
            <p className="text-sm text-gray-600">Active Members</p>
            <p className="text-xs text-gray-400 mt-1">Supporting the foundation</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Stages */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="border-b border-gray-100 pb-4">
            <CardTitle className="text-gray-900 text-lg font-semibold">Pipeline Overview</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {Object.entries(stageBreakdown).map(([stage, count]) => (
                <div key={stage} className="flex items-center justify-between">
                  <span className="text-gray-700 capitalize text-sm font-medium">{stage.replace('_', ' ')}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min((count / activeLeads) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-gray-900 font-semibold w-8 text-right text-sm">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Follow-ups */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="border-b border-gray-100 pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-gray-900 text-lg font-semibold">Upcoming Follow-ups</CardTitle>
            <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
              <Bell className="w-4 h-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {upcomingFollowUps.length > 0 ? (
              <div className="space-y-2">
                {upcomingFollowUps.map((lead) => (
                  <Link
                    key={lead.id}
                    to={createPageUrl(`LeadDetails?id=${lead.id}`)}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200"
                  >
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{lead.full_name}</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(lead.next_follow_up), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-md font-medium ${
                      lead.interest_level === 'high' 
                        ? 'bg-red-50 text-red-700'
                        : lead.interest_level === 'medium'
                        ? 'bg-yellow-50 text-yellow-700'
                        : 'bg-blue-50 text-blue-700'
                    }`}>
                      {lead.interest_level}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm text-center py-8">
                No upcoming follow-ups scheduled
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}