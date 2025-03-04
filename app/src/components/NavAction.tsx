"use client"

import DashboardCustomizeRoundedIcon from "@mui/icons-material/DashboardCustomizeRounded";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavAction() {
  return (
    <SidebarMenu>
      <SidebarMenuItem key="new">
        <SidebarMenuButton onClick={() => console.log("todo")}>
          <DashboardCustomizeRoundedIcon />
          <span>SOMETHING</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
