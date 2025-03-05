"use client"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import icon from '@/assets/icon.png';
import { useConfig } from "@/context/ConfigContext";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { copyToClipboard } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

export function NavHeader() {
  const { baseUrl } = useConfig();
  const { toast } = useToast();
  const { open } = useSidebar()

  const handleCopy = async () => {
    const success = await copyToClipboard(baseUrl);
    if (success) {
      toast({
        description: "API URL copied to clipboard",
      });
    }
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          <div className="flex aspect-square size-7 items-center justify-center">
            <img src={icon} className="translate-x-1" alt="Ploomber Icon" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">
              Admin Dashboard
            </span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
      {open &&
        <SidebarMenuItem className="flex flex-col gap-1 px-4 py-2 bg-muted/50 rounded-lg">
          <span className="text-xs font-medium text-muted-foreground">Gateway URL</span>
          <div className="flex items-center justify-between w-full">
            <code className="text-sm font-mono truncate">{baseUrl}</code>
            <Button variant="ghost" size="icon" onClick={handleCopy}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </SidebarMenuItem>
      }
    </SidebarMenu>
  )
}
