import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, TrendingUp, Users, DollarSign, Mail } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { format, subDays, isWithinInterval } from 'date-fns';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

export default function Reports() {
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list(),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.list(),
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['activities'],
    queryFn: () => base44.entities.Activity.list('-created_date', 1000),
  });

  const { data: sequences = [] } = useQuery({
    queryKey: ['sequences'],
    queryFn: () => base44.entities.EmailSequence.list(),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  // Filter data by date range
  const filterByDate = (items, dateField = 'created_date') => {
    return items.filter(item => {
      if (!item[dateField]) return false;
      const itemDate = new Date(item[dateField]);
      return isWithinInterval(itemDate, {
        start: new Date(dateRange.start),
        end: new Date(dateRange.end)
      });
    });
  };

  const filteredLeads = filterByDate(leads);
  const filteredMembers = filterByDate(members, 'join_date');
  const filteredActivities = filterByDate(activities, 'activity_date');

  // Lead Sources Analysis
  const leadSourcesData = Object.entries(
    filteredLeads.reduce((acc, lead) => {
      acc[lead.source || 'unknown'] = (acc[lead.source || 'unknown'] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ 
    name: name.replace(/_/g, ' ').toUpperCase(), 
    value 
  }));

  // Membership Tiers Analysis
  const membershipTiersData = Object.entries(
    filteredMembers.reduce((acc, member) => {
      acc[member.membership_tier] = (acc[member.membership_tier] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ 
    name: name.replace(/_/g, ' ').toUpperCase(), 
    value 
  }));

  // Lead Stage Distribution
  const stageData = Object.entries(
    filteredLeads.reduce((acc, lead) => {
      acc[lead.stage] = (acc[lead.stage] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ 
    name: name.replace(/_/g, ' ').toUpperCase(), 
    value 
  }));

  // Growth Over Time (last 30 days)
  const growthData = Array.from({ length: 30 }, (_, i) => {
    const date = subDays(new Date(dateRange.end), 29 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    
    return {
      date: format(date, 'MMM dd'),
      leads: leads.filter(l => l.created_date && l.created_date.startsWith(dateStr)).length,
      members: members.filter(m => m.join_date && m.join_date.startsWith(dateStr)).length,
    };
  });

  // Team Performance
  const teamPerformanceData = allUsers.map(user => {
    const userLeads = filteredLeads.filter(l => l.assigned_to === user.email);
    const userActivities = filteredActivities.filter(a => a.performed_by === user.email);
    
    return {
      name: user.full_name,
      leads: userLeads.length,
      activities: userActivities.length,
      converted: userLeads.filter(l => l.status === 'converted').length
    };
  }).filter(u => u.leads > 0 || u.activities > 0);

  // Campaign Performance
  const campaignData = sequences.map(seq => ({
    name: seq.name,
    sent: seq.total_sent || 0,
    opens: seq.total_opens || 0,
    clicks: seq.total_clicks || 0,
    openRate: seq.total_sent ? Math.round((seq.total_opens / seq.total_sent) * 100) : 0,
    clickRate: seq.total_sent ? Math.round((seq.total_clicks / seq.total_sent) * 100) : 0,
  }));

  // Key Metrics
  const conversionRate = filteredLeads.length > 0 
    ? Math.round((filteredMembers.length / filteredLeads.length) * 100) 
    : 0;

  const totalPledges = filteredMembers.reduce((sum, m) => sum + (m.pledge_amount || 0), 0);

  const avgPledge = filteredMembers.length > 0 
    ? Math.round(totalPledges / filteredMembers.length) 
    : 0;

  // CSV Export
  const exportToCSV = () => {
    const csvData = [
      ['Lead Reports - No Safe Margin Foundation'],
      ['Date Range', `${dateRange.start} to ${dateRange.end}`],
      [''],
      ['Summary Metrics'],
      ['Total Leads', filteredLeads.length],
      ['Total Members', filteredMembers.length],
      ['Conversion Rate', `${conversionRate}%`],
      ['Total Pledges', `$${totalPledges.toLocaleString()}`],
      ['Average Pledge', `$${avgPledge.toLocaleString()}`],
      [''],
      ['Lead Sources'],
      ['Source', 'Count'],
      ...leadSourcesData.map(d => [d.name, d.value]),
      [''],
      ['Membership Tiers'],
      ['Tier', 'Count'],
      ...membershipTiersData.map(d => [d.name, d.value]),
      [''],
      ['Team Performance'],
      ['Team Member', 'Leads', 'Activities', 'Converted'],
      ...teamPerformanceData.map(d => [d.name, d.leads, d.activities, d.converted]),
    ];

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${dateRange.start}-to-${dateRange.end}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Insights into your CRM performance</p>
        </div>
        <Button onClick={exportToCSV} className="bg-blue-600 hover:bg-blue-700">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Date Range Filter */}
      <Card className="bg-white border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <Label className="text-gray-700">Start Date</Label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                className="bg-white border-gray-200"
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label className="text-gray-700">End Date</Label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                className="bg-white border-gray-200"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setDateRange({
                start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
                end: format(new Date(), 'yyyy-MM-dd')
              })}
              className="border-gray-200"
            >
              Last 30 Days
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{filteredLeads.length}</div>
            <p className="text-sm text-gray-600">Total Leads</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{conversionRate}%</div>
            <p className="text-sm text-gray-600">Conversion Rate</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">${totalPledges.toLocaleString()}</div>
            <p className="text-sm text-gray-600">Total Pledges</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-orange-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{filteredActivities.length}</div>
            <p className="text-sm text-gray-600">Activities Logged</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Sources */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-lg font-semibold text-gray-900">Lead Sources</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={leadSourcesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Membership Tiers */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-lg font-semibold text-gray-900">Membership Tiers</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={membershipTiersData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {membershipTiersData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Stage Distribution */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-lg font-semibold text-gray-900">Lead Stage Distribution</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stageData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={120} />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Growth Over Time */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-lg font-semibold text-gray-900">Growth Trend (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={2} name="Leads" />
                <Line type="monotone" dataKey="members" stroke="#10b981" strokeWidth={2} name="Members" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Team Performance */}
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-lg font-semibold text-gray-900">Team Performance</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={teamPerformanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="leads" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Leads Assigned" />
              <Bar dataKey="activities" fill="#8b5cf6" radius={[8, 8, 0, 0]} name="Activities" />
              <Bar dataKey="converted" fill="#10b981" radius={[8, 8, 0, 0]} name="Converted" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Campaign Performance */}
      {campaignData.length > 0 && (
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-lg font-semibold text-gray-900">Email Campaign Performance</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={campaignData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="sent" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Sent" />
                <Bar dataKey="opens" fill="#8b5cf6" radius={[8, 8, 0, 0]} name="Opens" />
                <Bar dataKey="clicks" fill="#ec4899" radius={[8, 8, 0, 0]} name="Clicks" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}