import { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Download,
  FileText,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  RotateCcw,
  ArrowUpRight,
  Package,
  X,
} from 'lucide-react';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

export interface ProjectExport {
  id: string;
  status: 'pending' | 'ready' | 'failed';
  fileUrl: string | null;
  error: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export function ProjectExport({ projectId }: { projectId: string }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [activeExportId, setActiveExportId] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Fetch exports
  const { data: exportsData, isLoading, error, refetch } = useQuery({
    queryKey: ['project-exports', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/infinity/projects/${projectId}/export`);
      if (!res.ok) throw new Error('Failed to fetch exports');
      return res.json() as Promise<{ exports: ProjectExport[] }>;
    },
    enabled: !!projectId,
  });

  // Start export mutation
  const startExportMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/infinity/projects/${projectId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to start export');
      }
      return res.json() as Promise<{ exportId: string; status: string; fileUrl: string; expiresAt: string }>;
    },
    onSuccess: (data) => {
      setOpenCreateDialog(false);
      setActiveExportId(data.exportId);
      queryClient.invalidateQueries({ queryKey: ['project-exports', projectId] });
      toast({ title: t('projectExports.started'), description: t('projectExports.startedDesc') });
    },
    onError: (err: Error) => {
      toast({ title: t('projectExports.errorStart'), description: err.message, variant: 'destructive' });
    },
  });

  // Download export
  const downloadExport = useCallback(async (exportId: string, fileUrl: string) => {
    try {
      const res = await fetch(fileUrl);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project-export-${exportId.slice(0, 8)}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ title: t('projectExports.downloaded'), description: t('projectExports.downloadedDesc') });
    } catch (err) {
      toast({ title: t('projectExports.errorDownload'), description: (err as Error).message, variant: 'destructive' });
    }
  }, [t, toast]);

  // Poll export status
  const pollExport = useCallback(async (exportId: string) => {
    try {
      const res = await fetch(`/api/infinity/projects/${projectId}/export/${exportId}/status`);
      if (!res.ok) throw new Error('Failed to poll status');
      const data = await res.json() as ProjectExport;
      if (data.status === 'ready' && data.fileUrl) {
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
        queryClient.invalidateQueries({ queryKey: ['project-exports', projectId] });
        toast({ title: t('projectExports.ready'), description: t('projectExports.readyDesc') });
      } else if (data.status === 'failed') {
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
        queryClient.invalidateQueries({ queryKey: ['project-exports', projectId] });
        toast({ title: t('projectExports.failed'), description: data.error || t('projectExports.unknownError'), variant: 'destructive' });
      }
    } catch (err) {
      console.error('Poll error:', err);
    }
  }, [projectId, pollingInterval, queryClient, t, toast]);

  const exports = exportsData?.exports ?? [];

  // Clean up polling on unmount
  // useEffect(() => () => { if (pollingInterval) clearInterval(pollingInterval); }, [pollingInterval]);

  return (
    <>
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 px-4 py-4">
        <div className="flex items-center gap-3">
          <Package className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-lg font-semibold">{t('projectExports.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('projectExports.description')}</p>
          </div>
        </div>
        <Button onClick={() => setOpenCreateDialog(true)} disabled={startExportMutation.isPending} className="gap-2">
          <Download className="h-4 w-4" />
          {startExportMutation.isPending ? t('projectExports.exporting') : t('projectExports.newExport')}
        </Button>
      </div>

      {/* Exports list */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">{t('projectExports.loading')}</span>
          </div>
        ) : error ? (
          <div className="flex h-64 items-center justify-center text-destructive">
            <p>{t('projectExports.errorLoad')}: {(error as Error).message}</p>
          </div>
        ) : exports.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex h-64 flex-col items-center justify-center gap-4 text-center text-muted-foreground"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
              <Package className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-medium">{t('projectExports.emptyTitle')}</h3>
              <p className="mt-1 text-sm">{t('projectExports.emptyDescription')}</p>
            </div>
            <Button onClick={() => setOpenCreateDialog(true)} disabled={startExportMutation.isPending} className="mt-2 gap-2">
              <Download className="h-4 w-4" />
              {startExportMutation.isPending ? t('projectExports.exporting') : t('projectExports.newExport')}
            </Button>
          </motion.div>
        ) : (
          <ScrollArea className="h-full">
            <div className="space-y-3">
              {exports.map((exp) => (
                <motion.div
                  key={exp.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="liquid-glass rounded-xl border border-border/40 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <Badge variant={exp.status === 'ready' ? 'default' : exp.status === 'pending' ? 'secondary' : 'destructive'} className="gap-1">
                          {exp.status === 'pending' && <Loader2 className="h-3 w-3 animate-spin" />}
                          {exp.status === 'ready' && <CheckCircle2 className="h-3 w-3" />}
                          {exp.status === 'failed' && <XCircle className="h-3 w-3" />}
                          <span className="capitalize">{exp.status}</span>
                        </Badge>
                        <Badge variant="outline" className="gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(exp.createdAt).toLocaleString()}
                        </Badge>
                        {exp.expiresAt && (
                          <Badge variant="secondary" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Expires: {new Date(exp.expiresAt).toLocaleDateString()}
                          </Badge>
                        )}
                      </div>
                      {exp.error && (
                        <p className="mt-2 text-sm text-destructive">{exp.error}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {exp.status === 'ready' && exp.fileUrl && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => downloadExport(exp.id, exp.fileUrl!)}
                          className="gap-2"
                        >
                          <Download className="h-4 w-4" />
                          {t('projectExports.download')}
                        </Button>
                      )}
                      {exp.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setActiveExportId(exp.id);
                            const interval = setInterval(() => pollExport(exp.id), 3000);
                            setPollingInterval(interval);
                          }}
                          className="gap-2"
                        >
                          <RotateCcw className="h-4 w-4" />
                          {t('projectExports.checkStatus')}
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Create Export Dialog */}
      {openCreateDialog && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpenCreateDialog(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-md rounded-2xl bg-background p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">{t('projectExports.newExport')}</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpenCreateDialog(false)}
                aria-label={t('projectExports.close')}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    {t('projectExports.exportPackage')}
                  </CardTitle>
                  <CardDescription className="text-xs">{t('projectExports.exportDescription')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between py-2 border-t">
                    <span className="text-muted-foreground">{t('projectExports.includes')}</span>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="space-y-2 pl-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <FileText className="h-3 w-3" />
                      <span>{t('projectExports.includesConversations')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-3 w-3" />
                      <span>{t('projectExports.includesFiles')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-3 w-3" />
                      <span>{t('projectExports.includesMemories')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-3 w-3" />
                      <span>{t('projectExports.includesResearch')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-3 w-3" />
                      <span>{t('projectExports.includesInstructions')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-3 w-3" />
                      <span>{t('projectExports.includesTasks')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setOpenCreateDialog(false)}
                >
                  {t('projectExports.cancel')}
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={() => startExportMutation.mutate()}
                  disabled={startExportMutation.isPending}
                >
                  {startExportMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('projectExports.exporting')}
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      {t('projectExports.createExport')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      </div>
    </>
  );
}