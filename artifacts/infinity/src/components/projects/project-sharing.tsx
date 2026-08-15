import { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Link2,
  UserPlus,
  Mail,
  Calendar,
  Copy,
  Check,
  X,
  Trash2,
  ExternalLink,
  Loader2,
  Globe,
  Users,
  Shield,
} from 'lucide-react';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

export interface ProjectShare {
  id: string;
  permission: 'read' | 'collaborator';
  email: string | null;
  accessToken: string;
  shareUrl: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface CreateSharePayload {
  permission: 'read' | 'collaborator';
  email?: string;
  expiresInDays?: number;
}

function formatRelative(dateString: string | null): string {
  if (!dateString) return 'Never expires';
  const date = new Date(dateString);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  if (diff <= 0) return 'Expired';
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days === 1) return 'Expires tomorrow';
  if (days < 7) return `Expires in ${days} days`;
  if (days < 30) return `Expires in ${Math.ceil(days / 7)} weeks`;
  return date.toLocaleDateString();
}

export function ProjectSharing({ projectId }: { projectId: string }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [newSharePermission, setNewSharePermission] = useState<'read' | 'collaborator'>('read');
  const [newShareEmail, setNewShareEmail] = useState('');
  const [newShareExpiresInDays, setNewShareExpiresInDays] = useState<number | ''>('');
  const [baseUrl, setBaseUrl] = useState<string>('');

  // Use window.location.origin when available
  if (typeof window !== 'undefined' && !baseUrl) {
    setBaseUrl(window.location.origin);
  }

  // Fetch shares
  const { data: sharesData, isLoading, error, refetch } = useQuery({
    queryKey: ['project-shares', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/infinity/projects/${projectId}/shares`);
      if (!res.ok) throw new Error('Failed to fetch shares');
      return res.json() as Promise<{ shares: ProjectShare[] }>;
    },
    enabled: !!projectId,
  });

  // Create share mutation
  const createShareMutation = useMutation({
    mutationFn: async (payload: CreateSharePayload) => {
      const res = await fetch(`/api/infinity/projects/${projectId}/shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create share');
      }
      return res.json() as Promise<ProjectShare>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-shares', projectId] });
      setOpenCreateDialog(false);
      setNewShareEmail('');
      setNewShareExpiresInDays('');
      toast({ title: t('projectSharing.created'), description: t('projectSharing.createdDesc') });
    },
    onError: (err: Error) => {
      toast({ title: t('projectSharing.errorCreate'), description: err.message, variant: 'destructive' });
    },
  });

  // Delete share mutation
  const deleteShareMutation = useMutation({
    mutationFn: async (shareId: string) => {
      const res = await fetch(`/api/infinity/projects/${projectId}/shares/${shareId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete share');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-shares', projectId] });
      toast({ title: t('projectSharing.revoked'), description: t('projectSharing.revokedDesc') });
    },
    onError: (err: Error) => {
      toast({ title: t('projectSharing.errorDelete'), description: err.message, variant: 'destructive' });
    },
  });

  // Copy to clipboard helper
  const copyToClipboard = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: t('projectSharing.copied'), description: `${label} ${t('projectSharing.copiedDesc')}` });
    } catch {
      toast({ title: t('projectSharing.copyFailed'), variant: 'destructive' });
    }
  }, [t, toast]);

  const shares = sharesData?.shares ?? [];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/40 px-4 py-4">
        <div className="flex items-center gap-3">
          <Link2 className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-lg font-semibold">{t('projectSharing.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('projectSharing.description')}</p>
          </div>
        </div>
        <Button onClick={() => setOpenCreateDialog(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          {t('projectSharing.addShare')}
        </Button>
      </div>

      {/* Shares list */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">{t('projectSharing.loading')}</span>
          </div>
        ) : error ? (
          <div className="flex h-64 items-center justify-center text-destructive">
            <p>{t('projectSharing.errorLoad')}: {(error as Error).message}</p>
          </div>
        ) : shares.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex h-64 flex-col items-center justify-center gap-4 text-center text-muted-foreground"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
              <Link2 className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-medium">{t('projectSharing.emptyTitle')}</h3>
              <p className="mt-1 text-sm">{t('projectSharing.emptyDescription')}</p>
            </div>
            <Button onClick={() => setOpenCreateDialog(true)} className="mt-2 gap-2">
              <UserPlus className="h-4 w-4" />
              {t('projectSharing.addShare')}
            </Button>
          </motion.div>
        ) : (
          <ScrollArea className="h-full">
            <div className="space-y-3">
              {shares.map((share) => (
                <motion.div
                  key={share.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="liquid-glass rounded-xl border border-border/40 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <Badge variant="outline" className="gap-1">
                          {share.permission === 'collaborator' ? (
                            <>
                              <Users className="h-3 w-3" />
                              {t('projectSharing.collaborator')}
                            </>
                          ) : (
                            <>
                              <Globe className="h-3 w-3" />
                              {t('projectSharing.readOnly')}
                            </>
                          )}
                        </Badge>
                        {share.email && (
                          <Badge variant="secondary" className="gap-1">
                            <Mail className="h-3 w-3" />
                            {share.email}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatRelative(share.expiresAt)}
                        </Badge>
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground break-all">
                        <span className="font-mono bg-muted/50 px-2 py-0.5 rounded">
                          {share.shareUrl.startsWith('/') ? `${baseUrl}${share.shareUrl}` : share.shareUrl}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(
                            share.shareUrl.startsWith('/') ? `${baseUrl}${share.shareUrl}` : share.shareUrl,
                            t('projectSharing.shareLink')
                          )}
                          aria-label={t('projectSharing.copyLink')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(share.shareUrl.startsWith('/') ? `${baseUrl}${share.shareUrl}` : share.shareUrl, '_blank')}
                          aria-label={t('projectSharing.openLink')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteShareMutation.mutate(share.id)}
                        disabled={deleteShareMutation.isPending}
                        className="text-destructive hover:bg-destructive/10"
                        aria-label={t('projectSharing.revoke')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Create Share Dialog */}
      <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('projectSharing.createTitle')}</DialogTitle>
            <DialogDescription>{t('projectSharing.createDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('projectSharing.permission')}</Label>
              <Select value={newSharePermission} onValueChange={(v: string) => setNewSharePermission(v as 'read' | 'collaborator')}>
                <SelectTrigger>
                  <SelectValue placeholder={t('projectSharing.selectPermission')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="read">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      <span>{t('projectSharing.readOnly')}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="collaborator">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{t('projectSharing.collaborator')}</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {newSharePermission === 'collaborator'
                  ? t('projectSharing.collaboratorHint')
                  : t('projectSharing.readOnlyHint')}
              </p>
            </div>

            <div className="space-y-2">
              <Label>{t('projectSharing.email')}</Label>
              <Input
                type="email"
                placeholder={t('projectSharing.emailPlaceholder')}
                value={newShareEmail}
                onChange={(e) => setNewShareEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{t('projectSharing.emailHint')}</p>
            </div>

            <div className="space-y-2">
              <Label>{t('projectSharing.expiresIn')}</Label>
              <Select value={String(newShareExpiresInDays)} onValueChange={(v) => setNewShareExpiresInDays(v === '' ? '' : Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder={t('projectSharing.selectExpiry')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      <span>{t('projectSharing.neverExpires')}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="1">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{t('projectSharing.oneDay')}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="7">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{t('projectSharing.oneWeek')}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="30">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{t('projectSharing.oneMonth')}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="90">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{t('projectSharing.threeMonths')}</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenCreateDialog(false)}>
              {t('projectSharing.cancel')}
            </Button>
            <Button
              onClick={() => createShareMutation.mutate({
                permission: newSharePermission,
                email: newShareEmail.trim() || undefined,
                expiresInDays: newShareExpiresInDays === '' ? undefined : Number(newShareExpiresInDays),
              })}
              disabled={createShareMutation.isPending}
            >
              {createShareMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('projectSharing.creating')}
                </>
              ) : (
                t('projectSharing.create')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}