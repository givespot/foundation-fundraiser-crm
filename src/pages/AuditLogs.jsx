import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Shield, Search, FileText, User, Users, Award, Mail } from 'lucide-react';
import { format } from 'date-fns';

const actionColors = {
  lead_created: 'bg-blue-50 text-blue-700 border-blue-200',
  lead_updated: 'bg-blue-50 text-blue-700 border-blue-200',
  lead_deleted: 'bg-red-50 text-red-700 border-red-200',
  lead_converted: 'bg-green-50 text-green-700 border-green-200',
  member_created: 'bg-green-50 text-green-700 border-green-200',
  member_updated: 'bg-blue-50 text-blue-700 border-blue-200',
  member_deleted: 'bg-red-50 text-red-700 border-red-200',
  user_invited: 'bg-purple-50 text-purple-700 border-purple-200',
  user_updated: 'bg-blue-50 text-blue-700 border-blue-200',
  user_deactivated: 'bg-orange-50 text-orange-700 border-orange-200',
  user_activated: 'bg-green-50 text-green-700 border-green-200',
  sequence_created: 'bg-purple-50 text-purple-700 border-purple-200',
  sequence_updated: 'bg-blue-50 text-blue-700 border-blue-200',
  sequence_deleted: 'bg-red-50 text-red-700 border-red-200',
};

const entityIcons = {
  Lead: Users,
  Member: Award,
  User: User,
  EmailSequence: Mail,
};

export default function AuditLogs() {
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: logs = [] } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => base44.entities.AuditLog.list('-created_date', 100),
  });

  const filteredLogs = logs.filter(log =>
    log.performed_by?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.details?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check if user is admin
  if (user?.role !== 'admin') {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Admin Access Required</h2>
            <p className="text-gray-600">You need admin privileges to view audit logs.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-gray-600 mt-1">Track all changes and activities in the system</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="text-3xl font-bold text-gray-900">{logs.length}</div>
            <p className="text-sm text-gray-600">Total Actions</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="text-3xl font-bold text-gray-900">
              {logs.filter(l => l.action?.includes('created')).length}
            </div>
            <p className="text-sm text-gray-600">Items Created</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="text-3xl font-bold text-gray-900">
              {logs.filter(l => l.action?.includes('updated')).length}
            </div>
            <p className="text-sm text-gray-600">Items Updated</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="text-3xl font-bold text-gray-900">
              {logs.filter(l => l.action?.includes('deleted')).length}
            </div>
            <p className="text-sm text-gray-600">Items Deleted</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
        <Input
          placeholder="Search logs by user, action, or details..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-white border-gray-200"
        />
      </div>

      {/* Logs List */}
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader className="border-b border-gray-100 pb-4">
          <CardTitle className="text-lg font-semibold text-gray-900">Activity History</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {filteredLogs.map((log) => {
              const Icon = entityIcons[log.entity_type] || FileText;
              return (
                <div
                  key={log.id}
                  className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={actionColors[log.action] || 'bg-gray-50 text-gray-700 border-gray-200'}>
                            {log.action?.replace(/_/g, ' ')}
                          </Badge>
                          <span className="text-sm text-gray-500">{log.entity_type}</span>
                        </div>
                        <p className="text-sm text-gray-900 mb-1">{log.details}</p>
                        <p className="text-xs text-gray-500">
                          by {log.performed_by} • {format(new Date(log.created_date), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredLogs.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">
                  {searchTerm ? 'No logs found matching your search.' : 'No audit logs yet.'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}