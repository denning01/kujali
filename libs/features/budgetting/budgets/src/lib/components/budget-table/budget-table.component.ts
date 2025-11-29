import { Component, EventEmitter, Output, ViewChild, ChangeDetectionStrategy, input, effect, inject } from '@angular/core';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { MatSort } from '@angular/material/sort';
import { Router } from '@angular/router';

import { Budget, BudgetRecord } from '@app/model/finance/planning/budgets';

import { ShareBudgetModalComponent } from '../share-budget-modal/share-budget-modal.component';
import { CreateBudgetModalComponent } from '../create-budget-modal/create-budget-modal.component';
import { ChildBudgetsModalComponent } from '../../modals/child-budgets-modal/child-budgets-modal.component';

@Component({
  selector: 'app-budget-table',
  templateUrl: './budget-table.component.html',
  styleUrls: ['./budget-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})

export class BudgetTableComponent {

  // Inject dependencies using inject() instead of constructor
  private _router$$ = inject(Router);
  private _dialog = inject(MatDialog);

  // Signal-based inputs
  budgets = input.required<{overview: BudgetRecord[], budgets: any[]}>();
  canPromote = input<boolean>(false);

  @Output() doPromote: EventEmitter<void> = new EventEmitter();

  dataSource = new MatTableDataSource();

  displayedColumns: string[] = ['name', 'status', 'startYear', 'duration', 'actions'];

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild('sort', { static: true }) sort: MatSort;

  overviewBudgets: BudgetRecord[] = [];

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

  /** 
 * Checks whether the user has access to a certain feature.
 * 
 * @TODO @IanOdhiambo9 - Please put proper access control architecture in place. 
 */
  access(requested:any) 
  {  
    switch (requested) {
      case 'view':
      case 'clone':
        return true; //budget.access.owner || budget.access.view || budget.access.edit;
      case 'edit':
        return true; // (budget.access.owner || budget.access.edit) && budget.status !== BudgetStatus.InUse && budget.status !== BudgetStatus.InUse;
    }
    return false;
  }

  ngAfterViewInit(): void {
    // Update paginator and sort when view is initialized
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    
    // Also update dataSource in case budgets signal was set before view init
    const budgetsData = this.budgets();
    if (budgetsData) {
      this.dataSource.data = budgetsData.budgets;
    }
  }

  filterAccountRecords(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  promote() {
    if (this.canPromote())
      this.doPromote.emit();
  }

  /** Open share screen to configure budget access. */
  openShareBudgetDialog(parent: Budget | false): void 
  {
    this._dialog.open(ShareBudgetModalComponent, {
      panelClass: 'no-pad-dialog',
      width: '600px',
      data: parent != null ? parent : false
    });
  }

  /** Open clone screen to clone and reconfigure budget. */
  openCloneBudgetDialog(parent: Budget | false): void {
    this._dialog.open(CreateBudgetModalComponent, {
      height: 'fit-content',
      width: '600px',
      data: parent != null ? parent : false
    });
  }

  openChildBudgetDialog(parent : Budget): void 
  { 
    let children: any = this.overviewBudgets.find((budget) => budget.budget.id === parent.id)!?.children;
    children = children?.map((child) => child.budget)
    this._dialog.open(ChildBudgetsModalComponent, {
      height: 'fit-content',
      minWidth: '600px',
      data: {parent: parent, budgets: children}
    });
  }

  goToDetail(budgetId: string, action: string) {
    this._router$$.navigate(['budgets', budgetId, action]).then(() => this._dialog.closeAll());
  }

  deleteBudget(budget: Budget) {

  }

  translateStatus(status: number) {
    switch (status) {
      case 1:
        return 'BUDGET.STATUS.ACTIVE';
      case 0:
        return 'BUDGET.STATUS.DESIGN';
      case 9:
        return 'BUDGET.STATUS.NO-USE';
      case -1:
        return 'BUDGET.STATUS.DELETED';
      default:
        return '';
    }
  }
}
