import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter } from 'lucide-react';

export default function LeadFilters({ filters, setFilters, users, isAdmin }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {isAdmin && (
        <Select
          value={filters.assignedTo}
          onValueChange={(value) => setFilters({ ...filters, assignedTo: value })}
        >
          <SelectTrigger className="w-40 bg-white border-gray-200 text-gray-900 h-10 rounded-lg shadow-sm">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Assigned to" />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-200">
            <SelectItem value="all" className="text-gray-900">All Team</SelectItem>
            <SelectItem value="unassigned" className="text-gray-900">Unassigned</SelectItem>
            {users.map((user) => (
              <SelectItem key={user.email} value={user.email} className="text-gray-900">
                {user.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select
        value={filters.interestLevel}
        onValueChange={(value) => setFilters({ ...filters, interestLevel: value })}
      >
        <SelectTrigger className="w-40 bg-slate-800/50 border-slate-700 text-white">
          <SelectValue placeholder="Interest" />
        </SelectTrigger>
        <SelectContent className="bg-white border-gray-200">
          <SelectItem value="all" className="text-gray-900">All Interest</SelectItem>
          <SelectItem value="high" className="text-gray-900">High</SelectItem>
          <SelectItem value="medium" className="text-gray-900">Medium</SelectItem>
          <SelectItem value="low" className="text-gray-900">Low</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.source}
        onValueChange={(value) => setFilters({ ...filters, source: value })}
      >
        <SelectTrigger className="w-40 bg-slate-800/50 border-slate-700 text-white">
          <SelectValue placeholder="Source" />
        </SelectTrigger>
        <SelectContent className="bg-white border-gray-200">
          <SelectItem value="all" className="text-gray-900">All Sources</SelectItem>
          <SelectItem value="website" className="text-gray-900">Website</SelectItem>
          <SelectItem value="referral" className="text-gray-900">Referral</SelectItem>
          <SelectItem value="event" className="text-gray-900">Event</SelectItem>
          <SelectItem value="social_media" className="text-gray-900">Social Media</SelectItem>
          <SelectItem value="email_campaign" className="text-gray-900">Email Campaign</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}