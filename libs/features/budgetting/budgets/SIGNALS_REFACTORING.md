# Angular Signals Refactoring Documentation

## Overview

This document details the refactoring of the budget selection feature from RxJS Observable-based state management to Angular Signals. The refactoring modernizes the codebase by adopting Angular's fine-grained reactivity system, improving performance and developer experience.

## Quick Summary

**What Changed:**
- ✅ Replaced constructor injection with `inject()` function
- ✅ Converted RxJS Observables to Angular Signals using `toSignal()`
- ✅ Replaced `combineLatest` with `computed()` for derived state
- ✅ Converted `@Input()` to signal-based inputs using `input()`
- ✅ Replaced subscriptions with `effect()` for reactive side effects
- ✅ Added `ChangeDetectionStrategy.OnPush` for zoneless operation
- ✅ Removed unnecessary lifecycle hooks (`OnInit`)
- ✅ Removed subscription management code (`SubSink`)

**Files Modified:**
1. `libs/features/budgetting/budgets/src/lib/pages/select-budget/select-budget.component.ts`
2. `libs/features/budgetting/budgets/src/lib/pages/select-budget/select-budget.component.html`
3. `libs/features/budgetting/budgets/src/lib/components/budget-table/budget-table.component.ts`

**Result:**
- Better performance with fine-grained reactivity
- Cleaner, more maintainable code
- Zoneless components ready for Angular's future
- Type-safe signal-based inputs

## Components Refactored

1. **SelectBudgetPageComponent** (Parent Component)
   - Location: `libs/features/budgetting/budgets/src/lib/pages/select-budget/select-budget.component.ts`
   - Template: `libs/features/budgetting/budgets/src/lib/pages/select-budget/select-budget.component.html`

2. **BudgetTableComponent** (Child Component)
   - Location: `libs/features/budgetting/budgets/src/lib/components/budget-table/budget-table.component.ts`
   - Template: `libs/features/budgetting/budgets/src/lib/components/budget-table/budget-table.component.html`

---

## Changes Summary

### Before (RxJS Observable Pattern)

**SelectBudgetPageComponent:**
- Used constructor injection for dependencies
- Managed state with RxJS Observables (`overview$`, `sharedBudgets$`, `allBudgets$`)
- Used `combineLatest` to combine multiple observables
- Passed observables to child component via `@Input()`
- Required `OnInit` lifecycle hook to initialize observables

**BudgetTableComponent:**
- Used constructor injection for dependencies
- Received observables via `@Input()`
- Required `SubSink` for subscription management
- Used `ngOnInit()` to subscribe to observables
- Manual subscription cleanup needed

### After (Angular Signals Pattern)

**SelectBudgetPageComponent:**
- Uses `inject()` function for dependency injection
- Converts observables to signals using `toSignal()`
- Uses `computed()` for derived state
- Passes signal values to child component
- No lifecycle hooks needed
- Zoneless with `ChangeDetectionStrategy.OnPush`

**BudgetTableComponent:**
- Uses `inject()` function for dependency injection
- Uses signal-based inputs (`input()`)
- Uses `effect()` for reactive side effects
- No subscriptions or cleanup needed
- Zoneless with `ChangeDetectionStrategy.OnPush`

---

## Detailed Changes

### 1. SelectBudgetPageComponent

#### Dependency Injection Refactoring

**Before:**
```typescript
constructor(
  private _orgBudgets$$: OrgBudgetsStore,
  private _budgets$$: BudgetsStore,
  private _dialog: MatDialog,
  private _logger: Logger
) { }
```

**After:**
```typescript
// Inject dependencies using inject() instead of constructor
private _orgBudgets$$ = inject(OrgBudgetsStore);
private _budgets$$ = inject(BudgetsStore);
private _dialog = inject(MatDialog);
private _logger = inject(Logger);
```

**Why:** The `inject()` function is the modern Angular way to inject dependencies. It can be used in class fields, making the code cleaner and allowing for better tree-shaking.

#### Observable to Signal Conversion

**Before:**
```typescript
overview$!: Observable<OrgBudgetsOverview>;
sharedBudgets$: Observable<any[]>;

ngOnInit() {
  this.overview$ = this._orgBudgets$$.get();
  this.sharedBudgets$ = this._budgets$$.get();
}
```

**After:**
```typescript
/** Overview which contains all budgets of an organisation - converted to signal */
overview = toSignal(this._orgBudgets$$.get(), { 
  initialValue: { inUse: [], underConstruction: [], archived: [] } as OrgBudgetsOverview 
});

/** Shared budgets - converted to signal */
sharedBudgets = toSignal(this._budgets$$.get(), { initialValue: [] });
```

**Why:** 
- `toSignal()` converts RxJS Observables to Angular Signals
- Provides initial values to prevent undefined errors
- Signals are automatically tracked and update reactively
- No need for `ngOnInit()` lifecycle hook

#### Combining Observables with Computed Signals

**Before:**
```typescript
allBudgets$: Observable<{overview: BudgetRecord[], budgets: any[]}>;

ngOnInit() {
  this.allBudgets$ = combineLatest([this.overview$, this._budgets$$.get()])
    .pipe(
      map(([overview, budgets]) => {
        return {overview: __flatMap(overview), budgets: __flatMap(budgets)};
      }),
      map((overview) => {
        const trBudgets = overview.budgets.map((budget: any) => {
          budget['endYear'] = budget.startYear + budget.duration - 1;
          return budget;
        });
        return {overview: overview.overview, budgets: trBudgets};
      })
    );
}
```

**After:**
```typescript
/** Computed signal that combines overview and budgets */
allBudgets = computed(() => {
  const overview = this.overview();
  const budgets = this.sharedBudgets();
  
  if (!overview || !budgets) {
    return { overview: [], budgets: [] };
  }

  const flatOverview = __flatMap(overview);
  const flatBudgets = __flatMap(budgets);
  
  const trBudgets = flatBudgets.map((budget: any) => {
    budget['endYear'] = budget.startYear + budget.duration - 1;
    return budget;
  });

  return { overview: flatOverview, budgets: trBudgets };
});
```

**Why:**
- `computed()` creates a derived signal that automatically recalculates when dependencies change
- More declarative and easier to read than RxJS operators
- Automatically tracks dependencies (signals used inside)
- No need for `combineLatest` or manual subscription management

#### Template Update

**Before:**
```html
<app-budget-table [budgets$]="allBudgets$"></app-budget-table>
```

**After:**
```html
<app-budget-table [budgets]="allBudgets()"></app-budget-table>
```

**Why:**
- Signals are accessed by calling them as functions: `signal()`
- Passes the actual value, not the observable stream
- Template automatically tracks signal changes

#### Change Detection Strategy

**Before:**
```typescript
@Component({
  // ... no changeDetection specified (default)
})
```

**After:**
```typescript
@Component({
  // ...
  changeDetection: ChangeDetectionStrategy.OnPush
})
```

**Why:**
- `OnPush` change detection only runs when:
  - Input references change
  - An event originates from the component
  - An async pipe receives a new value
  - A signal used in the template changes
- Significantly improves performance by reducing unnecessary change detection cycles
- Makes the component "zoneless" - doesn't rely on Zone.js for change detection

---

### 2. BudgetTableComponent

#### Dependency Injection Refactoring

**Before:**
```typescript
constructor(
  private _router$$: Router,
  private _dialog: MatDialog,
) { }
```

**After:**
```typescript
// Inject dependencies using inject() instead of constructor
private _router$$ = inject(Router);
private _dialog = inject(MatDialog);
```

**Why:** Consistent with modern Angular patterns and parent component refactoring.

#### Signal-Based Inputs

**Before:**
```typescript
@Input() budgets$: Observable<{overview: BudgetRecord[], budgets: any[]}>;
@Input() canPromote = false;
```

**After:**
```typescript
// Signal-based inputs
budgets = input.required<{overview: BudgetRecord[], budgets: any[]}>();
canPromote = input<boolean>(false);
```

**Why:**
- Signal-based inputs are type-safe and provide better developer experience
- `input.required()` ensures the input is always provided
- Automatically tracked by Angular's change detection
- Can be accessed as `this.budgets()` in the component

#### Removing Subscriptions

**Before:**
```typescript
private _sbS = new SubSink();

ngOnInit(): void {
  this._sbS.sink = this.budgets$.pipe(tap((o) => {
    this.overviewBudgets = o.overview;
    this.dataSource.data = o.budgets;
  })).subscribe();
}
```

**After:**
```typescript
constructor() {
  // Use effect() to reactively update dataSource when budgets signal changes
  effect(() => {
    const budgetsData = this.budgets();
    if (budgetsData) {
      this.overviewBudgets = budgetsData.overview;
      this.dataSource.data = budgetsData.budgets;
    }
  });
}
```

**Why:**
- `effect()` runs whenever any signal it reads changes
- No need for manual subscription management
- No need for `SubSink` or cleanup logic
- Automatically tracks signal dependencies
- Runs in a reactive context, ensuring proper change detection

#### Using Signal Values

**Before:**
```typescript
promote() {
  if (this.canPromote)
    this.doPromote.emit();
}
```

**After:**
```typescript
promote() {
  if (this.canPromote())  // Access signal value
    this.doPromote.emit();
}
```

**Why:** Signal inputs must be called as functions to access their values.

#### Change Detection Strategy

**Before:**
```typescript
@Component({
  // ... no changeDetection specified
})
```

**After:**
```typescript
@Component({
  // ...
  changeDetection: ChangeDetectionStrategy.OnPush
})
```

**Why:** Same benefits as parent component - improved performance and zoneless operation.

---

## Benefits of the Refactoring

### 1. Performance Improvements

- **Fine-grained Reactivity**: Signals only update what actually changed, not entire component trees
- **OnPush Change Detection**: Reduces unnecessary change detection cycles
- **Zoneless Operation**: Less reliance on Zone.js, better performance
- **Automatic Tracking**: Angular automatically tracks signal dependencies

### 2. Developer Experience

- **Type Safety**: Signal-based inputs provide better type checking
- **Cleaner Code**: No manual subscription management
- **Declarative**: `computed()` is more readable than RxJS operators
- **Modern API**: Uses latest Angular features (Signals, inject())

### 3. Maintainability

- **Less Boilerplate**: No `SubSink`, no `ngOnInit()` for simple cases
- **Automatic Cleanup**: No need to manually unsubscribe
- **Clearer Intent**: Signals make data flow more explicit
- **Easier Testing**: Signals are easier to test than observables

### 4. Future-Proofing

- **Angular's Direction**: Signals are Angular's recommended approach going forward
- **Zoneless Future**: Prepares for Angular's zoneless future
- **Better Integration**: Works seamlessly with other Angular features

---

## Migration Checklist

- [x] Replace constructor injection with `inject()`
- [x] Convert observables to signals using `toSignal()`
- [x] Replace `combineLatest` with `computed()`
- [x] Convert `@Input()` to signal-based inputs
- [x] Replace subscriptions with `effect()`
- [x] Update templates to use signal values
- [x] Add `ChangeDetectionStrategy.OnPush`
- [x] Remove unnecessary lifecycle hooks
- [x] Remove subscription management code (`SubSink`)

---

## Testing Considerations

When testing these components:

1. **Signal Values**: Access signal values by calling them as functions in tests
2. **Effect Testing**: Effects run automatically when signals change
3. **Change Detection**: May need to manually trigger change detection in tests with `OnPush`
4. **Input Signals**: Test signal inputs by setting values directly

Example test pattern:
```typescript
it('should update dataSource when budgets signal changes', () => {
  const component = fixture.componentInstance;
  const testData = { overview: [], budgets: [] };
  
  // Set signal value
  component.budgets.set(testData);
  fixture.detectChanges();
  
  expect(component.dataSource.data).toEqual(testData.budgets);
});
```

---

## Potential Issues and Solutions

### Issue: ViewChild Not Available in Effect

**Problem:** `effect()` runs before `ngAfterViewInit()`, so ViewChild references may not be available.

**Solution:** Handle ViewChild setup in `ngAfterViewInit()` separately, as done in the refactored code.

### Issue: Observable-Based Stores

**Problem:** The stores (`OrgBudgetsStore`, `BudgetsStore`) still return Observables.

**Solution:** Use `toSignal()` to convert them. In the future, consider refactoring stores to return signals directly.

### Issue: Dialog Subscriptions

**Problem:** `dialog.afterClosed()` still returns an Observable.

**Solution:** This is acceptable for one-time operations. For full signal migration, consider converting to a Promise or using `firstValueFrom()` with `toSignal()`.

---

## Future Improvements

1. **Store Refactoring**: Refactor stores to return signals instead of observables
2. **Effect Cleanup**: Consider using `effect()` cleanup functions for any side effects
3. **Signal Writable**: Consider using `signal()` for local component state
4. **Computed Optimization**: Review computed signals for potential memoization improvements
5. **Full Zoneless**: Remove Zone.js dependency entirely when Angular supports it

---

## References

- [Angular Signals Documentation](https://angular.dev/guide/signals)
- [Angular Change Detection](https://angular.dev/guide/change-detection)
- [Angular Dependency Injection](https://angular.dev/guide/di)
- [RxJS to Signals Migration Guide](https://angular.dev/guide/signals/migration)

---

## Conclusion

This refactoring successfully modernizes the budget selection feature to use Angular Signals, providing better performance, improved developer experience, and preparing the codebase for Angular's future direction. The components are now zoneless, use fine-grained reactivity, and require less boilerplate code.

