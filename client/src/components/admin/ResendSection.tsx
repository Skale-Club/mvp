import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check } from 'lucide-react';
import type { ResendSettingsForm } from '@/components/admin/shared/types';
import type { ResendSettings } from '@shared/schema';

export function ResendSection() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<ResendSettingsForm>({
    enabled: false,
    apiKey: '',
    fromEmail: '',
    fromName: '',
    toEmails: [],
    notifyOnNewLead: true,
    notifyOnNewContact: true
  });
  const [newRecipient, setNewRecipient] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string | null>(null);

  const { data: resendSettings, isLoading } = useQuery<ResendSettings>({
    queryKey: ['/api/integrations/resend']
  });

  useEffect(() => {
    if (resendSettings) {
      const recipients = (resendSettings.toEmails && resendSettings.toEmails.length)
        ? resendSettings.toEmails
        : [];

      setSettings({
        enabled: resendSettings.enabled ?? false,
        apiKey: resendSettings.apiKey ?? '',
        fromEmail: resendSettings.fromEmail ?? '',
        fromName: resendSettings.fromName ?? '',
        toEmails: recipients,
        notifyOnNewLead: resendSettings.notifyOnNewLead ?? true,
        notifyOnNewContact: resendSettings.notifyOnNewContact ?? true,
      });
    }
  }, [resendSettings]);

  const handleAddRecipient = () => {
    const cleaned = newRecipient.trim();
    if (!cleaned) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address',
        variant: 'destructive'
      });
      return;
    }
    if (settings.toEmails.includes(cleaned)) {
      setNewRecipient('');
      return;
    }
    const updated = [...settings.toEmails, cleaned];
    setSettings(prev => ({ ...prev, toEmails: updated }));
    setNewRecipient('');
  };

  const handleRemoveRecipient = (value: string) => {
    const updated = settings.toEmails.filter(email => email !== value);
    setSettings(prev => ({ ...prev, toEmails: updated }));
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      await apiRequest('PUT', '/api/integrations/resend', {
        ...settings,
        toEmails: settings.toEmails
      });
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/resend'] });
      toast({ title: 'Resend settings saved successfully' });
    } catch (error: any) {
      toast({
        title: 'Failed to save Resend settings',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async () => {
    setIsTesting(true);
    setTestResult('idle');
    setTestMessage(null);
    try {
      const response = await apiRequest('POST', '/api/integrations/resend/test', {
        apiKey: settings.apiKey,
        fromEmail: settings.fromEmail,
        fromName: settings.fromName,
        toEmails: settings.toEmails
      });
      await response.json();

      setTestResult('success');
      setTestMessage('Test email sent successfully!');
      toast({ title: 'Test successful', description: 'Check your inbox for the test email.' });
    } catch (error: any) {
      setTestResult('error');
      // apiRequest throws "status: message" — extract the message part
      const msg = error.message?.replace(/^\d+:\s*/, '') || 'Connection failed';
      let parsed: string = msg;
      try {
        const obj = JSON.parse(msg);
        parsed = obj.message || msg;
      } catch { /* not JSON, use as-is */ }
      setTestMessage(parsed);
      toast({
        title: 'Test failed',
        description: parsed,
        variant: 'destructive'
      });
    } finally {
      setIsTesting(false);
    }
  };

  // If settings were already enabled on the server, allow toggle without re-testing
  const wasPreviouslyEnabled = resendSettings?.enabled ?? false;
  const hasSavedKey = resendSettings?.apiKey === '********';

  const handleToggleEnabled = async (checked: boolean) => {
    if (checked && !settings.toEmails.length) {
      toast({
        title: 'Add at least one recipient',
        description: 'Include at least one To email before enabling Resend.',
        variant: 'destructive'
      });
      return;
    }
    // Require test only if never tested in this session AND no previously saved working config
    if (checked && testResult !== 'success' && !(hasSavedKey && wasPreviouslyEnabled)) {
      toast({
        title: 'Please run Test Connection',
        description: 'You must have a successful test before enabling Resend.',
        variant: 'destructive'
      });
      return;
    }
    const newSettings = { ...settings, enabled: checked };
    setSettings(newSettings);
    setIsSaving(true);
    try {
      await apiRequest('PUT', '/api/integrations/resend', newSettings);
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/resend'] });
      toast({ title: checked ? 'Resend enabled' : 'Resend disabled' });
    } catch (error: any) {
      toast({
        title: 'Failed to update settings',
        description: error.message,
        variant: 'destructive'
      });
      setSettings(prev => ({ ...prev, enabled: !checked }));
    } finally {
      setIsSaving(false);
    }
  };

  const testButtonClass =
    testResult === 'success'
      ? 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200'
      : testResult === 'error'
      ? 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200'
      : '';

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <Card className="border-0 bg-muted">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#1C53A3] flex items-center justify-center">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
              </div>
              <div>
                <CardTitle className="text-lg">Resend Email</CardTitle>
                <p className="text-sm text-muted-foreground">Send email notifications for new leads and contacts</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isSaving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              <Label className="text-sm">
                {settings.enabled ? 'Enabled' : 'Disabled'}
              </Label>
              <Switch
                checked={settings.enabled}
                onCheckedChange={handleToggleEnabled}
                disabled={isSaving}
                data-testid="switch-resend-enabled"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="resend-api-key">API Key</Label>
              <Input
                id="resend-api-key"
                type="password"
                value={settings.apiKey}
                onChange={(e) => setSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                data-testid="input-resend-api-key"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resend-from-name">From Name</Label>
              <Input
                id="resend-from-name"
                type="text"
                value={settings.fromName}
                onChange={(e) => setSettings(prev => ({ ...prev, fromName: e.target.value }))}
                placeholder="Your Company Name"
                data-testid="input-resend-from-name"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="resend-from-email">From Email</Label>
              <Input
                id="resend-from-email"
                type="email"
                value={settings.fromEmail}
                onChange={(e) => setSettings(prev => ({ ...prev, fromEmail: e.target.value }))}
                placeholder="noreply@yourdomain.com"
                data-testid="input-resend-from-email"
              />
              <p className="text-xs text-muted-foreground">
                Verified email in your Resend account
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="resend-to-email">To Emails</Label>
              <div className="flex gap-2">
                <Input
                  id="resend-to-email"
                  type="email"
                  value={newRecipient}
                  onChange={(e) => setNewRecipient(e.target.value)}
                  placeholder="admin@yourdomain.com"
                  data-testid="input-resend-to-email"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddRecipient}
                  disabled={!newRecipient.trim()}
                >
                  + Add
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Email addresses to receive notifications</p>
              {settings.toEmails.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {settings.toEmails.map((email) => (
                    <div
                      key={email}
                      className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-sm"
                    >
                      <span>{email}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveRecipient(email)}
                        className="h-6 px-2"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="notify-new-lead"
                checked={settings.notifyOnNewLead}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, notifyOnNewLead: checked as boolean }))}
                data-testid="checkbox-notify-new-lead"
              />
              <Label htmlFor="notify-new-lead" className="text-sm font-normal cursor-pointer">
                Email when a new lead form is completed
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="notify-new-contact"
                checked={settings.notifyOnNewContact}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, notifyOnNewContact: checked as boolean }))}
                data-testid="checkbox-notify-new-contact"
              />
              <Label htmlFor="notify-new-contact" className="text-sm font-normal cursor-pointer">
                Email when contact form is submitted
              </Label>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t">
            <Button
              onClick={saveSettings}
              disabled={isSaving}
              data-testid="button-save-resend"
            >
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Settings
            </Button>
            <Button
              variant="outline"
              className={testButtonClass}
              onClick={testConnection}
              disabled={
                isTesting
                || !settings.apiKey
                || !settings.fromEmail
                || !settings.toEmails.length
              }
              data-testid="button-test-resend"
            >
              {isTesting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {testResult === 'success' ? 'Test OK' : testResult === 'error' ? 'Test Failed' : 'Send Test Email'}
            </Button>
          </div>

          {testMessage && (
            <div className={`p-3 rounded-lg text-sm ${
              testResult === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
            }`}>
              {testMessage}
            </div>
          )}

          {settings.enabled && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <Check className="w-4 h-4" />
                <span className="font-medium text-sm">Resend is enabled</span>
              </div>
              <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                You'll receive email notifications when new leads or contacts are submitted
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}