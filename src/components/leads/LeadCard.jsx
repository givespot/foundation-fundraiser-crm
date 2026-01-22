import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, Phone, Building2, Calendar, ArrowRight, PoundSterling, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Helper to get full name
const getFullName = (lead) => {
  if (lead.first_name && lead.last_name) return `${lead.first_name} ${lead.last_name}`;
  if (lead.first_name) return lead.first_name;
  if (lead.last_name) return lead.last_name;
  if (lead.full_name) return lead.full_name;
  return 'Unknown';
};

// Helper to get currency symbol
const getCurrencySymbol = (currency) => {
  const symbols = { GBP: '£', USD: '$', EUR: '€', CAD: 'C$', AUD: 'A$' };
  return symbols[currency] || currency || '£';
};

// Helper to get assigned user name
const getAssignedUserName = (assignedTo, allUsers) => {
  if (!assignedTo) return null;
  const user = allUsers?.find(u => u.id === assignedTo);
  if (user) {
    if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`;
    if (user.first_name) return user.first_name;
    return user.email;
  }
  return null;
};

export default function LeadCard({ lead, onStageChange, onDelete, stages, allUsers = [] }) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const interestColors = {
    high: 'bg-red-50 text-red-700 border-red-200',
    medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    low: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  const fullName = getFullName(lead);
  const assignedUserName = getAssignedUserName(lead.assigned_to, allUsers);

  const handleDelete = () => {
    if (onDelete) {
      onDelete(lead.id);
    }
    setShowDeleteDialog(false);
  };

  return (
    <>
      <Card className="bg-white border border-gray-200 hover:shadow-md transition-all group cursor-pointer">
        <CardContent className="p-4">
          <Link to={createPageUrl(`LeadDetails?id=${lead.id}`)}>
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                    {fullName}
                  </h4>
                  {(lead.organization || lead.company) && (
                    <div className="flex items-center gap-1 mt-1">
                      <Building2 className="w-3 h-3 text-gray-400" />
                      <p className="text-xs text-gray-500 line-clamp-1">{lead.organization || lead.company}</p>
                    </div>
                  )}
                </div>
                {lead.interest_level && (
                  <Badge variant="outline" className={`${interestColors[lead.interest_level] || interestColors.medium} border text-xs font-medium`}>
                    {lead.interest_level}
                  </Badge>
                )}
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
                  <PoundSterling className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-semibold text-green-700">
                    {getCurrencySymbol(lead.pledge_currency)}{Number(lead.pledge_amount).toLocaleString()}
                    {lead.pledge_frequency && (
                      <span className="text-xs text-green-600 ml-1 font-normal">
                        / {lead.pledge_frequency.replace(/_/g, ' ')}
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
                  <span>Follow-up: {format(new Date(lead.next_follow_up), 'dd/MM/yyyy')}</span>
                </div>
              )}

              {/* Assigned To */}
              {assignedUserName && (
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <span>Assigned to:</span>
                  <span className="text-gray-700 font-medium">{assignedUserName}</span>
                </div>
              )}
            </div>
          </Link>

          {/* Actions Row */}
          <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
            {/* Stage Change Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1 py-1.5 px-2 hover:bg-gray-50 rounded-md transition-colors font-medium">
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

            {/* Delete Button */}
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{fullName}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-200">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
