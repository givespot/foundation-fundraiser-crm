import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { MessageSquare, Send, Users } from 'lucide-react';
import { format } from 'date-fns';

export default function Messages() {
  const [user, setUser] = useState(null);
  const [messageForm, setMessageForm] = useState({
    to_user: 'all',
    message: '',
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: messages = [] } = useQuery({
    queryKey: ['messages'],
    queryFn: () => base44.entities.Message.list('-created_date', 100),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list('-created_date'),
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.Message.create({
        from_user: user?.email,
        to_user: data.to_user === 'all' ? null : data.to_user,
        message: data.message,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      setMessageForm({ to_user: 'all', message: '' });
    },
  });

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (messageForm.message.trim()) {
      sendMessageMutation.mutate(messageForm);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Team Messages</h1>
        <p className="text-gray-600 mt-1">Communicate with your team</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Send Message Form */}
        <div className="lg:col-span-1">
          <Card className="bg-white border-0 shadow-sm sticky top-6">
            <CardHeader className="border-b border-gray-100 pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Send className="w-5 h-5" />
                Send Message
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSendMessage} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">To</Label>
                  <Select
                    value={messageForm.to_user}
                    onValueChange={(value) => setMessageForm({...messageForm, to_user: value})}
                  >
                    <SelectTrigger className="bg-white border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      <SelectItem value="all">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Everyone
                        </div>
                      </SelectItem>
                      {allUsers
                        .filter(u => u.email !== user?.email)
                        .map((teamUser) => (
                          <SelectItem key={teamUser.id} value={teamUser.email}>
                            {teamUser.full_name || teamUser.email}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700">Message</Label>
                  <Textarea
                    required
                    value={messageForm.message}
                    onChange={(e) => setMessageForm({...messageForm, message: e.target.value})}
                    placeholder="Type your message here..."
                    className="bg-white border-gray-200 min-h-[120px]"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={sendMessageMutation.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {sendMessageMutation.isPending ? 'Sending...' : 'Send Message'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Messages List */}
        <div className="lg:col-span-2">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader className="border-b border-gray-100 pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                All Messages ({messages.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {messages.map((msg) => {
                  const isMyMessage = msg.from_user === user?.email;
                  const sender = allUsers.find(u => u.email === msg.from_user);
                  const recipient = msg.to_user ? allUsers.find(u => u.email === msg.to_user) : null;

                  return (
                    <div
                      key={msg.id}
                      className={`p-4 rounded-lg border ${
                        isMyMessage 
                          ? 'bg-blue-50 border-blue-200 ml-8' 
                          : 'bg-white border-gray-200 mr-8'
                      }`}
                    >
                      <div className="flex items-start gap-3 mb-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-sm font-semibold">
                            {sender?.full_name?.charAt(0) || msg.from_user?.charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <div>
                              <p className="font-medium text-gray-900 text-sm">
                                {sender?.full_name || msg.from_user}
                              </p>
                              <p className="text-xs text-gray-500">
                                To: {recipient ? (recipient.full_name || recipient.email) : 'Everyone'}
                              </p>
                            </div>
                            <span className="text-xs text-gray-500">
                              {format(new Date(msg.created_date), 'MMM d, h:mm a')}
                            </span>
                          </div>
                          <p className="text-gray-700 text-sm whitespace-pre-wrap">{msg.message}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {messages.length === 0 && (
                  <div className="text-center py-12">
                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No messages yet. Start a conversation!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}