/**
 * REFACTORED: Migrated from RxJS Observables to Angular Signals
 * 
 * Key Changes:
 * 1. Replaced constructor injection with inject() function
 * 2. Converted Observables to Signals using toSignal()
 * 3. Replaced combineLatest with computed() for derived state
 * 4. Removed OnInit lifecycle hook (no longer needed)
 * 5. Added ChangeDetectionStrategy.OnPush for zoneless operation
 */
import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
// toSignal converts RxJS Observables to Angular Signals
import { toSignal } from '@angular/core/rxjs-interop';

import { cloneDeep as ___cloneDeep, flatMap as __flatMap } from 'lodash';

import { Logger } from '@iote/bricks-angular';

import { Budget, BudgetRecord, BudgetStatus, OrgBudgetsOverview } from '@app/model/finance/planning/budgets';

import { BudgetsStore, OrgBudgetsStore } from '@app/state/finance/budgetting/budgets';

import { CreateBudgetModalComponent } from '../../components/create-budget-modal/create-budget-modal.component';


@Component({
  selector: 'app-select-budget',
  templateUrl: './select-budget.component.html',
  styleUrls: ['./select-budget.component.scss', 
              '../../components/budget-view-styles.scss'],
  // REFACTORED: OnPush change detection makes component zoneless
  // Only triggers change detection when:
  // - Input references change
  // - Events originate from this component
  // - Signals used in template change
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** List of all active budgets on the system. */
export class SelectBudgetPageComponent
{
  // REFACTORED: Using inject() instead of constructor injection
  // Benefits: Can be used in class fields, better tree-shaking, modern Angular pattern
  private _orgBudgets$$ = inject(OrgBudgetsStore);
  private _budgets$$ = inject(BudgetsStore);
  private _dialog = inject(MatDialog);
  private _logger = inject(Logger);

  /**
   * REFACTORED: Converted from Observable to Signal
   * 
   * Before: overview$!: Observable<OrgBudgetsOverview>;
   * After: overview = toSignal(...)
   * 
   * toSignal() converts the Observable from the store into a Signal.
   * The initialValue ensures we have a valid value before the Observable emits,
   * preventing undefined errors in computed signals.
   */
  overview = toSignal(this._orgBudgets$$.get(), { 
    initialValue: { inUse: [], underConstruction: [], archived: [] } as OrgBudgetsOverview 
  });

  /**
   * REFACTORED: Converted from Observable to Signal
   * 
   * Before: sharedBudgets$: Observable<any[]>;
   * After: sharedBudgets = toSignal(...)
   * 
   * Provides empty array as initial value to prevent undefined errors.
   */
  sharedBudgets = toSignal(this._budgets$$.get(), { initialValue: [] });

  showFilter = false;

  /**
   * REFACTORED: Replaced combineLatest with computed()
   * 
   * Before: 
   *   allBudgets$ = combineLatest([this.overview$, this._budgets$$.get()])
   *     .pipe(map(...), map(...))
   * 
   * After: 
   *   allBudgets = computed(() => { ... })
   * 
   * Benefits:
   * - Automatically tracks dependencies (signals used inside)
   * - Only recalculates when dependencies change
   * - More declarative and easier to read
   * - No need for RxJS operators
   * - No manual subscription management
   * 
   * This computed signal combines the overview and budgets signals,
   * flattens the nested arrays, and adds computed properties (endYear).
   */
  allBudgets = computed(() => {
    // Access signal values by calling them as functions
    const overview = this.overview();
    const budgets = this.sharedBudgets();
    
    // Guard clause: return empty data if signals haven't loaded yet
    if (!overview || !budgets) {
      return { overview: [], budgets: [] };
    }

    // Flatten nested arrays (same logic as before)
    const flatOverview = __flatMap(overview);
    const flatBudgets = __flatMap(budgets);
    
    // Add computed property: endYear = startYear + duration - 1
    const trBudgets = flatBudgets.map((budget: any) => {
      budget['endYear'] = budget.startYear + budget.duration - 1;
      return budget;
    });

    // Return combined and transformed data
    return { overview: flatOverview, budgets: trBudgets };
  });

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    // this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  fieldsFilter(value: (Invoice) => boolean) {    
    // this.filter$$.next(value);
  }

  toogleFilter(value) {
    // this.showFilter = value
  }

  openDialog(parent : Budget | false): void 
  {
    const dialog = this._dialog.open(CreateBudgetModalComponent, {
      height: 'fit-content',
      width: '600px',
      data: parent != null ? parent : false
    });

    dialog.afterClosed().subscribe(() => {
      // Dialog after action
    })
  }

  /** 
   * @TODO - Review and fix
   * Returns true if the budget can be activated */
  canPromote(record: BudgetRecord) {
    // Get's set on Budget Read from user privileges and budget status.
    return (record.budget as any).canBeActivated;
  }

  /** Activate budget -> Promote to be used in  */
  setActive(record: BudgetRecord) 
  {
    const toSave = ___cloneDeep(record.budget);

    // Clean up budget record values.
    delete (toSave as any).canBeActivated;
    delete (toSave as any).access;

    // Set Active
    toSave.status = BudgetStatus.InUse;

    (<any> record).updating = true;
    
    /**
     * NOTE: Store still returns Observable, so we use subscribe here.
     * In a fully signal-based architecture, the store would return a signal
     * or we could convert this Observable to a signal using toSignal().
     * For now, this is acceptable as it's a one-time operation.
     */
    this._budgets$$.update(toSave)
      .subscribe({
        next: () => {
          (<any> record).updating = false;
          this._logger.log(() => `Updated Budget with id ${toSave.id}. Set as an active budget for this org.`);
        },
        error: (error) => {
          (<any> record).updating = false;
          this._logger.log(() => `Error updating budget: ${error}`);
        }
      });
  }
}