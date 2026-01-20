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
        <h1 className="text-3xl font-bold text-white mb-2">
          Welcome back, {user?.full_name?.split(' ')[0]}
        </h1>
        <p className="text-slate-400">Here's what's happening with your leads today</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Active Leads</CardTitle>
            <Users className="w-4 h-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{activeLeads}</div>
            <p className="text-xs text-slate-400 mt-1">
              {user?.role === 'admin' ? 'Total in pipeline' : 'Assigned to you'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Total Pledges</CardTitle>
            <DollarSign className="w-4 h-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">${totalPledges.toLocaleString()}</div>
            <p className="text-xs text-slate-400 mt-1">From active leads</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Conversion Rate</CardTitle>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{conversionRate}%</div>
            <p className="text-xs text-slate-400 mt-1">Leads to members</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Active Members</CardTitle>
            <Users className="w-4 h-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{members.length}</div>
            <p className="text-xs text-slate-400 mt-1">Supporting the foundation</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Stages */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Pipeline Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(stageBreakdown).map(([stage, count]) => (
                <div key={stage} className="flex items-center justify-between">
                  <span className="text-slate-300 capitalize">{stage.replace('_', ' ')}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${Math.min((count / activeLeads) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-white font-semibold w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Follow-ups */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">Upcoming Follow-ups</CardTitle>
            <Bell className="w-5 h-5 text-amber-400" />
          </CardHeader>
          <CardContent>
            {upcomingFollowUps.length > 0 ? (
              <div className="space-y-3">
                {upcomingFollowUps.map((lead) => (
                  <Link
                    key={lead.id}
                    to={createPageUrl(`LeadDetails?id=${lead.id}`)}
                    className="flex items-start gap-3 p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors"
                  >
                    <Calendar className="w-5 h-5 text-blue-400 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{lead.full_name}</p>
                      <p className="text-xs text-slate-400">
                        {format(new Date(lead.next_follow_up), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      lead.interest_level === 'high' 
                        ? 'bg-red-500/20 text-red-300'
                        : lead.interest_level === 'medium'
                        ? 'bg-yellow-500/20 text-yellow-300'
                        : 'bg-blue-500/20 text-blue-300'
                    }`}>
                      {lead.interest_level}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-sm text-center py-8">
                No upcoming follow-ups scheduled
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}