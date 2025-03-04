"use client"
import SyncIcon from '@mui/icons-material/Sync';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"


export function NavMain() {

  const { toggleSidebar, state } = useSidebar()

  const expandSidebar = () => {
    if (state == "collapsed") {
      toggleSidebar()
    }
  }

  const collapseSidebar = () => {
    if (state == "expanded") {
      toggleSidebar()
    }
  }

  return (<></>)
}
