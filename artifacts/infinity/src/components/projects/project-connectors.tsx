import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  X,
  RefreshCw,
  AlertTriangle,
  Link2,
  Github,
  FileText,
  Figma,
  Layout,
  Calendar,
  CheckCircle,
  Trash2,
  Edit,
  Settings,
  ExternalLink,
  Wifi,
  WifiOff,
  AlertCircle,
  Loader2,
  Plus,
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
import {
  Button,
} from "../ui/button";
import {
  ScrollArea,
} from "../ui/scroll-area";
import {
  Label,
} from "../ui/label";
import {
  Input,
} from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card";
import {
  Badge,
} from "../ui/badge";
import {
  Separator,
} from "../ui/separator";
import { formatRelative } from "date-fns";

const providerIcons = {
  github: Github,
  google_drive: FileText,
  figma: Figma,
  canva: Layout,
  google_calendar: Calendar,
};

const providerLabels = {
  github: "GitHub",
  google_drive: "Google Drive",
  figma: "Figma",
  canva: "Canva",
  google_calendar: "Google Calendar",
};

const statusColors = {
  connected: "bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400 dark:border-green-500/30",
  disconnected: "bg-gray-500/10 text-gray-700 border-gray-500/20 dark:text-gray-400 dark:border-gray-500/30",
  error: "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400 dark:border-red-500/30",
  expired: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400 dark:border-amber-500/30",
};

interface Connector {
  id: string;
  provider: string;
  displayName: string | null;
  config: Record<string, unknown>;
  status: "connected" | "disconnected" | "error" | "expired";
  error: string | null;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
  hasTokens: boolean;
  accessTokenPreview?: string | null;
  refreshTokenPreview?: string | null;
}

interface ConnectorsResponse {
  connectors: Connector[];
}

interface ConnectorDetailResponse extends Connector {}

interface SyncResponse {
  ok: boolean;
  message: string;
  lastSyncAt: string;
}

interface StatusResponse {
  connected: boolean;
  status: string;
  error: string | null;
  lastSyncAt: string | null;
  expiresAt: number | null;
}

export function ProjectConnectors({ projectId }: { projectId: string }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingConnector, setEditingConnector] = useState<Connector | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingConnector, setDeletingConnector] = useState<Connector | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>("github");
  const [addDisplayName, setAddDisplayName] = useState("");
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editConfig, setEditConfig] = useState<Record<string, unknown>>({});

  // Fetch connectors
  const { data: connectorsData, isLoading, error, refetch } = useQuery<ConnectorsResponse>({
    queryKey: ["project-connectors", projectId],
    queryFn: async () => {
      const response = await fetch(`/api/infinity/projects/${encodeURIComponent(projectId)}/connectors`);
      if (!response.ok) throw new Error("Failed to load connectors");
      return (await response.json()) as ConnectorsResponse;
    },
    enabled: !!projectId,
  });

  // Create connector mutation
  const createMutation = useMutation({
    mutationFn: async (data: { provider: string; displayName: string }) => {
      const response = await fetch(`/api/infinity/projects/${encodeURIComponent(projectId)}/connectors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: data.provider,
          displayName: data.displayName,
          config: {},
        }),
      });
      if (!response.ok) throw new Error("Failed to create connector");
      return (await response.json()) as Connector;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-connectors", projectId] });
      setAddDialogOpen(false);
      setAddDisplayName("");
    },
  });

  // Update connector mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; displayName: string; config: Record<string, unknown> }) => {
      const response = await fetch(`/api/infinity/projects/${encodeURIComponent(projectId)}/connectors/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: data.displayName,
          config: data.config,
        }),
      });
      if (!response.ok) throw new Error("Failed to update connector");
      return (await response.json()) as Connector;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-connectors", projectId] });
      setEditDialogOpen(false);
      setEditingConnector(null);
    },
  });

  // Delete connector mutation
  const deleteMutation = useMutation({
    mutationFn: async (connectorId: string) => {
      const response = await fetch(`/api/infinity/projects/${encodeURIComponent(projectId)}/connectors/${connectorId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete connector");
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-connectors", projectId] });
      setDeleteConfirmOpen(false);
      setDeletingConnector(null);
    },
  });

  // Sync connector mutation
  const syncMutation = useMutation({
    mutationFn: async (connectorId: string) => {
      const response = await fetch(`/api/infinity/projects/${encodeURIComponent(projectId)}/connectors/${connectorId}/sync`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to sync connector");
      return (await response.json()) as SyncResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-connectors", projectId] });
    },
  });

  const handleAdd = () => {
    if (!addDisplayName.trim()) return;
    createMutation.mutate({ provider: selectedProvider, displayName: addDisplayName.trim() });
  };

  const handleEdit = () => {
    if (!editingConnector || !editDisplayName.trim()) return;
    updateMutation.mutate({ id: editingConnector.id, displayName: editDisplayName.trim(), config: editConfig });
  };

  const handleDelete = () => {
    if (!deletingConnector) return;
    deleteMutation.mutate(deletingConnector.id);
  };

  const handleSync = (connector: Connector) => {
    syncMutation.mutate(connector.id);
  };

  const handleEditClick = (connector: Connector) => {
    setEditingConnector(connector);
    setEditDisplayName(connector.displayName ?? "");
    setEditConfig(connector.config ?? {});
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (connector: Connector) => {
    setDeletingConnector(connector);
    setDeleteConfirmOpen(true);
  };

  const handleOpenSettings = (connector: Connector) => {
    // For now, just show a toast - in future could open OAuth flow or config panel
    console.log("Open settings for", connector.provider);
  };

  const getProviderIcon = (provider: string) => {
    const Icon = providerIcons[provider as keyof typeof providerIcons] || FileText;
    return Icon;
  };

  const getProviderLabel = (provider: string) => {
    return providerLabels[provider as keyof typeof providerLabels] || provider;
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="animate-spin w-8 h-8 text-blue-600 mx-auto" />
          <p className="text-gray-600 dark:text-gray-400">{t("projectConnector.loading") || "Loading connectors…"}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
          <p className="text-gray-600 dark:text-gray-400">Failed to load connectors</p>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const connectors = connectorsData?.connectors ?? [];

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-b border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Link2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t("projectConnector.title") || "Connectors"}
          </h2>
          {connectors.length > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-500 px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800">
              {connectors.length} {t("projectConnector.items") || "connectors"}
            </span>
          )}
        </div>

        <Button
          variant="default"
          size="sm"
          onClick={() => setAddDialogOpen(true)}
          className="gap-1"
        >
          <Plus className="w-4 h-4" />
          <span>{t("projectConnector.add") || "Add connector"}</span>
        </Button>
      </div>

      {/* Connectors List */}
      <div className="flex-1 overflow-y-auto p-4">
        {connectors.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <Link2 className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              {t("projectConnector.emptyTitle") || "No connectors yet"}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-xs">
              {t("projectConnector.emptyDescription") || "Add one to bring in external data."}
            </p>
            <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              {t("projectConnector.add") || "Add connector"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {connectors.map((connector) => {
              const Icon = getProviderIcon(connector.provider);
              const statusColor = statusColors[connector.status] || statusColors.disconnected;
              const isConnected = connector.status === "connected";

              return (
                <Card key={connector.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
                      <Icon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {connector.displayName || getProviderLabel(connector.provider)}
                        </h4>
                        <Badge variant="secondary" className={statusColor}>
                          {isConnected ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {t("projectConnector.status.connected") || "Connected"}
                            </>
                          ) : connector.status === "expired" ? (
                            <>
                              <AlertCircle className="w-3 h-3 mr-1" />
                              {t("projectConnector.status.expired") || "Expired"}
                            </>
                          ) : connector.status === "error" ? (
                            <>
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              {t("projectConnector.status.error") || "Error"}
                            </>
                          ) : (
                            <>
                              <WifiOff className="w-3 h-3 mr-1" />
                              {t("projectConnector.status.disconnected") || "Disconnected"}
                            </>
                          )}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 truncate">
                        {getProviderLabel(connector.provider)} • {connector.hasTokens ? "Tokens stored" : "No tokens"}
                      </p>
                      {connector.lastSyncAt && (
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                          {t("projectConnector.lastSync") || "Last sync"} {formatRelative(new Date(connector.lastSyncAt), new Date())}
                        </p>
                      )}
                      {connector.error && (
                        <p className="mt-1 text-xs text-red-500 dark:text-red-400 truncate">
                          {connector.error}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isConnected && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSync(connector)}
                        disabled={syncMutation.isPending}
                        className="gap-1"
                      >
                        <RefreshCw className={cn("w-4 h-4", syncMutation.isPending && "animate-spin")} />
                        <span>{t("projectConnector.sync") || "Sync"}</span>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditClick(connector)}
                      className="gap-1"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClick(connector)}
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

      {/* Add Connector Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("projectConnector.add") || "Add connector"}</DialogTitle>
            <DialogDescription>
              {t("projectConnector.addDescription") || "Connect an external service to sync data into this project."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="provider">{t("projectConnector.provider") || "Provider"}</Label>
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger id="provider">
                  <SelectValue placeholder={t("projectConnector.selectProvider") || "Select provider"} />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(providerLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <getProviderIcon(key) className="w-4 h-4" />
                        <span>{label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">{t("projectConnector.displayName") || "Display name"}</Label>
              <Input
                id="displayName"
                placeholder={t("projectConnector.displayNamePlaceholder") || "e.g. My GitHub"}
                value={addDisplayName}
                onChange={(e) => setAddDisplayName(e.target.value)}
              />
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t("projectConnector.oauthNote") || "OAuth setup is done in Settings. This stores the connection for this project."}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              {t("projectConnector.cancel") || "Cancel"}
            </Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending || !addDisplayName.trim()}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {t("projectConnector.adding") || "Adding…"}
                </>
              ) : (
                t("projectConnector.add") || "Add connector"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Connector Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("projectConnector.edit") || "Edit connector"}</DialogTitle>
            <DialogDescription>
              {editingConnector ? `${getProviderLabel(editingConnector.provider)} settings` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("projectConnector.provider") || "Provider"}</Label>
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                {editingConnector && (
                  <>
                    <getProviderIcon(editingConnector.provider) className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {getProviderLabel(editingConnector.provider)}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editDisplayName">{t("projectConnector.displayName") || "Display name"}</Label>
              <Input
                id="editDisplayName"
                placeholder={t("projectConnector.displayNamePlaceholder") || "e.g. My GitHub"}
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
              />
            </div>

            {editingConnector && Object.keys(editingConnector.config).length > 0 && (
              <div className="space-y-2">
                <Label>{t("projectConnector.config") || "Configuration"}</Label>
                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-mono text-gray-600 dark:text-gray-400 max-h-32 overflow-auto">
                  {JSON.stringify(editingConnector.config, null, 2)}
                </div>
              </div>
            )}

            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t("projectConnector.oauthNote") || "OAuth setup is done in Settings. This stores the connection for this project."}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              {t("projectConnector.cancel") || "Cancel"}
            </Button>
            <Button onClick={handleEdit} disabled={updateMutation.isPending || !editDisplayName.trim()}>
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {t("projectConnector.saving") || "Saving…"}
                </>
              ) : (
                t("projectConnector.save") || "Save changes"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("projectConnector.deleteConfirm") || "Delete connector?"}</DialogTitle>
            <DialogDescription>
              {deletingConnector
                ? `${t("projectConnector.deleteConfirmDesc") || "This will remove the connection for"} ${getProviderLabel(deletingConnector.provider)}. ${t("projectConnector.deleteConfirmWarning") || "Any sync configuration will be lost."}`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              {t("projectConnector.cancel") || "Cancel"}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {t("projectConnector.deleting") || "Deleting…"}
                </>
              ) : (
                t("projectConnector.delete") || "Delete"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}