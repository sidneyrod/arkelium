import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface PasswordDisplayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  password: string;
  userName?: string;
  title?: string;
  description?: string;
}

const PasswordDisplayDialog = ({
  open,
  onOpenChange,
  password,
  userName,
  title = 'Senha Temporária Gerada',
  description,
}: PasswordDisplayDialogProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      toast({
        title: 'Copiado!',
        description: 'Senha copiada para a área de transferência.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível copiar a senha.',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description || (
              userName
                ? `Uma senha temporária foi gerada para ${userName}. Copie e compartilhe com o usuário.`
                : 'Uma senha temporária foi gerada. Copie e compartilhe com o usuário.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              value={password}
              readOnly
              className="font-mono text-lg tracking-wider bg-muted"
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={handleCopy}
              className="shrink-0"
            >
              {copied ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="rounded-md bg-warning/10 border border-warning/30 p-3">
            <p className="text-sm text-warning-foreground font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Importante
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Esta senha não será exibida novamente. Certifique-se de copiá-la e repassar ao usuário antes de fechar esta janela.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleClose} className="w-full sm:w-auto">
            Entendi, já copiei a senha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PasswordDisplayDialog;
