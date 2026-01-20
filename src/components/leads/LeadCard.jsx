import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, Building2, DollarSign, Calendar, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function LeadCard({ lead, onStageChange, stages }) {
  const interestColors = {
    high: 'bg-red-50 text-red-700 border-red-200',
    medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    low: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  return (
    <Card className="bg-white border border-gray-200 hover:shadow-md transition-all group cursor-pointer">
      <CardContent className="p-4">
        <Link to={createPageUrl(`LeadDetails?id=${lead.id}`)}>
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                  {lead.full_name}
                </h4>
                {lead.organization && (
                  <div className="flex items-center gap-1 mt-1">
                    <Building2 className="w-3 h-3 text-gray-400" />
                    <p className="text-xs text-gray-500 line-clamp-1">{lead.organization}</p>
                  </div>
                )}
              </div>
              <Badge variant="outline" className={`${interestColors[lead.interest_level]} border text-xs font-medium`}>
                {lead.interest_level}
              </Badge>
            </div>

            {/* Contact Info */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Mail className="w-3 h-3 text-gray-400" />
                <span className="truncate">{lead.email}</span>
              </div>
              {lead.phone && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Phone className="w-3 h-3 text-gray-400" />
                  <span>{lead.phone}</span>
                </div>
              )}
            </div>

            {/* Pledge Info */}
            {lead.pledge_amount && (
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="text-sm font-semibold text-green-700">
                  {lead.pledge_currency || 'USD'} {lead.pledge_amount.toLocaleString()}
                  {lead.pledge_frequency && (
                    <span className="text-xs text-green-600 ml-1 font-normal">
                      / {lead.pledge_frequency.replace('_', ' ')}
                    </span>
                  )}
                </span>
              </div>
            )}

            {/* Membership Tier */}
            {lead.membership_tier && (
              <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200 font-medium">
                {lead.membership_tier.replace(/_/g, ' ')}
              </Badge>
            )}

            {/* Next Follow-up */}
            {lead.next_follow_up && (
              <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-md">
                <Calendar className="w-3 h-3" />
                <span>Follow-up: {format(new Date(lead.next_follow_up), 'MMM d')}</span>
              </div>
            )}

            {/* Assigned To */}
            {lead.assigned_to && (
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <span>Assigned to:</span>
                <span className="text-gray-700 font-medium">{lead.assigned_to.split('@')[0]}</span>
              </div>
            )}
          </div>
        </Link>

        {/* Stage Change Dropdown */}
        <div className="mt-3 pt-3 border-t border-gray-200" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full text-xs text-gray-600 hover:text-gray-900 flex items-center justify-center gap-1 py-1.5 hover:bg-gray-50 rounded-md transition-colors font-medium">
              <span>Move stage</span>
              <ArrowRight className="w-3 h-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-white border-gray-200">
              {stages.map((stage) => (
                <DropdownMenuItem
                  key={stage.id}
                  onClick={() => onStageChange(lead.id, stage.id)}
                  className="text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                  disabled={lead.stage === stage.id}
                >
                  {stage.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}