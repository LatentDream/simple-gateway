"use client"

import RouterIcon from '@mui/icons-material/Router';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useNavigate } from 'react-router-dom';

export function NavAction() {
  const navTo = useNavigate()
  return (
    <SidebarMenu>
      <SidebarMenuItem key="new">
        <SidebarMenuButton onClick={() => navTo("/")}>
          <DashboardIcon />
          <span>Overview</span>
        </SidebarMenuButton>
        <SidebarMenuButton onClick={() => navTo("/config")}>
          <RouterIcon />
          <span>Config</span>
        </SidebarMenuButton>
        <SidebarMenuButton onClick={() => navTo("/analytics")}>
          <AnalyticsIcon />
          <span>Analytics</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
