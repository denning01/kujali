import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
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
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** List of all active budgets on the system. */
export class SelectBudgetPageComponent
{
  // Inject dependencies using inject() instead of constructor
  private _orgBudgets$$ = inject(OrgBudgetsStore);
  private _budgets$$ = inject(BudgetsStore);
  private _dialog = inject(MatDialog);
  private _logger = inject(Logger);

  /** Overview which contains all budgets of an organisation - converted to signal */
  overview = toSignal(this._orgBudgets$$.get(), { initialValue: { inUse: [], underConstruction: [], archived: [] } as OrgBudgetsOverview });

  /** Shared budgets - converted to signal */
  sharedBudgets = toSignal(this._budgets$$.get(), { initialValue: [] });

  showFilter = false;

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
    // Fire update - using subscribe for now as store returns Observable
    // In a fully signal-based approach, this would be refactored to return a signal
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