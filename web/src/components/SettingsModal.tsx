import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/8bit/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/8bit/tabs';
import { Button } from '@/components/ui/8bit/button';
import { StatsTab } from './StatsTab';
import { SystemTab } from './SystemTab';

function CogIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

interface SettingsModalProps {
  onReboot: () => void;
  loading: string | null;
}

export function SettingsModal({ onReboot, loading }: SettingsModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <CogIcon />
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md h-auto max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base sm:text-lg">Settings</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="stats" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="stats" className="text-xs sm:text-sm">Stats</TabsTrigger>
            <TabsTrigger value="system" className="text-xs sm:text-sm">System</TabsTrigger>
          </TabsList>
          <TabsContent value="stats" className="mt-0">
            <StatsTab />
          </TabsContent>
          <TabsContent value="system" className="mt-0">
            <SystemTab onReboot={onReboot} loading={loading} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
