"use client";

import { useState } from "react";
import {
  RefreshCw,
  Trash2,
  FileText,
  Key,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { ChangePasswordModal } from "./ChangePasswordModal";

interface QuickActionsProps {
  onActionComplete?: () => void;
}

interface ActionButton {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: "positive" | "info" | "warning" | "negative";
  action: () => Promise<void> | void;
  placeholder?: boolean;
}

export function QuickActions({ onActionComplete }: QuickActionsProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleRestartGateway = async () => {
    // Placeholder - would call openclaw gateway restart
    showNotification("success", "Comando de reinício do gateway enviado (placeholder)");
  };

  const handleClearActivityLog = async () => {
    setLoadingAction("clear_log");
    try {
      const res = await fetch("/api/system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear_activity_log" }),
      });

      if (!res.ok) throw new Error("Failed to clear log");

      showNotification("success", "Log de atividades limpo com sucesso");
      onActionComplete?.();
    } catch {
      showNotification("error", "Falha ao limpar log de atividades");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleViewLogs = async () => {
    // Placeholder - would open gateway logs
    showNotification("success", "Abrindo logs do gateway... (placeholder)");
  };

  const actions: ActionButton[] = [
    {
      id: "restart",
      label: "Reiniciar Gateway",
      icon: RefreshCw,
      color: "info",
      action: handleRestartGateway,
      placeholder: true,
    },
    {
      id: "clear_log",
      label: "Limpar Log de Atividades",
      icon: Trash2,
      color: "warning",
      action: handleClearActivityLog,
    },
    {
      id: "view_logs",
      label: "Ver Logs do Gateway",
      icon: FileText,
      color: "positive",
      action: handleViewLogs,
      placeholder: true,
    },
    {
      id: "change_password",
      label: "Alterar Senha",
      icon: Key,
      color: "negative",
      action: () => setShowPasswordModal(true),
    },
  ];

  const colorStyles: Record<string, { bg: string; color: string; border: string }> = {
    positive: { bg: 'var(--positive-soft)', color: 'var(--positive)', border: 'var(--positive)' },
    info: { bg: 'var(--info-soft)', color: 'var(--info)', border: 'var(--info)' },
    warning: { bg: 'var(--warning-soft)', color: 'var(--warning)', border: 'var(--warning)' },
    negative: { bg: 'var(--negative-soft)', color: 'var(--negative)', border: 'var(--negative)' },
  };

  return (
    <>
      <div
        className="rounded-xl p-6"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <h2
          className="text-xl font-semibold mb-6 flex items-center gap-2"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}
        >
          <RefreshCw className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          Ações Rápidas
        </h2>

        {/* Notification */}
        {notification && (
          <div
            className="flex items-center gap-2 p-3 rounded-lg mb-4"
            style={{
              backgroundColor: notification.type === "success" ? 'var(--positive-soft)' : 'var(--negative-soft)',
              color: notification.type === "success" ? 'var(--positive)' : 'var(--negative)',
              border: `1px solid ${notification.type === "success" ? 'var(--positive)' : 'var(--negative)'}`,
            }}
          >
            {notification.type === "success" ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span className="text-sm">{notification.message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {actions.map((action) => {
            const Icon = action.icon;
            const isLoading = loadingAction === action.id;
            const cs = colorStyles[action.color];

            return (
              <button
                key={action.id}
                onClick={() => action.action()}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: cs.bg,
                  color: cs.color,
                  border: `1px solid ${cs.border}`,
                }}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
                <span className="font-medium">{action.label}</span>
                {action.placeholder && (
                  <span className="text-xs opacity-50">(placeholder)</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSuccess={() => {
          showNotification("success", "Senha alterada com sucesso");
          setShowPasswordModal(false);
        }}
      />
    </>
  );
}
