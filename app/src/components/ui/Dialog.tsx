import type { ReactNode } from 'react';
import { CenterMorphModal, CenterMorphModalContent } from '@/components/motion/center-morph-modal';
import { Tabs, TabsList, TabsTrigger } from '@/components/motion/tabs';
import type { BlockKind } from '@/data/types';
import { useT } from '@/lib/i18n';

/** 所有浮层共用的壳：beui Center Morph Modal（从中心展开），标题在左上。 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  width = 400,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: number;
}) {
  return (
    <CenterMorphModal open={open} onOpenChange={(o) => !o && onClose()}>
      <CenterMorphModalContent ariaLabel={title} className="bg-card">
        <div className="flex max-h-[calc(100vh-6rem)] flex-col overflow-y-auto p-6" style={{ width, maxWidth: '100%' }}>
          <h2 className="mb-4 pr-8 text-base font-semibold text-foreground">{title}</h2>
          {children}
        </div>
      </CenterMorphModalContent>
    </CenterMorphModal>
  );
}

/** Focus / Leisure 二选一 = beui Tabs 的 segment 变体 */
export function KindToggle({ value, onChange }: { value: BlockKind; onChange: (k: BlockKind) => void }) {
  const { t } = useT();
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as BlockKind)} variant="segment" className="w-fit">
      <TabsList>
        <TabsTrigger value="focus">{t.focus}</TabsTrigger>
        <TabsTrigger value="fun">{t.leisure}</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

/** 表单里带标签的一行（label 在上、控件在下），跟 beui Input 自带的 label 同一节奏 */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
