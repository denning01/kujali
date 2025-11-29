import { IObject } from '@iote/bricks';

/**
 * Result of adding a note to a budget.
 */
export interface AddNoteToBudgetResult extends IObject
{
  /** The ID of the created note */
  noteId: string;

  /** The budget ID the note was added to */
  budgetId: string;

  /** The content of the note */
  content: string;
}

