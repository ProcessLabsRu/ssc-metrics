import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HelpCircle } from "lucide-react";
import { useInterfaceSettings } from "@/hooks/useInterfaceSettings";
import { ScrollArea } from "@/components/ui/scroll-area";

export const HelpButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { settings } = useInterfaceSettings();

  const hasInstructions = settings?.help_instructions && 
    settings.help_instructions.trim().length > 0;

  if (!hasInstructions) return null;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="text-muted-foreground hover:text-foreground"
        title="Помощь"
      >
        <HelpCircle className="h-4 w-4" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Инструкция по работе с системой</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="whitespace-pre-wrap text-sm">
              {settings?.help_instructions}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};
