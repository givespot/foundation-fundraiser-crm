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
    high: 'bg-red-500/20 text-red-300 border-red-500/30',
    medium: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    low: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-all group">
      <CardContent className="p-4">
        <Link to={createPageUrl(`LeadDetails?id=${lead.id}`)}>
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                  {lead.full_name}
                </h4>
                {lead.organization && (
                  <div className="flex items-center gap-1 mt-1">
                    <Building2 className="w-3 h-3 text-slate-400" />
                    <p className="text-xs text-slate-400 line-clamp-1">{lead.organization}</p>
                  </div>
                )}
              </div>
              <Badge variant="outline" className={`${interestColors[lead.interest_level]} border text-xs`}>
                {lead.interest_level}
              </Badge>
            </div>

            {/* Contact Info */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Mail className="w-3 h-3" />
                <span className="truncate">{lead.email}</span>
              </div>
              {lead.phone && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Phone className="w-3 h-3" />
                  <span>{lead.phone}</span>
                </div>
              )}
            </div>

            {/* Pledge Info */}
            {lead.pledge_amount && (
              <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded border border-green-500/20">
                <DollarSign className="w-4 h-4 text-green-400" />
                <span className="text-sm font-semibold text-green-300">
                  ${lead.pledge_amount.toLocaleString()}
                  {lead.pledge_frequency && (
                    <span className="text-xs text-green-400/70 ml-1">
                      / {lead.pledge_frequency.replace('_', ' ')}
                    </span>
                  )}
                </span>
              </div>
            )}

            {/* Membership Tier */}
            {lead.membership_tier && (
              <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                {lead.membership_tier.replace(/_/g, ' ')}
              </Badge>
            )}

            {/* Next Follow-up */}
            {lead.next_follow_up && (
              <div className="flex items-center gap-2 text-xs text-amber-400">
                <Calendar className="w-3 h-3" />
                <span>Follow-up: {format(new Date(lead.next_follow_up), 'MMM d')}</span>
              </div>
            )}

            {/* Assigned To */}
            {lead.assigned_to && (
              <div className="text-xs text-slate-500 flex items-center gap-1">
                <span>Assigned to:</span>
                <span className="text-slate-400">{lead.assigned_to.split('@')[0]}</span>
              </div>
            )}
          </div>
        </Link>

        {/* Stage Change Dropdown */}
        <div className="mt-3 pt-3 border-t border-slate-700" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1 py-1 hover:bg-slate-700/30 rounded transition-colors">
              <span>Move stage</span>
              <ArrowRight className="w-3 h-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-slate-800 border-slate-700">
              {stages.map((stage) => (
                <DropdownMenuItem
                  key={stage.id}
                  onClick={() => onStageChange(lead.id, stage.id)}
                  className="text-slate-300 hover:text-white hover:bg-slate-700"
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