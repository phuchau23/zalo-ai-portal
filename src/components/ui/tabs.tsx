"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { motion } from "motion/react"
import { Tabs as TabsPrimitive } from "radix-ui"
import { spring } from "@/lib/motion"

/*
 * Tab có nền/vạch "đang chọn" trượt sang tab mới (motion layoutId) thay vì nhảy.
 * Ba kiểu:
 * - default: nút chọn trên rãnh xám, viên trắng trượt (chọn khoảng thời gian, chế độ xem).
 * - line: gạch chân trượt (tab phụ trong khung, ví dụ khung bên của Chat thử).
 * - pill: tab đầu trang trên thẻ trắng, viên dải màu trượt (Danh mục, Bán hàng, Kho hàng...).
 * Tabs luôn được điều khiển nội bộ để biết tab nào đang chọn; trang vẫn dùng `value`/`defaultValue`/`onValueChange` như cũ.
 */
type TabsListVariant = "default" | "line" | "pill"

const TabsContext = React.createContext<{ value: string; id: string } | null>(null)
const TabsListContext = React.createContext<TabsListVariant>("default")

function Tabs({
  className,
  orientation = "horizontal",
  value,
  defaultValue,
  onValueChange,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  const [inner, setInner] = React.useState(defaultValue ?? "")
  const current = value ?? inner
  const id = React.useId()
  const context = React.useMemo(() => ({ value: current, id }), [current, id])

  return (
    <TabsContext.Provider value={context}>
      <TabsPrimitive.Root
        data-slot="tabs"
        data-orientation={orientation}
        orientation={orientation}
        value={current}
        onValueChange={(next) => {
          setInner(next)
          onValueChange?.(next)
        }}
        className={cn("group/tabs flex gap-2 data-horizontal:flex-col", className)}
        {...props}
      />
    </TabsContext.Provider>
  )
}

const tabsListVariants = cva(
  "group/tabs-list relative inline-flex w-fit items-center justify-center text-muted-foreground group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col",
  {
    variants: {
      variant: {
        default: "rounded-lg bg-muted p-[3px] group-data-horizontal/tabs:h-9",
        line: "gap-5 rounded-none bg-transparent p-0",
        pill: "gap-1 rounded-full border bg-card p-1",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  const resolved = variant ?? "default"
  return (
    <TabsListContext.Provider value={resolved}>
      <TabsPrimitive.List
        data-slot="tabs-list"
        data-variant={resolved}
        className={cn(tabsListVariants({ variant: resolved }), className)}
        {...props}
      />
    </TabsListContext.Provider>
  )
}

const triggerVariants: Record<TabsListVariant, string> = {
  default:
    "h-full flex-1 rounded-md px-2.5 text-foreground/60 hover:text-foreground data-active:text-foreground",
  line: "h-10 flex-none rounded-none px-0.5 hover:text-foreground data-active:text-primary",
  pill: "h-9 flex-none rounded-full px-4 text-foreground/65 hover:bg-muted/70 hover:text-foreground data-active:text-white data-active:hover:bg-transparent pointer-coarse:h-10",
}

const indicatorVariants: Record<TabsListVariant, string> = {
  default: "inset-0 rounded-md bg-background shadow-sm ring-1 ring-foreground/5 dark:bg-input/40",
  line: "inset-x-0 -bottom-px h-0.5 rounded-full bg-primary",
  pill: "inset-0 rounded-full bg-active-gradient",
}

function TabsTrigger({
  className,
  children,
  value,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const tabs = React.useContext(TabsContext)
  const variant = React.useContext(TabsListContext)
  const active = tabs?.value === value

  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      value={value}
      className={cn(
        "relative inline-flex cursor-pointer items-center justify-center gap-1.5 border border-transparent py-0.5 text-sm font-medium whitespace-nowrap transition-colors outline-none group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        triggerVariants[variant],
        className
      )}
      {...props}
    >
      {active && tabs && (
        <motion.span
          aria-hidden
          layoutId={`tabs-indicator-${tabs.id}`}
          className={cn("absolute", indicatorVariants[variant])}
          transition={spring}
        />
      )}
      <span className="relative inline-flex items-center gap-1.5">{children}</span>
    </TabsPrimitive.Trigger>
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        "flex-1 text-sm outline-none data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-1 data-[state=active]:duration-300 motion-reduce:data-[state=active]:animate-none",
        className
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
