---
name: component
description: Create a new React component for the web UI. Use when adding UI components, features, or pages. Enforces skeleton loading, animations, and 8bitcn best practices.
---

# Component Creation Checklist

Before creating a component, answer these questions to determine requirements:

## 1. Does this component fetch or wait for data?

- [ ] **YES** → Component MUST support `loading?: boolean` prop with skeleton state
- [ ] **NO** → Skeleton state not required

If YES, implement skeleton pattern:
```tsx
interface MyComponentProps {
  data?: DataType;
  loading?: boolean;
}

function MyComponent({ data, loading }: MyComponentProps) {
  if (loading) {
    return <Skeleton className="h-X w-full" />;
  }
  return <div>{/* actual content */}</div>;
}
```

## 2. Does this component appear/disappear or need user attention?

- [ ] **Modal/Dialog** → MUST use react-spring animations with `ConfirmDialog` pattern
- [ ] **Toast/Alert** → Use sonner toast system
- [ ] **Page transition** → Consider useTransition
- [ ] **Static content** → No animation required

If animated modal needed:
```tsx
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

<ConfirmDialog
  open={open}
  onConfirm={handleConfirm}
  onCancel={() => setOpen(false)}
  title="Title"
  description="Description"
  confirmText="Confirm"
  cancelText="Cancel"
/>
```

## 3. Is this an interactive element?

- [ ] **YES** → MUST have touch-friendly sizing and feedback

Required classes for buttons/interactive elements:
```tsx
className="h-14 touch-manipulation active:scale-95 transition-transform"
```

## 4. Component Best Practices Checklist

### Required for ALL components:
- [ ] Use 8bitcn components from `@/components/ui/8bit/`
- [ ] Add `retro` class for pixel font where appropriate
- [ ] Use TypeScript interfaces for all props
- [ ] Mobile-first responsive design (`sm:` breakpoints)

### Required for data-displaying components:
- [ ] Implement `loading?: boolean` prop
- [ ] Show `<Skeleton />` during loading
- [ ] Handle error states with `<Alert />`

### Required for modals/dialogs:
- [ ] Use react-spring for enter/exit animations
- [ ] Include backdrop with blur (`bg-black/60 backdrop-blur-sm`)
- [ ] Responsive sizing (`inset-x-4 max-w-sm`)
- [ ] Large touch targets for buttons (`h-14`)

### Required for buttons/actions:
- [ ] Minimum height h-14 or h-16
- [ ] `touch-manipulation` class
- [ ] `active:scale-95` press feedback
- [ ] Show `<Spinner />` during async actions
- [ ] Disable during loading

### Required for forms:
- [ ] Confirmation dialog for destructive actions
- [ ] Proper error handling with Alert
- [ ] Success feedback with toast

## 5. File Location

| Component Type | Location |
|---------------|----------|
| Feature component | `src/components/FeatureName/` |
| Shared UI component | `src/components/ui/` |
| 8bitcn component | `src/components/ui/8bit/` (via registry) |

## 6. Creating the Component

1. Create file in appropriate location
2. Import from 8bitcn:
   ```tsx
   import { Button } from '@/components/ui/8bit/button';
   import { Skeleton } from '@/components/ui/8bit/skeleton';
   import { Spinner } from '@/components/ui/8bit/spinner';
   ```

3. Define TypeScript interface with loading prop if needed:
   ```tsx
   interface ComponentProps {
     data?: DataType;
     loading?: boolean;
     onAction?: () => void;
   }
   ```

4. Implement skeleton state first, then actual content

5. Add to parent component/page

6. Test on mobile (touch targets, responsiveness)

## Example: Complete Component

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/8bit/button';
import { Skeleton } from '@/components/ui/8bit/skeleton';
import { Spinner } from '@/components/ui/8bit/spinner';
import { Badge } from '@/components/ui/8bit/badge';

interface GameCardProps {
  name?: string;
  status?: 'online' | 'offline';
  loading?: boolean;
  onLaunch?: () => void;
}

export function GameCard({ name, status, loading, onLaunch }: GameCardProps) {
  const [launching, setLaunching] = useState(false);

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  const handleLaunch = async () => {
    setLaunching(true);
    await onLaunch?.();
    setLaunching(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="retro text-sm">{name}</span>
        <Badge variant={status === 'online' ? 'default' : 'secondary'}>
          {status}
        </Badge>
      </div>
      <Button
        className="w-full h-14 touch-manipulation active:scale-95 transition-transform"
        onClick={handleLaunch}
        disabled={launching || status === 'offline'}
      >
        {launching ? (
          <span className="flex items-center gap-2">
            <Spinner className="size-4" />
            Launching...
          </span>
        ) : (
          'Launch'
        )}
      </Button>
    </div>
  );
}
```

## Quick Reference

| Need | Solution |
|------|----------|
| Loading state | `loading` prop + `<Skeleton />` |
| Button loading | `<Spinner />` inside button |
| Modal animation | `react-spring` useTransition |
| Confirmation | `<ConfirmDialog />` |
| Error display | `<Alert variant="destructive" />` |
| Success feedback | `toast()` from sonner |
| Status indicator | `<Badge />` |
| Touch-friendly | `h-14 touch-manipulation active:scale-95` |
