import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LogOut, ArrowLeft, GripVertical } from 'lucide-react';
import { Link } from 'wouter';
import { SIDEBAR_MENU_ITEMS } from '@/components/admin/shared/constants';
import type { AdminSection } from '@/components/admin/shared/types';
import { clsx } from 'clsx';

interface SidebarSortableItemProps {
  item: (typeof SIDEBAR_MENU_ITEMS)[number];
  isActive: boolean;
  onSelect: () => void;
}

function SidebarSortableItem({ item, isActive, onSelect }: SidebarSortableItemProps) {
  const { isMobile, setOpenMobile } = useSidebar();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={clsx(
        'group/menu-item relative transition-all',
        isDragging && 'opacity-60 ring-2 ring-primary/30 rounded-md'
      )}
    >
      <SidebarMenuButton
        onClick={() => {
          onSelect();
          if (isMobile) {
            setOpenMobile(false);
          }
        }}
        isActive={isActive}
        data-testid={`nav-${item.id}`}
        className="group/btn"
      >
        <div className="flex items-center gap-2 flex-1">
          <span
            className="p-1 -ml-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing opacity-0 group-hover/btn:opacity-100 transition-opacity"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-3.5 h-3.5" />
          </span>
          <item.icon className="w-4 h-4" />
          <span>{item.title}</span>
        </div>
      </SidebarMenuButton>
    </li>
  );
}

interface AdminSidebarProps {
  activeSection: AdminSection;
  sectionsOrder: AdminSection[];
  companyName?: string | null;
  logoIcon?: string | null;
  email?: string | null;
  onSectionChange: (section: AdminSection) => void;
  onSectionsReorder: (order: AdminSection[]) => void;
  onLogout: () => void;
}

export function AdminSidebar({
  activeSection,
  sectionsOrder,
  companyName,
  logoIcon,
  email,
  onSectionChange,
  onSectionsReorder,
  onLogout,
}: AdminSidebarProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sectionsOrder.indexOf(active.id as AdminSection);
    const newIndex = sectionsOrder.indexOf(over.id as AdminSection);
    if (oldIndex === -1 || newIndex === -1) return;

    onSectionsReorder(arrayMove(sectionsOrder, oldIndex, newIndex));
  };

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="p-4 border-b border-sidebar-border bg-sidebar">
        <div className="flex flex-col gap-4">
          <Link href="/" className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-primary transition-colors group">
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
            Back to website
          </Link>
          <div className="flex items-center gap-3">
            {logoIcon ? (
              <img
                src={logoIcon}
                alt={companyName || 'Logo'}
                className="w-10 h-10 object-contain"
                data-testid="img-admin-logo"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
                {companyName?.[0] || 'A'}
              </div>
            )}
            <span className="font-semibold text-lg text-primary truncate">{companyName || 'Admin Panel'}</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2 bg-sidebar">
        <SidebarGroup>
          <SidebarGroupContent>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={sectionsOrder} strategy={verticalListSortingStrategy}>
                <SidebarMenu>
                  {sectionsOrder.map((sectionId) => {
                    const item = SIDEBAR_MENU_ITEMS.find((i) => i.id === sectionId);
                    if (!item) return null;
                    return (
                      <SidebarSortableItem
                        key={item.id}
                        item={item}
                        isActive={activeSection === item.id}
                        onSelect={() => onSectionChange(item.id)}
                      />
                    );
                  })}
                </SidebarMenu>
              </SortableContext>
            </DndContext>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border mt-auto bg-sidebar">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <p className="text-muted-foreground text-xs">Logged in as</p>
              <p className="font-medium truncate text-foreground">{email}</p>
            </div>
            <ThemeToggle variant="icon" className="text-muted-foreground hover:text-foreground" />
          </div>
          <Button
            variant="default"
            className="w-full"
            onClick={onLogout}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

