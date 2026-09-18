import { useState } from "react";
import type { ReactNode } from "react";
import { Button, Modal } from "../ui";

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  /** Spelled-out consequences — anything the action destroys beyond the obvious. */
  children?: ReactNode;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

/**
 * The gate in front of anything irreversible. It stays open and shows the
 * failure if the action is rejected, rather than closing as though it worked.
 */
export function ConfirmDialog({
  isOpen,
  title,
  description,
  children,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setIsWorking(true);
    setError(null);
    try {
      await onConfirm();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That didn't work.");
      setIsWorking(false);
      return;
    }
    setIsWorking(false);
  };

  const handleCancel = () => {
    if (isWorking) {
      return;
    }
    setError(null);
    onCancel();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={handleCancel} disabled={isWorking}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => void handleConfirm()} isLoading={isWorking}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
