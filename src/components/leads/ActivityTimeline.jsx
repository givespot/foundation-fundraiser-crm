import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Mail, Calendar, FileText, ArrowRight, UserCheck } from 'lucide-react';
import { format } from 'date-fns';

const activityIcons = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: FileText,
  status_change: ArrowRight,
  assignment: UserCheck,
};

const activityColors = {
  call: 'text-blue-400',
  email: 'text-purple-400',
  meeting: 'text-green-400',
  note: 'text-slate-400',
  status_change: 'text-amber-400',
  assignment: 'text-cyan-400',
};

export default function ActivityTimeline({ activities }) {
  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length > 0 ? (
          <div className="space-y-4">
            {activities.map((activity) => {
              const Icon = activityIcons[activity.activity_type] || FileText;
              const colorClass = activityColors[activity.activity_type] || 'text-slate-400';
              
              return (
                <div key={activity.id} className="flex gap-4">
                  <div className={`p-2 rounded-lg bg-slate-700/50 h-fit ${colorClass}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-white capitalize">
                          {activity.activity_type.replace('_', ' ')}
                        </p>
                        <p className="text-sm text-slate-300 mt-1">{activity.description}</p>
                      </div>
                      <span className="text-xs text-slate-500">
                        {format(new Date(activity.created_date), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    {activity.performed_by && (
                      <p className="text-xs text-slate-500 mt-1">
                        by {activity.performed_by}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-slate-400 text-sm text-center py-8">
            No activities yet. Start by logging your first interaction!
          </p>
        )}
      </CardContent>
    </Card>
  );
}