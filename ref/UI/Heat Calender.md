---
title: "Heat Calendar"
description: "Composable activity calendar with Grid, Legend, and Tooltip parts, controlled range selection, and UTC calendar dates. Supply weekly intensities to visualize activity and total a selected span."
category: "Charts"
publishedAt: "2026-09-11"
updatedAt: "2026-09-14"
documentation: "https://beui.dev/charts/heat-calendar"
markdown: "https://beui.dev/charts/heat-calendar.md"
license: "MIT"
---

# Heat Calendar

> Composable activity calendar with Grid, Legend, and Tooltip parts, controlled range selection, and UTC calendar dates. Supply weekly intensities to visualize activity and total a selected span.

## Install

```bash
npx shadcn@latest add @beui/heat-calendar
```

## Dependencies

- `clsx`
- `motion`
- `react`
- `react-dom`
- `tailwind-merge`

## Usage

```tsx
"use client";

import {
  HeatCalendar,
  HeatCalendarGrid,
  HeatCalendarLegend,
  HeatCalendarTooltip,
} from "@/components/charts/heat-calendar";

/** Deterministic demo field so every render agrees; weekends run quieter. */
function demoLevel(week: number, day: number) {
  const s = Math.sin(week * 12.9898 + day * 78.233) * 43758.5453;
  const r = s - Math.floor(s);
  return day >= 5 ? Math.max(0, r - 0.55) * 1.4 : r;
}

const values = Array.from({ length: 16 }, (_, w) => Array.from({ length: 7 }, (_, d) => demoLevel(w, d)));

export function HeatCalendarPreview() {
  return (
    <HeatCalendar unit="commits" weeks={16} maxCount={14} values={values}>
      <HeatCalendarGrid>
        <HeatCalendarTooltip />
      </HeatCalendarGrid>
      <HeatCalendarLegend />
    </HeatCalendar>
  );
}
```

## API Reference

### HeatCalendar

| Prop | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `unit` | `string` | — | No | Noun after every count, e.g. "commits", "ships". |
| `weeks` | `number` | — | No | Number of week columns. |
| `maxCount` | `number` | — | No | Count a cell at intensity 1 stands for; a cell reads `intensity × maxCount`. |
| `values` | `number[][]` | — | No | `values[week][day]` intensities in 0..1, seven days per week. Missing values are zero. |
| `endDate` | `Date` | — | No | Last UTC calendar day of the grid. Defaults to today after mount; explicit dates render identically in every timezone. |
| `color` | `string` | — | No | The single hue. Any CSS color; magnitude maps to its strength, never to a second color. |
| `className` | `string` | — | No | — |
| `selection` | `HeatCalendarSelection \| null` | — | No | Controlled selection; null clears it. Cell coordinates are zero-based week/day (Monday first). |
| `defaultSelection` | `HeatCalendarSelection \| null` | — | No | — |
| `onSelectionChange` | `((selection: HeatCalendarSelection \| null) => void)` | — | No | — |

### HeatCalendarGrid

| Prop | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `className` | `string` | — | No | — |

### HeatCalendarLegend

| Prop | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `className` | `string` | — | No | — |

### HeatCalendarTooltip

| Prop | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `className` | `string` | — | No | — |

## Source

- Registry detail: https://beui.dev/r/heat-calendar
- Raw source: https://beui.dev/r/heat-calendar/raw
- GitHub: https://github.com/starc007/ui-components
