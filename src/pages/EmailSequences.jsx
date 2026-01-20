import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Mail, TrendingUp, Eye, MousePointer, Power, PowerOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function EmailSequences() {
  const queryClient = useQueryClient();

  const { data: sequences = [] } = useQuery({
    queryKey: ['sequences'],
    queryFn: () => base44.entities.EmailSequence.list('-created_date'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.EmailSequence.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequences'] });
    },
  });

  const getTriggerLabel = (sequence) => {
    if (sequence.trigger_type === 'stage_change') {
      return `Stage: ${sequence.trigger_stage?.replace('_', ' ')}`;
    } else if (sequence.trigger_type === 'inactivity') {
      return `Inactive ${sequence.inactivity_days} days`;
    }
    return 'Manual';
  };

  const calculateOpenRate = (sequence) => {
    if (!sequence.total_sent) return 0;
    return Math.round((sequence.total_opens / sequence.total_sent) * 100);
  };

  const calculateClickRate = (sequence) => {
    if (!sequence.total_sent) return 0;
    return Math.round((sequence.total_clicks / sequence.total_sent) * 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Sequences</h1>
          <p className="text-gray-600 mt-1">AI-powered automated follow-up campaigns</p>
        </div>
        <Link to={createPageUrl('CreateSequence')}>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Create Sequence
          </Button>
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {sequences.filter(s => s.is_active).length}
            </div>
            <p className="text-sm text-gray-600">Active Sequences</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {sequences.reduce((sum, s) => sum + (s.total_sent || 0), 0)}
            </div>
            <p className="text-sm text-gray-600">Total Emails Sent</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <Eye className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {sequences.reduce((sum, s) => sum + (s.total_opens || 0), 0)}
            </div>
            <p className="text-sm text-gray-600">Total Opens</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                <MousePointer className="w-5 h-5 text-orange-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {sequences.reduce((sum, s) => sum + (s.total_clicks || 0), 0)}
            </div>
            <p className="text-sm text-gray-600">Total Clicks</p>
          </CardContent>
        </Card>
      </div>

      {/* Sequences List */}
      <div className="grid grid-cols-1 gap-4">
        {sequences.map((sequence) => (
          <Card key={sequence.id} className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{sequence.name}</h3>
                    <Badge className={
                      sequence.is_active
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-gray-50 text-gray-600 border-gray-200'
                    }>
                      {sequence.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {getTriggerLabel(sequence)}
                    </Badge>
                  </div>
                  {sequence.description && (
                    <p className="text-sm text-gray-600 mb-4">{sequence.description}</p>
                  )}

                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-700">
                        <span className="font-semibold">{sequence.steps?.length || 0}</span> steps
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-700">
                        <span className="font-semibold">{sequence.total_sent || 0}</span> sent
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-purple-400" />
                      <span className="text-sm text-gray-700">
                        <span className="font-semibold">{calculateOpenRate(sequence)}%</span> open rate
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MousePointer className="w-4 h-4 text-orange-400" />
                      <span className="text-sm text-gray-700">
                        <span className="font-semibold">{calculateClickRate(sequence)}%</span> click rate
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActiveMutation.mutate({
                      id: sequence.id,
                      is_active: !sequence.is_active
                    })}
                    className="border-gray-200"
                  >
                    {sequence.is_active ? (
                      <>
                        <PowerOff className="w-4 h-4 mr-1" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Power className="w-4 h-4 mr-1" />
                        Activate
                      </>
                    )}
                  </Button>
                  <Link to={createPageUrl(`SequenceDetails?id=${sequence.id}`)}>
                    <Button variant="outline" size="sm" className="border-gray-200">
                      View Details
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {sequences.length === 0 && (
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No sequences yet</h3>
              <p className="text-gray-600 mb-4">Create your first automated email sequence</p>
              <Link to={createPageUrl('CreateSequence')}>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Sequence
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}