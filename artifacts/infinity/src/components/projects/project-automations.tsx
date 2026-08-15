import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Plus,
  RefreshCw,
  Trash2,
  Settings,
  AlertTriangle,
  Loader2,
  Clock3,
  Webhook,
  MousePointerClick,
  CalendarClock,
  Bot,
  Bell,
  Link2,
  Sparkles,
  ListTodo,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useI18n } from "../../lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card";
import { Switch } from "../ui/switch";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { ScrollArea } from "../ui/scroll-area";
import { formatRelative } from "date-fns";
import { useToast } from "../../hooks/use-toast";

const triggerIcons = {
  cron: CalendarClock,
  webhook: Webhook,
  manual: MousePointerClick,
};

const triggerLabels = {
  cron: "Schedule (cron)",
  webhook: "Webhook",
  manual: "Manual",
};

const actionIcons = {
  run_agent: Bot,
  send_notification: Bell,
  sync_connector: Link2,
  generate_faq: Sparkles,
  scan_conflicts: AlertCircle,
  cleanup_project: ListTodo,
};

const actionLabels = {
  run_agent: "Run AI agent",
  send_notification: "Send notification",
  sync_connector: "Sync connector",
  generate_faq: "Generate FAQ",
  scan_conflicts: "Scan conflicts",
  cleanup_project: "Clean up project",
};

interface Automation {
  id: string;
  name: string;
  description: string | null;
  trigger: { type: string; expression?: string; path?: string };
  action: { type: string; [key: string]: unknown };
  enabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  runCount: number;
  lastStatus: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AutomationsResponse {
  automations: Automation[];
}

interface RunRecord {
  id: string;
  automationId: string;
  triggeredBy: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  error: string | null;
  result: Record<string, unknown> | null;
  logs: string[];
}

interface RunsResponse {
  runs: RunRecord[];
}

export function ProjectAutomations({ projectId }: { projectId: string }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingAutomation, setDeletingAutomation] = useState<Automation | null>(null);
  const [runsDialogAutomation, setRunsDialogAutomation] = useState<Automation | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState<string>("cron");
  const [cronExpression, setCronExpression] = useState("0 9 * * 1");
  const [webhookPath, setWebhookPath] = useState("");
  const [actionType, setActionType] = useState<string>("generate_faq");
  const [agentPrompt, setAgentPrompt] = useState("");
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationBody, setNotificationBody] = useState("");
  const [syncProvider, setSyncProvider] = useState("github");
  const [enabled, setEnabled] = useState(true);

  // Fetch automations
  const { data: automationsData, isLoading, error, refetch } = useQuery<AutomationsResponse>({
    queryKey: ["project-automations", projectId],
    queryFn: async () => {
      const response = await fetch(`/api/infinity/projects/${encodeURIComponent(projectId)}/automations`);
      if (!response.ok) throw new Error("Failed to load automations");
      return (await response.json()) as AutomationsResponse;
    },
    enabled: !!projectId,
  });

  // Fetch runs for a specific automation
  const { data: runsData } = useQuery<RunsResponse>({
    queryKey: ["project-automation-runs", runsDialogAutomation?.id],
    queryFn: async () => {
      const response = await fetch(
        `/api/infinity/projects/${encodeURIComponent(projectId)}/automations/${runsDialogAutomation!.id}/runs`,
      );
      if (!response.ok) throw new Error("Failed to load runs");
      return (await response.json()) as RunsResponse;
    },
    enabled: !!runsDialogAutomation,
  });

  // Create automation mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const trigger: Record<string, unknown> = { type: triggerType };
      if (triggerType === "cron") trigger.expression = cronExpression.trim();
      if (triggerType === "webhook") trigger.path = webhookPath.trim() || `/automation/${projectId}`;

      const action: Record<string, unknown> = { type: actionType };
      if (actionType === "run_agent") action.prompt = agentPrompt.trim();
      if (actionType === "send_notification") {
        action.title = notificationTitle.trim();
        action.body = notificationBody.trim();
      }
      if (actionType === "sync_connector") action.provider = syncProvider;

      const response = await fetch(`/api/infinity/projects/${encodeURIComponent(projectId)}/automations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          trigger,
          action,
          enabled,
        }),
      });
      if (!response.ok) throw new Error("Failed to create automation");
      return (await response.json()) as Automation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-automations", projectId] });
      setAddDialogOpen(false);
      resetForm();
      toast({ title: t("projectAutomation.new") || "Automation created" });
    },
    onError: () => {
      toast({ variant: "destructive", title: t("projectAutomation.errorCreate") || "Failed to create automation" });
    },
  });

  // Update automation mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      const trigger: Record<string, unknown> = { type: triggerType };
      if (triggerType === "cron") trigger.expression = cronExpression.trim();
      if (triggerType === "webhook") trigger.path = webhookPath.trim() || `/automation/${projectId}`;

      const action: Record<string, unknown> = { type: actionType };
      if (actionType === "run_agent") action.prompt = agentPrompt.trim();
      if (actionType === "send_notification") {
        action.title = notificationTitle.trim();
        action.body = notificationBody.trim();
      }
      if (actionType === "sync_connector") action.provider = syncProvider;

      const response = await fetch(
        `/api/infinity/projects/${encodeURIComponent(projectId)}/automations/${editingAutomation!.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || undefined,
            trigger,
            action,
            enabled,
          }),
        },
      );
      if (!response.ok) throw new Error("Failed to update automation");
      return (await response.json()) as Automation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-automations", projectId] });
      setEditDialogOpen(false);
      setEditingAutomation(null);
      resetForm();
    },
  });

  // Delete automation mutation
  const deleteMutation = useMutation({
    mutationFn: async (automationId: string) => {
      const response = await fetch(
        `/api/infinity/projects/${encodeURIComponent(projectId)}/automations/${automationId}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error("Failed to delete automation");
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-automations", projectId] });
      setDeleteConfirmOpen(false);
      setDeletingAutomation(null);
    },
  });

  // Run automation mutation
  const runMutation = useMutation({
    mutationFn: async (automationId: string) => {
      const response = await fetch(
        `/api/infinity/projects/${encodeURIComponent(projectId)}/automations/${automationId}/run`,
        { method: "POST" },
      );
      if (!response.ok) throw new Error("Failed to run automation");
      return (await response.json()) as { runId: string; status: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["project-automations", projectId] });
      toast({ title: t("projectAutomation.runStarted") || "Automation started" });
      // Optionally open runs after a moment
      if (data?.runId) {
        setTimeout(() => {
          const automation = automationsData?.automations.find((a) => a.id === data.runId);
          if (automation) setRunsDialogAutomation(automation);
        }, 1500);
      }
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setTriggerType("cron");
    setCronExpression("0 9 * * 1");
    setWebhookPath("");
    setActionType("generate_faq");
    setAgentPrompt("");
    setNotificationTitle("");
    setNotificationBody("");
    setSyncProvider("github");
    setEnabled(true);
  };

  const openAddDialog = () => {
    resetForm();
    setAddDialogOpen(true);
  };

  const openEditDialog = (automation: Automation) => {
    setEditingAutomation(automation);
    setName(automation.name);
    setDescription(automation.description ?? "");
    setTriggerType(automation.trigger?.type ?? "cron");
    setCronExpression(automation.trigger?.expression ?? "0 9 * * 1");
    setWebhookPath(automation.trigger?.path ?? "");
    setActionType(automation.action?.type ?? "generate_faq");
    setAgentPrompt((automation.action?.prompt as string) ?? "");
    setNotificationTitle((automation.action?.title as string) ?? "");
    setNotificationBody((automation.action?.body as string) ?? "");
    setSyncProvider((automation.action?.provider as string) ?? "github");
    setEnabled(automation.enabled);
    setEditDialogOpen(true);
  };

  const getTriggerIcon = (type: string) => {
    const Icon = triggerIcons[type as keyof typeof triggerIcons] || MousePointerClick;
    return Icon;
  };

  const getActionIcon = (type: string) => {
    const Icon = actionIcons[type as keyof typeof actionIcons] || Bot;
    return Icon;
  };

  const getTriggerLabel = (automation: Automation) => {
    const type = automation.trigger?.type;
    if (type === "cron") return `${triggerLabels.cron}: ${automation.trigger?.expression ?? ""}`;
    if (type === "webhook") return `${triggerLabels.webhook}: ${automation.trigger?.path ?? ""}`;
    return triggerLabels.manual;
  };

  const getActionLabel = (automation: Automation) => {
    const type = automation.action?.type as keyof typeof actionLabels;
    return actionLabels[type] ?? automation.action?.type ?? "Unknown";
  };

  const statusColor = (status: string | null) => {
    if (status === "success") return "bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400 dark:border-green-500/30";
    if (status === "failed") return "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400 dark:border-red-500/30";
    if (status === "running") return "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400 dark:border-blue-500/30";
    return "bg-gray-500/10 text-gray-700 border-gray-500/20 dark:text-gray-400 dark:border-gray-500/30";
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="animate-spin w-8 h-8 text-blue-600 mx-auto" />
          <p className="text-gray-600 dark:text-gray-400">{t("projectAutomation.loading") || "Loading automations…"}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
          <p className="text-gray-600 dark:text-gray-400">Failed to load automations</p>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const automations = automationsData?.automations ?? [];

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-b border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Clock3 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t("projectAutomation.title") || "Automations"}
          </h2>
          {automations.length > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-500 px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800">
              {automations.length} {t("projectAutomation.items") || "automations"}
            </span>
          )}
        </div>

        <Button
          variant="default"
          size="sm"
          onClick={openAddDialog}
          className="gap-1"
        >
          <Plus className="w-4 h-4" />
          <span>{t("projectAutomation.new") || "New automation"}</span>
        </Button>
      </div>

      {/* Automations List */}
      <div className="flex-1 overflow-y-auto p-4">
        {automations.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <Clock3 className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              {t("projectAutomation.emptyTitle") || "No automations yet"}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-xs">
              {t("projectAutomation.emptyDescription") || "Create one to schedule repeating actions."}
            </p>
            <Button onClick={openAddDialog} className="gap-2">
              <Plus className="w-4 h-4" />
              {t("projectAutomation.new") || "New automation"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {automations.map((automation) => {
              const TriggerIcon = getTriggerIcon(automation.trigger?.type);
              const ActionIcon = getActionIcon(automation.action?.type);
              return (
                <Card key={automation.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
                      <ActionIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {automation.name}
                        </h4>
                        {automation.enabled ? (
                          <Badge variant="secondary" className="bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400 dark:border-green-500/30">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            {t("projectAutomation.enabled") || "Enabled"}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-gray-500/10 text-gray-700 border-gray-500/20 dark:text-gray-400 dark:border-gray-500/30">
                            {t("projectAutomation.disabled") || "Disabled"}
                          </Badge>
                        )}
                        {automation.lastStatus && (
                          <Badge variant="secondary" className={statusColor(automation.lastStatus)}>
                            {automation.lastStatus}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                        <TriggerIcon className="w-3.5 h-3.5" />
                        <span className="truncate">{getTriggerLabel(automation)}</span>
                        <span className="text-gray-300 dark:text-gray-600">→</span>
                        <ActionIcon className="w-3.5 h-3.5" />
                        <span className="truncate">{getActionLabel(automation)}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                        <span>{t("projectAutomation.runCount") || "Runs"}: {automation.runCount}</span>
                        {automation.lastRunAt && (
                          <span>
                            {t("projectAutomation.lastRun") || "Last run"}: {formatRelative(new Date(automation.lastRunAt), new Date())}
                          </span>
                        )}
                        {automation.nextRunAt && automation.enabled && (
                          <span>
                            {t("projectAutomation.nextRun") || "Next run"}: {formatRelative(new Date(automation.nextRunAt), new Date())}
                          </span>
                        )}
                      </div>
                      {automation.lastError && (
                        <p className="mt-1 text-xs text-red-500 dark:text-red-400 truncate">
                          {automation.lastError}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => runMutation.mutate(automation.id)}
                      disabled={runMutation.isPending || !automation.enabled}
                      className="gap-1"
                    >
                      <RefreshCw className={cn("w-4 h-4", runMutation.isPending && "animate-spin")} />
                      <span>{t("projectAutomation.run") || "Run now"}</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRunsDialogAutomation(automation)}
                      className="gap-1"
                    >
                      <Clock3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(automation)}
                      className="gap-1"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setDeletingAutomation(automation); setDeleteConfirmOpen(true); }}
                      className="gap-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Automation Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("projectAutomation.new") || "New automation"}</DialogTitle>
            <DialogDescription>
              {t("projectAutomation.createDescription") || "Set a trigger and an action for this project."}
            </DialogDescription>
          </DialogHeader>

          <AutomationForm
            name={name}
            setName={setName}
            description={description}
            setDescription={setDescription}
            triggerType={triggerType}
            setTriggerType={setTriggerType}
            cronExpression={cronExpression}
            setCronExpression={setCronExpression}
            webhookPath={webhookPath}
            setWebhookPath={setWebhookPath}
            actionType={actionType}
            setActionType={setActionType}
            agentPrompt={agentPrompt}
            setAgentPrompt={setAgentPrompt}
            notificationTitle={notificationTitle}
            setNotificationTitle={setNotificationTitle}
            notificationBody={notificationBody}
            setNotificationBody={setNotificationBody}
            syncProvider={syncProvider}
            setSyncProvider={setSyncProvider}
            enabled={enabled}
            setEnabled={setEnabled}
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              {t("projectAutomation.cancel") || "Cancel"}
            </Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !name.trim()}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {t("projectAutomation.creating") || "Creating…"}
                </>
              ) : (
                t("projectAutomation.create") || "Create"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Automation Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("projectAutomation.edit") || "Edit automation"}</DialogTitle>
            <DialogDescription>
              {t("projectAutomation.editDescription") || "Update the trigger and action."}
            </DialogDescription>
          </DialogHeader>

          <AutomationForm
            name={name}
            setName={setName}
            description={description}
            setDescription={setDescription}
            triggerType={triggerType}
            setTriggerType={setTriggerType}
            cronExpression={cronExpression}
            setCronExpression={setCronExpression}
            webhookPath={webhookPath}
            setWebhookPath={setWebhookPath}
            actionType={actionType}
            setActionType={setActionType}
            agentPrompt={agentPrompt}
            setAgentPrompt={setAgentPrompt}
            notificationTitle={notificationTitle}
            setNotificationTitle={setNotificationTitle}
            notificationBody={notificationBody}
            setNotificationBody={setNotificationBody}
            syncProvider={syncProvider}
            setSyncProvider={setSyncProvider}
            enabled={enabled}
            setEnabled={setEnabled}
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              {t("projectAutomation.cancel") || "Cancel"}
            </Button>
            <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending || !name.trim()}>
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {t("projectAutomation.saving") || "Saving…"}
                </>
              ) : (
                t("projectAutomation.save") || "Save changes"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("projectAutomation.deleteConfirm") || "Delete automation?"}</DialogTitle>
            <DialogDescription>
              {deletingAutomation
                ? `${t("projectAutomation.deleteConfirmDesc") || "This will remove"} "${deletingAutomation.name}". ${t("projectAutomation.deleteConfirmWarning") || "Its run history will be lost."}`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              {t("projectAutomation.cancel") || "Cancel"}
            </Button>
            <Button variant="destructive" onClick={() => deletingAutomation && deleteMutation.mutate(deletingAutomation.id)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {t("projectAutomation.deleting") || "Deleting…"}
                </>
              ) : (
                t("projectAutomation.delete") || "Delete"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Runs History Dialog */}
      <Dialog open={!!runsDialogAutomation} onOpenChange={(open) => !open && setRunsDialogAutomation(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("projectAutomation.runs") || "Run history"}</DialogTitle>
            <DialogDescription>
              {runsDialogAutomation?.name}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[50vh]">
            <div className="space-y-2">
              {runsData?.runs?.length ? (
                runsData.runs.map((run) => (
                  <div key={run.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatRelative(new Date(run.startedAt), new Date())}
                      </span>
                      <Badge variant="secondary" className={statusColor(run.status)}>
                        {run.status}
                      </Badge>
                    </div>
                    {run.error && (
                      <p className="mt-1 text-xs text-red-500 dark:text-red-400 truncate">{run.error}</p>
                    )}
                    {run.logs?.length > 0 && (
                      <div className="mt-2 space-y-0.5">
                        {run.logs.slice(-5).map((log, i) => (
                          <p key={i} className="text-[11px] font-mono text-gray-500 dark:text-gray-400 truncate">{log}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
                  {t("projectAutomation.noRuns") || "No runs yet"}
                </p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface AutomationFormProps {
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  triggerType: string;
  setTriggerType: (v: string) => void;
  cronExpression: string;
  setCronExpression: (v: string) => void;
  webhookPath: string;
  setWebhookPath: (v: string) => void;
  actionType: string;
  setActionType: (v: string) => void;
  agentPrompt: string;
  setAgentPrompt: (v: string) => void;
  notificationTitle: string;
  setNotificationTitle: (v: string) => void;
  notificationBody: string;
  setNotificationBody: (v: string) => void;
  syncProvider: string;
  setSyncProvider: (v: string) => void;
  enabled: boolean;
  setEnabled: (v: boolean) => void;
}

function AutomationForm({
  name,
  setName,
  description,
  setDescription,
  triggerType,
  setTriggerType,
  cronExpression,
  setCronExpression,
  webhookPath,
  setWebhookPath,
  actionType,
  setActionType,
  agentPrompt,
  setAgentPrompt,
  notificationTitle,
  setNotificationTitle,
  notificationBody,
  setNotificationBody,
  syncProvider,
  setSyncProvider,
  enabled,
  setEnabled,
}: AutomationFormProps) {
  const { t } = useI18n();
  return (
    <div className="space-y-5 py-2">
      <div className="space-y-2">
        <Label htmlFor="auto-name">{t("projectAutomation.name") || "Name"}</Label>
        <Input
          id="auto-name"
          placeholder={t("projectAutomation.namePlaceholder") || "e.g. Weekly FAQ refresh"}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="auto-desc">{t("projectAutomation.descriptionLabel") || "Description"}</Label>
        <Input
          id="auto-desc"
          placeholder={t("projectAutomation.descriptionPlaceholder") || "Optional"}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="space-y-3 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
        <div className="flex items-center gap-2">
          <Clock3 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">{t("projectAutomation.trigger") || "Trigger"}</h4>
        </div>
        <div className="space-y-2">
          <Label>{t("projectAutomation.triggerType") || "Trigger type"}</Label>
          <Select value={triggerType} onValueChange={setTriggerType}>
            <SelectTrigger>
              <SelectValue placeholder={t("projectAutomation.selectTrigger") || "Select trigger"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cron">
                <div className="flex items-center gap-2">
                  <CalendarClock className="w-4 h-4" />
                  {triggerLabels.cron}
                </div>
              </SelectItem>
              <SelectItem value="webhook">
                <div className="flex items-center gap-2">
                  <Webhook className="w-4 h-4" />
                  {triggerLabels.webhook}
                </div>
              </SelectItem>
              <SelectItem value="manual">
                <div className="flex items-center gap-2">
                  <MousePointerClick className="w-4 h-4" />
                  {triggerLabels.manual}
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {triggerType === "cron" && (
          <div className="space-y-2">
            <Label htmlFor="cron">{t("projectAutomation.cronExpression") || "Cron expression (UTC)"}</Label>
            <Input
              id="cron"
              placeholder="0 9 * * 1"
              value={cronExpression}
              onChange={(e) => setCronExpression(e.target.value)}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t("projectAutomation.cronHint") || "Min Hour Day Month Weekday — e.g. 0 9 * * 1 = Mondays 09:00 UTC"}
            </p>
          </div>
        )}

        {triggerType === "webhook" && (
          <div className="space-y-2">
            <Label htmlFor="webhook">{t("projectAutomation.webhookPath") || "Webhook path"}</Label>
            <Input
              id="webhook"
              placeholder={`/automation/${"projectId"}`}
              value={webhookPath}
              onChange={(e) => setWebhookPath(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">{t("projectAutomation.actions") || "Action"}</h4>
        </div>
        <div className="space-y-2">
          <Label>{t("projectAutomation.actionType") || "Action type"}</Label>
          <Select value={actionType} onValueChange={setActionType}>
            <SelectTrigger>
              <SelectValue placeholder={t("projectAutomation.selectAction") || "Select action"} />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(actionLabels).map(([key, label]) => {
                const Icon = actionIcons[key as keyof typeof actionIcons];
                return (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      {label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {actionType === "run_agent" && (
          <div className="space-y-2">
            <Label htmlFor="agent-prompt">{t("projectAutomation.agentPrompt") || "Agent prompt"}</Label>
            <Input
              id="agent-prompt"
              placeholder={t("projectAutomation.agentPromptPlaceholder") || "What should the agent do?"}
              value={agentPrompt}
              onChange={(e) => setAgentPrompt(e.target.value)}
            />
          </div>
        )}

        {actionType === "send_notification" && (
          <div className="space-y-2">
            <div className="space-y-2">
              <Label htmlFor="notif-title">{t("projectAutomation.notificationTitle") || "Notification title"}</Label>
              <Input
                id="notif-title"
                placeholder={t("projectAutomation.notificationTitlePlaceholder") || "Reminder"}
                value={notificationTitle}
                onChange={(e) => setNotificationTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notif-body">{t("projectAutomation.notificationBody") || "Notification body"}</Label>
              <Input
                id="notif-body"
                placeholder={t("projectAutomation.notificationBodyPlaceholder") || "Time for your weekly review"}
                value={notificationBody}
                onChange={(e) => setNotificationBody(e.target.value)}
              />
            </div>
          </div>
        )}

        {actionType === "sync_connector" && (
          <div className="space-y-2">
            <Label>{t("projectAutomation.syncProvider") || "Provider"}</Label>
            <Select value={syncProvider} onValueChange={setSyncProvider}>
              <SelectTrigger>
                <SelectValue placeholder={t("projectAutomation.selectProvider") || "Select provider"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="github">GitHub</SelectItem>
                <SelectItem value="google_drive">Google Drive</SelectItem>
                <SelectItem value="figma">Figma</SelectItem>
                <SelectItem value="canva">Canva</SelectItem>
                <SelectItem value="google_calendar">Google Calendar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-3">
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t("projectAutomation.enabled") || "Enabled"}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("projectAutomation.enabledHint") || "Run automatically when triggered"}</p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>
    </div>
  );
}
