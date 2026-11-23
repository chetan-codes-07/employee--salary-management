import { LayoutDashboard, Users } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import type { Page } from './route'

export function AppSidebar({
  path,
  insightUrl,
  employeesUrl,
  onGo,
}: {
  path: Page
  insightUrl: string
  employeesUrl: string
  onGo: (next: '/' | '/employees') => void
}) {
  const { setOpenMobile } = useSidebar()

  function go(next: '/' | '/employees') {
    setOpenMobile(false)
    onGo(next)
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              tooltip="ACME"
              className="group-data-[collapsible=icon]:justify-center"
            >
              <a
                href={insightUrl}
                onClick={(event) => {
                  event.preventDefault()
                  go('/')
                }}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-sm font-medium">
                  A
                </span>
                <span className="font-medium group-data-[collapsible=icon]:hidden">ACME</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Compensation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  size="lg"
                  asChild
                  isActive={path === '/'}
                  tooltip="Insight"
                  className="group-data-[collapsible=icon]:justify-center"
                >
                  <a
                    href={insightUrl}
                    aria-current={path === '/' ? 'page' : undefined}
                    onClick={(event) => {
                      event.preventDefault()
                      go('/')
                    }}
                  >
                    <LayoutDashboard />
                    <span className="group-data-[collapsible=icon]:hidden">Insight</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  size="lg"
                  asChild
                  isActive={path !== '/'}
                  tooltip="Employees"
                  className="group-data-[collapsible=icon]:justify-center"
                >
                  <a
                    href={employeesUrl}
                    aria-current={path !== '/' ? 'page' : undefined}
                    onClick={(event) => {
                      event.preventDefault()
                      go('/employees')
                    }}
                  >
                    <Users />
                    <span className="group-data-[collapsible=icon]:hidden">Employees</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <p className="px-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">Fictional records</p>
      </SidebarFooter>
    </Sidebar>
  )
}
