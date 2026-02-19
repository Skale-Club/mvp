import { useEffect, useState } from 'react';
import { useAdminAuth } from '@/context/AuthContext';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, Mail, LockKeyhole } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { CompanySettings } from '@shared/schema';

export default function AdminLogin() {
  const { isAdmin, loading, signIn } = useAdminAuth();
  const { data: companySettings } = useQuery<CompanySettings>({
    queryKey: ['/api/company-settings'],
  });
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [emailSubmitting, setEmailSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && isAdmin) {
      setLocation('/admin');
    }
  }, [loading, isAdmin, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSupabaseLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailSubmitting(true);

    try {
      await signIn(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setEmailSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <button
          type="button"
          onClick={() => { window.location.href = '/'; }}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors mb-6"
          data-testid="link-back-home"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>
        <Card className="w-full shadow-xl border-0">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto w-20 h-20 rounded-2xl flex items-center justify-center mb-6 overflow-hidden">
              {companySettings?.logoIcon ? (
                <img
                  src={companySettings.logoIcon}
                  alt="Logo"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                    if (fallback) fallback.classList.remove('hidden');
                  }}
                />
              ) : null}
              <img
                src="/favicon.svg"
                alt="Logo"
                className={`w-full h-full object-contain ${companySettings?.logoIcon ? 'hidden' : ''}`}
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  target.style.display = 'none';
                  const span = target.nextElementSibling as HTMLElement;
                  if (span) span.classList.remove('hidden');
                }}
              />
              <span className="text-2xl font-bold text-slate-800 hidden">
                {(companySettings?.companyName || 'SK').substring(0, 2).toUpperCase()}
              </span>
            </div>
            <CardTitle className="text-2xl font-semibold text-slate-900">
              {companySettings?.companyName || 'Skleanings'}
            </CardTitle>
            <CardDescription className="text-slate-600 mt-2">
              Sign in to access the admin dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md" data-testid="text-error">
                {error}
              </div>
            )}

            <form onSubmit={handleSupabaseLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@yourcompany.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-primary"
                    required
                    data-testid="input-email"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">Password</Label>
                <div className="relative">
                  <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-primary"
                    required
                    data-testid="input-password"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-medium shadow-md"
                disabled={emailSubmitting}
                data-testid="button-login"
              >
                {emailSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
