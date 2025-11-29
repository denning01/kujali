/**
 * Command to add a note to a budget.
 * 
 * Encapsulates the data needed to add a note to a budget.
 */
export class AddNoteToBudgetCommand
{
  /** The ID of the organisation */
  orgId: string;

  /** The ID of the budget to add the note to */
  budgetId: string;

  /** The content of the note */
  content: string;

  constructor(orgId: string, budgetId: string, content: string)
  {
    this.orgId = orgId;
    this.budgetId = budgetId;
    this.content = content;
  }
}

