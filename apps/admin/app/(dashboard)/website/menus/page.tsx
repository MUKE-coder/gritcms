"use client";

import { useState } from "react";
import { useMenus, useMenu, useCreateMenu, useUpdateMenu, useDeleteMenu, useCreateMenuItem, useUpdateMenuItem, useDeleteMenuItem, useReorderMenuItems } from "@/hooks/use-website";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from "@/lib/icons";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import type { MenuItem } from "@repo/shared/types";

export default function MenusPage() {
  const { data: menus, isLoading } = useMenus();
  const { mutate: createMenu, isPending: isCreatingMenu } = useCreateMenu();
  const { mutate: deleteMenu, isPending: isDeletingMenu } = useDeleteMenu();
  const { mutate: createItem } = useCreateMenuItem();
  const { mutate: deleteItem } = useDeleteMenuItem();

  const [showForm, setShowForm] = useState(false);
  const [menuName, setMenuName] = useState("");
  const [menuLocation, setMenuLocation] = useState("header");
  const [selectedMenuId, setSelectedMenuId] = useState<number | null>(null);
  const [deletingMenuId, setDeletingMenuId] = useState<number | null>(null);

  // Add item form
  const [showAddItem, setShowAddItem] = useState(false);
  const [itemLabel, setItemLabel] = useState("");
  const [itemUrl, setItemUrl] = useState("");

  const handleCreateMenu = (e: React.FormEvent) => {
    e.preventDefault();
    if (!menuName.trim()) return;
    createMenu({ name: menuName, location: menuLocation }, {
      onSuccess: () => { setMenuName(""); setMenuLocation("header"); setShowForm(false); },
    });
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemLabel.trim() || !selectedMenuId) return;
    createItem({ menuId: selectedMenuId, label: itemLabel, url: itemUrl }, {
      onSuccess: () => { setItemLabel(""); setItemUrl(""); setShowAddItem(false); },
    });
  };

  const selectedMenu = menus?.find((m) => m.id === selectedMenuId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Menus</h1>
          <p className="text-text-secondary mt-1">Manage navigation menus for your website</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors">
          <Plus className="h-4 w-4" />
          New Menu
        </button>
      </div>

      {/* Create menu form */}
      {showForm && (
        <form onSubmit={handleCreateMenu} className="rounded-xl border border-border bg-bg-secondary p-4 space-y-3">
          <div className="flex flex-wrap gap-3">
            <input type="text" value={menuName} onChange={(e) => setMenuName(e.target.value)} placeholder="Menu name" className="flex-1 min-w-[200px] rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none" autoFocus />
            <select value={menuLocation} onChange={(e) => setMenuLocation(e.target.value)} className="rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-foreground focus:outline-none">
              <option value="header">Header</option>
              <option value="footer">Footer</option>
              <option value="sidebar">Sidebar</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={isCreatingMenu || !menuName.trim()} className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50 transition-colors">Create</button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-border px-4 py-1.5 text-sm text-text-secondary hover:bg-bg-hover transition-colors">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Menu list */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider px-1">Your Menus</h2>
          {isLoading ? (
            <div className="text-text-muted text-sm p-4">Loading...</div>
          ) : !menus || menus.length === 0 ? (
            <div className="rounded-xl border border-border bg-bg-secondary p-6 text-center text-text-muted text-sm">No menus yet</div>
          ) : (
            menus.map((menu) => (
              <button
                key={menu.id}
                onClick={() => setSelectedMenuId(menu.id)}
                className={`w-full flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${
                  selectedMenuId === menu.id
                    ? "border-accent bg-accent/5 text-accent"
                    : "border-border bg-bg-secondary text-foreground hover:border-accent/30"
                }`}
              >
                <div>
                  <p className="text-sm font-medium">{menu.name}</p>
                  <p className="text-xs text-text-muted">{menu.location} — {menu.items?.length ?? 0} items</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeletingMenuId(menu.id); }}
                  className="rounded p-1 text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </button>
            ))
          )}
        </div>

        {/* Menu items editor */}
        <div className="lg:col-span-2">
          {selectedMenu ? (
            <div className="rounded-xl border border-border bg-bg-secondary p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">{selectedMenu.name}</h2>
                <button onClick={() => setShowAddItem(true)} className="flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent/20 transition-colors">
                  <Plus className="h-3.5 w-3.5" />
                  Add Item
                </button>
              </div>

              {/* Add item form */}
              {showAddItem && (
                <form onSubmit={handleAddItem} className="rounded-lg border border-border bg-bg-tertiary p-3 space-y-2">
                  <input type="text" value={itemLabel} onChange={(e) => setItemLabel(e.target.value)} placeholder="Label" className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-1.5 text-sm text-foreground placeholder:text-text-muted focus:outline-none" autoFocus />
                  <input type="text" value={itemUrl} onChange={(e) => setItemUrl(e.target.value)} placeholder="URL (e.g., /about or https://...)" className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-1.5 text-sm text-foreground placeholder:text-text-muted focus:outline-none" />
                  <div className="flex gap-2">
                    <button type="submit" disabled={!itemLabel.trim()} className="rounded-lg bg-accent px-3 py-1 text-xs font-medium text-white hover:bg-accent/90 disabled:opacity-50 transition-colors">Add</button>
                    <button type="button" onClick={() => setShowAddItem(false)} className="rounded-lg border border-border px-3 py-1 text-xs text-text-secondary hover:bg-bg-hover transition-colors">Cancel</button>
                  </div>
                </form>
              )}

              {/* Menu items list */}
              {!selectedMenu.items || selectedMenu.items.length === 0 ? (
                <p className="text-sm text-text-muted py-4 text-center">No items in this menu. Add your first item.</p>
              ) : (
                <div className="space-y-1">
                  {selectedMenu.items.map((item) => (
                    <MenuItemRow key={item.id} item={item} menuId={selectedMenu.id} onDelete={(itemId) => deleteItem({ menuId: selectedMenu.id, itemId })} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-bg-secondary p-12 text-center text-text-muted">
              <p className="text-sm">Select a menu to manage its items</p>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={deletingMenuId !== null}
        onConfirm={() => { if (deletingMenuId) deleteMenu(deletingMenuId); setDeletingMenuId(null); setSelectedMenuId(null); }}
        onCancel={() => setDeletingMenuId(null)}
        title="Delete Menu"
        description="This will delete the menu and all its items. Are you sure?"
        confirmLabel="Delete"
        variant="danger"
        loading={isDeletingMenu}
      />
    </div>
  );
}

function MenuItemRow({ item, menuId, onDelete, depth = 0 }: { item: MenuItem; menuId: number; onDelete: (id: number) => void; depth?: number }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = item.children && item.children.length > 0;

  return (
    <div>
      <div className={`flex items-center gap-2 rounded-lg border border-border bg-bg-tertiary px-3 py-2 hover:border-accent/30 transition-colors`} style={{ marginLeft: depth * 24 }}>
        {hasChildren ? (
          <button onClick={() => setExpanded(!expanded)} className="p-0.5 text-text-muted">
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <span className="flex-1 text-sm text-foreground">{item.label}</span>
        <span className="text-xs text-text-muted">{item.url || (item.page ? `/${item.page.slug}` : "")}</span>
        <button onClick={() => onDelete(item.id)} className="rounded p-1 text-text-muted hover:text-danger hover:bg-danger/10 transition-colors">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      {hasChildren && expanded && item.children!.map((child) => (
        <MenuItemRow key={child.id} item={child} menuId={menuId} onDelete={onDelete} depth={depth + 1} />
      ))}
    </div>
  );
}
