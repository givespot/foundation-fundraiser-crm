import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { MessageSquare, Send, Users, Clock } from 'lucide-react';
import { format } from 'date-fns';

// Helper function to safely format dates
const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return format(date, 'dd/MM/yyyy, HH:mm');
  } catch {
    return '';
  }
};

// Helper function to get user display name
const getUserName = (user) => {
  if (!user) return 'Unknown';
  if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`;
  if (user.first_name) return user.first_name;
  if (user.full_name) return user.full_name;
  return user.email || 'Unknown';
};

// Helper function to get initials
const getInitials = (user) => {
  if (!user) return '?';
  if (user.first_name) return user.first_name.charAt(0).toUpperCase();
  if (user.full_name) return user.full_name.charAt(0).toUpperCase();
  if (user.email) return user.email.charAt(0).toUpperCase();
  return '?';
};

export default function Messages() {
  const [user, setUser] = useState(null);
  const [messageForm, setMessageForm] = useState({
    to_user_id: 'all',
    body: '',
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['messages'],
    queryFn: () => base44.entities.Message.list('-created_at', 100),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list('-created_at'),
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.Message.create({
        from_user_id: user?.id,
        to_user_id: data.to_user_id === 'all' ? null : data.to_user_id,
        body: data.body,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      setMessageForm({ to_user_id: 'all', body: '' });
    },
  });

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (messageForm.body.trim()) {
      sendMessageMutation.mutate(messageForm);
    }
  };

  // Get current user's display name
  const currentUserName = getUserName(user);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Messages</h1>
          <p className="text-gray-600 mt-1">Communicate with your team members</p>
        </div>
        <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          {messages.length} message{messages.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Send Message Form - Left Side */}
        <div className="lg:col-span-1">
          <Card className="bg-white border-0 shadow-sm sticky top-6">
            <CardHeader className="border-b border-gray-100 pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Send className="w-5 h-5 text-blue-600" />
                New Message
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSendMessage} className="space-y-4">
                {/* Recipient Selection */}
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Send To</Label>
                  <Select
                    value={messageForm.to_user_id}
                    onValueChange={(value) => setMessageForm({...messageForm, to_user_id: value})}
                  >
                    <SelectTrigger className="bg-white border-gray-200">
                      <SelectValue placeholder="Select recipient" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      <SelectItem value="all">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-blue-600" />
                          <span className="font-medium">Everyone</span>
                        </div>
                      </SelectItem>
                      {allUsers
                        .filter(u => u.id !== user?.id)
                        .map((teamUser) => (
                          <SelectItem key={teamUser.id} value={teamUser.id}>
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs font-semibold">
                                  {getInitials(teamUser)}
                                </span>
                              </div>
                              <span>{getUserName(teamUser)}</span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Message Input - BIGGER */}
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Message</Label>
                  <Textarea
                    required
                    value={messageForm.body}
                    onChange={(e) => setMessageForm({...messageForm, body: e.target.value})}
                    placeholder="Type your message here..."
                    className="bg-white border-gray-200 min-h-[200px] resize-none text-base"
                  />
                </div>

                {/* Send Button */}
                <Button
                  type="submit"
                  disabled={sendMessageMutation.isPending || !messageForm.body.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 h-11"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {sendMessageMutation.isPending ? 'Sending...' : 'Send Message'}
                </Button>

                {/* Sending as indicator */}
                <p className="text-xs text-gray-500 text-center">
                  Sending as <span className="font-medium">{currentUserName}</span>
                </p>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Messages List - Right Side */}
        <div className="lg:col-span-2">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader className="border-b border-gray-100 pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                Message History
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {messagesLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
                  <p className="text-gray-500">Loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No messages yet</p>
                  <p className="text-gray-400 text-sm mt-1">Start a conversation with your team!</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[650px] overflow-y-auto pr-2">
                  {messages.map((msg) => {
                    const isMyMessage = msg.from_user_id === user?.id;
                    const sender = allUsers.find(u => u.id === msg.from_user_id);
                    const recipient = msg.to_user_id ? allUsers.find(u => u.id === msg.to_user_id) : null;
                    const senderName = getUserName(sender);
                    const recipientName = recipient ? getUserName(recipient) : null;
                    const messageDate = formatDate(msg.created_at);

                    return (
                      <div
                        key={msg.id}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          isMyMessage
                            ? 'bg-blue-50 border-blue-200 ml-6'
                            : 'bg-gray-50 border-gray-200 mr-6'
                        }`}
                      >
                        {/* Message Header */}
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                            isMyMessage 
                              ? 'bg-gradient-to-br from-blue-500 to-blue-700' 
                              : 'bg-gradient-to-br from-purple-500 to-purple-700'
                          }`}>
                            <span className="text-white text-base font-semibold">
                              {getInitials(sender)}
                            </span>
                          </div>

                          {/* Message Content */}
                          <div className="flex-1 min-w-0">
                            {/* From / To Line */}
                            <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mb-2">
                              <span className="font-semibold text-gray-900">
                                {isMyMessage ? 'You' : senderName}
                              </span>
                              <span className="text-gray-400">→</span>
                              {recipient ? (
                                <span className="text-purple-600 font-medium">
                                  {recipientName}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-blue-600 font-medium bg-blue-100 px-2 py-0.5 rounded-full text-sm">
                                  <Users className="w-3 h-3" />
                                  Everyone
                                </span>
                              )}
                            </div>

                            {/* Message Body */}
                            <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
                              <p className="text-gray-800 text-sm whitespace-pre-wrap break-words leading-relaxed">
                                {msg.body || <span className="text-gray-400 italic">No message content</span>}
                              </p>
                            </div>

                            {/* Timestamp */}
                            <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                              <Clock className="w-3 h-3" />
                              <span>{messageDate || 'Unknown time'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
