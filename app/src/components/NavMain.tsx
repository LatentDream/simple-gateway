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

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex">
        Applications
        <div className="flex-grow" />
        <SyncIcon
          onClick={() => console.log("todo")}
          className="cursor-pointer hover:transition-transform hover:duration-300 ease-in-out hover:-rotate-12 active:-rotate-180"
        />
      </SidebarGroupLabel>
      <SidebarMenu>
      </SidebarMenu>
    </SidebarGroup>
  )
}
