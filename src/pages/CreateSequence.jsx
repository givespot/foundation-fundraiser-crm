import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, ArrowLeft, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function CreateSequence() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trigger_type: 'stage_change',
    trigger_stage: 'new',
    inactivity_days: 7,
    steps: [
      { order: 1, delay_days: 0, subject: '', body: '' }
    ]
  });

  const createSequenceMutation = useMutation({
    mutationFn: (data) => base44.entities.EmailSequence.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequences'] });
      navigate(createPageUrl('EmailSequences'));
    },
  });

  const addStep = () => {
    setFormData({
      ...formData,
      steps: [...formData.steps, {
        order: formData.steps.length + 1,
        delay_days: 1,
        subject: '',
        body: ''
      }]
    });
  };

  const removeStep = (index) => {
    if (formData.steps.length === 1) return;
    const newSteps = formData.steps.filter((_, i) => i !== index);
    setFormData({ ...formData, steps: newSteps });
  };

  const updateStep = (index, field, value) => {
    const newSteps = [...formData.steps];
    newSteps[index][field] = value;
    setFormData({ ...formData, steps: newSteps });
  };

  const generateAIContent = async (index) => {
    const step = formData.steps[index];
    const prompt = `Generate a professional follow-up email for a foundation seeking donations.
    This is step ${index + 1} of an email sequence.
    ${index === 0 ? 'This is the first email introducing our cause.' : `This is a follow-up email ${index} days after the previous message.`}
    
    Trigger: ${formData.trigger_type === 'stage_change' ? `Lead reached ${formData.trigger_stage} stage` : `Lead inactive for ${formData.inactivity_days} days`}
    
    Generate a compelling subject line and email body that is warm, professional, and encourages engagement.`;

    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            subject: { type: "string" },
            body: { type: "string" }
          }
        }
      });

      updateStep(index, 'subject', response.subject);
      updateStep(index, 'body', response.body);
    } catch (error) {
      console.error('Failed to generate AI content:', error);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createSequenceMutation.mutate({
      ...formData,
      is_active: true,
      total_sent: 0,
      total_opens: 0,
      total_clicks: 0
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => navigate(createPageUrl('EmailSequences'))}
          className="border-gray-200"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Email Sequence</h1>
          <p className="text-gray-600 mt-1">Set up automated follow-up campaigns</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-lg font-semibold text-gray-900">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-700">Sequence Name *</Label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Welcome Series"
                className="bg-white border-gray-200"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700">Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Describe the purpose of this sequence..."
                className="bg-white border-gray-200"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Trigger Settings */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-lg font-semibold text-gray-900">Trigger Settings</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-700">Trigger Type *</Label>
              <Select
                value={formData.trigger_type}
                onValueChange={(value) => setFormData({...formData, trigger_type: value})}
              >
                <SelectTrigger className="bg-white border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="stage_change">Lead Stage Change</SelectItem>
                  <SelectItem value="inactivity">Lead Inactivity</SelectItem>
                  <SelectItem value="manual">Manual Trigger</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.trigger_type === 'stage_change' && (
              <div className="space-y-2">
                <Label className="text-gray-700">Trigger Stage *</Label>
                <Select
                  value={formData.trigger_stage}
                  onValueChange={(value) => setFormData({...formData, trigger_stage: value})}
                >
                  <SelectTrigger className="bg-white border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="interested">Interested</SelectItem>
                    <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
                    <SelectItem value="committed">Committed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.trigger_type === 'inactivity' && (
              <div className="space-y-2">
                <Label className="text-gray-700">Inactivity Days *</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.inactivity_days}
                  onChange={(e) => setFormData({...formData, inactivity_days: parseInt(e.target.value)})}
                  className="bg-white border-gray-200"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Email Steps */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="border-b border-gray-100 flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900">Email Steps</CardTitle>
            <Button type="button" onClick={addStep} variant="outline" size="sm" className="border-gray-200">
              <Plus className="w-4 h-4 mr-1" />
              Add Step
            </Button>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {formData.steps.map((step, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-900">Step {index + 1}</h4>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => generateAIContent(index)}
                      className="border-gray-200"
                    >
                      <Sparkles className="w-4 h-4 mr-1" />
                      AI Generate
                    </Button>
                    {formData.steps.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeStep(index)}
                        className="border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700">Delay (days)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={step.delay_days}
                    onChange={(e) => updateStep(index, 'delay_days', parseInt(e.target.value))}
                    className="bg-white border-gray-200"
                  />
                  <p className="text-xs text-gray-500">
                    {index === 0 ? 'Sent immediately when triggered' : `Sent ${step.delay_days} days after step ${index}`}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700">Subject Line *</Label>
                  <Input
                    required
                    value={step.subject}
                    onChange={(e) => updateStep(index, 'subject', e.target.value)}
                    placeholder="Your email subject..."
                    className="bg-white border-gray-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700">Email Body *</Label>
                  <Textarea
                    required
                    value={step.body}
                    onChange={(e) => updateStep(index, 'body', e.target.value)}
                    placeholder="Write your email content here..."
                    className="bg-white border-gray-200"
                    rows={6}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(createPageUrl('EmailSequences'))}
            className="border-gray-200"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createSequenceMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {createSequenceMutation.isPending ? 'Creating...' : 'Create Sequence'}
          </Button>
        </div>
      </form>
    </div>
  );
}