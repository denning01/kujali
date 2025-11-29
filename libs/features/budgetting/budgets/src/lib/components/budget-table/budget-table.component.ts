/**
 * REFACTORED: Migrated from RxJS Observables to Angular Signals
 * 
 * Key Changes:
 * 1. Replaced constructor injection with inject() function
 * 2. Converted @Input() to signal-based inputs using input()
 * 3. Replaced subscription with effect() for reactive side effects
 * 4. Removed SubSink and ngOnInit() (no longer needed)
 * 5. Added ChangeDetectionStrategy.OnPush for zoneless operation
 */
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
  // REFACTORED: OnPush change detection makes component zoneless
  // Only triggers change detection when signals change or events occur
  changeDetection: ChangeDetectionStrategy.OnPush
})

export class BudgetTableComponent {

  // REFACTORED: Using inject() instead of constructor injection
  // Benefits: Can be used in class fields, better tree-shaking, modern Angular pattern
  private _router$$ = inject(Router);
  private _dialog = inject(MatDialog);

  /**
   * REFACTORED: Converted from @Input() to signal-based input
   * 
   * Before: @Input() budgets$: Observable<{overview: BudgetRecord[], budgets: any[]}>;
   * After: budgets = input.required<...>()
   * 
   * Benefits:
   * - Type-safe: TypeScript enforces the type
   * - Required: input.required() ensures the input is always provided
   * - Reactive: Automatically tracked by Angular's change detection
   * - Access: Use this.budgets() to get the current value
   * 
   * Usage in template: [budgets]="signalValue()"
   */
  budgets = input.required<{overview: BudgetRecord[], budgets: any[]}>();

  /**
   * REFACTORED: Converted from @Input() to signal-based input with default value
   * 
   * Before: @Input() canPromote = false;
   * After: canPromote = input<boolean>(false)
   * 
   * The default value (false) is used if the input is not provided.
   * Access the value using: this.canPromote()
   */
  canPromote = input<boolean>(false);

  @Output() doPromote: EventEmitter<void> = new EventEmitter();

  dataSource = new MatTableDataSource();

  displayedColumns: string[] = ['name', 'status', 'startYear', 'duration', 'actions'];

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild('sort', { static: true }) sort: MatSort;

  overviewBudgets: BudgetRecord[] = [];

  constructor() {
    /**
     * REFACTORED: Replaced subscription with effect()
     * 
     * Before:
     *   ngOnInit(): void {
     *     this._sbS.sink = this.budgets$.pipe(tap((o) => {
     *       this.overviewBudgets = o.overview;
     *       this.dataSource.data = o.budgets;
     *     })).subscribe();
     *   }
     * 
     * After:
     *   constructor() {
     *     effect(() => { ... });
     *   }
     * 
     * Benefits:
     * - No manual subscription management
     * - No need for SubSink or cleanup
     * - Automatically tracks signal dependencies
     * - Runs whenever budgets() signal changes
     * - Runs in a reactive context, ensuring proper change detection
     * 
     * effect() automatically tracks any signals read inside it.
     * When budgets() changes, this effect runs again.
     */
    effect(() => {
      // Access signal value by calling it as a function
      const budgetsData = this.budgets();
      
      if (budgetsData) {
        // Update component state reactively
        this.overviewBudgets = budgetsData.overview;
        this.dataSource.data = budgetsData.budgets;
        
        // Note: ViewChild references (paginator, sort) are not available
        // in constructor/effect, so we handle them in ngAfterViewInit()
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

  /**
   * REFACTORED: ViewChild setup moved here because ViewChild references
   * are not available in constructor/effect()
   * 
   * This ensures paginator and sort are set up after the view is initialized.
   * We also update dataSource.data here in case the budgets signal was set
   * before the view was initialized.
   */
  ngAfterViewInit(): void {
    // Set up Material table pagination and sorting
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    
    // Update dataSource in case budgets signal was set before view init
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

  /**
   * REFACTORED: Access signal input value using function call
   * 
   * Before: if (this.canPromote)
   * After: if (this.canPromote())
   * 
   * Signal inputs must be called as functions to access their values.
   */
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
