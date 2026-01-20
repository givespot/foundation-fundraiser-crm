import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mail, Eye, MousePointer, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { format } from 'date-fns';

export default function SequenceDetails() {
  const navigate = useNavigate();
  const [sequenceId, setSequenceId] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSequenceId(params.get('id'));
  }, []);

  const { data: sequence } = useQuery({
    queryKey: ['sequence', sequenceId],
    queryFn: () => base44.entities.EmailSequence.get(sequenceId),
    enabled: !!sequenceId,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['email-logs', sequenceId],
    queryFn: () => base44.entities.EmailLog.filter({ sequence_id: sequenceId }, '-sent_date'),
    enabled: !!sequenceId,
  });

  if (!sequence) return null;

  const calculateOpenRate = () => {
    if (!sequence.total_sent) return 0;
    return Math.round((sequence.total_opens / sequence.total_sent) * 100);
  };

  const calculateClickRate = () => {
    if (!sequence.total_sent) return 0;
    return Math.round((sequence.total_clicks / sequence.total_sent) * 100);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => navigate(createPageUrl('EmailSequences'))}
          className="border-gray-200"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{sequence.name}</h1>
            <Badge className={
              sequence.is_active
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-gray-50 text-gray-600 border-gray-200'
            }>
              {sequence.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          {sequence.description && (
            <p className="text-gray-600 mt-1">{sequence.description}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{sequence.total_sent || 0}</div>
            <p className="text-sm text-gray-600">Emails Sent</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <Eye className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{calculateOpenRate()}%</div>
            <p className="text-sm text-gray-600">Open Rate</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                <MousePointer className="w-5 h-5 text-orange-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{calculateClickRate()}%</div>
            <p className="text-sm text-gray-600">Click Rate</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{sequence.steps?.length || 0}</div>
            <p className="text-sm text-gray-600">Email Steps</p>
          </CardContent>
        </Card>
      </div>

      {/* Email Steps */}
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-lg font-semibold text-gray-900">Email Steps</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {sequence.steps?.map((step, index) => (
            <div key={index} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-semibold text-gray-900">Step {index + 1}</h4>
                  <p className="text-sm text-gray-500">
                    {step.delay_days === 0 ? 'Sent immediately' : `Sent ${step.delay_days} days after step ${index}`}
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <p className="text-sm font-medium text-gray-900 mb-1">Subject: {step.subject}</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{step.body}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Recent Emails */}
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-lg font-semibold text-gray-900">Recent Emails Sent</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {logs.length > 0 ? (
            <div className="space-y-3">
              {logs.slice(0, 10).map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{log.subject}</p>
                    <p className="text-xs text-gray-500">
                      Step {log.step_number + 1} • Sent {format(new Date(log.sent_date), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {log.opened && (
                      <Badge className="bg-purple-50 text-purple-700 border-purple-200">
                        <Eye className="w-3 h-3 mr-1" />
                        Opened
                      </Badge>
                    )}
                    {log.clicked && (
                      <Badge className="bg-orange-50 text-orange-700 border-orange-200">
                        <MousePointer className="w-3 h-3 mr-1" />
                        Clicked
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No emails sent yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}