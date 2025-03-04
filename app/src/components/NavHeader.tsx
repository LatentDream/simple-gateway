"use client"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import icon from '@/assets/icon.png';
import { useAuth } from "@/context/AuthContext"
import { capitalize } from "lodash"


export function NavHeader() {
  const { user } = useAuth();

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
              Ploomber Debugger
            </span>
            <span className="truncate text-xs">{capitalize(user?.type)}</span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
