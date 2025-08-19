import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { Button } from "./button";
import { AlertTriangle, CheckCircle, Info, XCircle } from "lucide-react";

export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive' | 'warning' | 'success';
  isLoading?: boolean;
}

const variantConfig = {
  default: {
    icon: Info,
    iconColor: "text-blue-600",
    confirmVariant: "default" as const,
  },
  destructive: {
    icon: XCircle,
    iconColor: "text-red-600",
    confirmVariant: "destructive" as const,
  },
  warning: {
    icon: AlertTriangle,
    iconColor: "text-yellow-600",
    confirmVariant: "default" as const,
  },
  success: {
    icon: CheckCircle,
    iconColor: "text-green-600",
    confirmVariant: "default" as const,
  },
};

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "default",
  isLoading = false,
}) => {
  const config = variantConfig[variant];
  const Icon = config.icon;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className={`flex-shrink-0 ${config.iconColor}`}>
              <Icon className="h-6 w-6" />
            </div>
            <DialogTitle className="text-left">{title}</DialogTitle>
          </div>
        </DialogHeader>
        
        <DialogDescription className="text-left whitespace-pre-line">
          {description}
        </DialogDescription>

        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {cancelText}
          </Button>
          <Button
            variant={config.confirmVariant}
            onClick={handleConfirm}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {isLoading ? "Processando..." : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};