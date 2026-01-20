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
          <SelectTrigger className="w-40 bg-slate-800/50 border-slate-700 text-white">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Assigned to" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all" className="text-slate-300">All Team</SelectItem>
            <SelectItem value="unassigned" className="text-slate-300">Unassigned</SelectItem>
            {users.map((user) => (
              <SelectItem key={user.email} value={user.email} className="text-slate-300">
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
        <SelectContent className="bg-slate-800 border-slate-700">
          <SelectItem value="all" className="text-slate-300">All Interest</SelectItem>
          <SelectItem value="high" className="text-slate-300">High</SelectItem>
          <SelectItem value="medium" className="text-slate-300">Medium</SelectItem>
          <SelectItem value="low" className="text-slate-300">Low</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.source}
        onValueChange={(value) => setFilters({ ...filters, source: value })}
      >
        <SelectTrigger className="w-40 bg-slate-800/50 border-slate-700 text-white">
          <SelectValue placeholder="Source" />
        </SelectTrigger>
        <SelectContent className="bg-slate-800 border-slate-700">
          <SelectItem value="all" className="text-slate-300">All Sources</SelectItem>
          <SelectItem value="website" className="text-slate-300">Website</SelectItem>
          <SelectItem value="referral" className="text-slate-300">Referral</SelectItem>
          <SelectItem value="event" className="text-slate-300">Event</SelectItem>
          <SelectItem value="social_media" className="text-slate-300">Social Media</SelectItem>
          <SelectItem value="email_campaign" className="text-slate-300">Email Campaign</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}