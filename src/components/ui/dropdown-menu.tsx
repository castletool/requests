import * as React from "react";
import * as D from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

export const DropdownMenu = D.Root, DropdownMenuTrigger = D.Trigger, DropdownMenuRadioGroup = D.RadioGroup, DropdownMenuSub = D.Sub;
const item = "relative flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none data-[highlighted]:bg-accent data-[disabled]:opacity-50";
const panel = "z-50 min-w-[11rem] overflow-hidden rounded-xl border border-border bg-black p-1 text-white shadow-lg";

export const DropdownMenuContent = React.forwardRef<any, any>(({ className, sideOffset = 6, ...p }, ref) => (
  <D.Portal><D.Content ref={ref} sideOffset={sideOffset} className={cn(panel, className)} {...p} /></D.Portal>));
export const DropdownMenuItem = React.forwardRef<any, any>(({ className, ...p }, ref) => <D.Item ref={ref} className={cn(item, className)} {...p} />);
export const DropdownMenuSeparator = (p: any) => <D.Separator className="-mx-1 my-1 h-px bg-border" {...p} />;
export const DropdownMenuRadioItem = React.forwardRef<any, any>(({ className, children, ...p }, ref) => (
  <D.RadioItem ref={ref} className={cn(item, "pl-8", className)} {...p} value={p.value}>
    <span className="absolute left-3 flex h-3 w-3 items-center justify-center"><D.ItemIndicator><span className="block h-2 w-2 rounded-full bg-white" /></D.ItemIndicator></span>{children}
  </D.RadioItem>));
export const DropdownMenuSubTrigger = React.forwardRef<any, any>(({ className, children, ...p }, ref) => (
  <D.SubTrigger ref={ref} className={cn(item, "justify-between", className)} {...p}>{children}<span className="text-muted-foreground">›</span></D.SubTrigger>));
export const DropdownMenuSubContent = React.forwardRef<any, any>(({ className, ...p }, ref) => (
  <D.Portal><D.SubContent ref={ref} className={cn(panel, className)} {...p} /></D.Portal>));
