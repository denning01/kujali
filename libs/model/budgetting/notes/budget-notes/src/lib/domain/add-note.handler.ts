import { HandlerTools } from '@iote/cqrs';
import { FunctionHandler, FunctionContext } from '@ngfi/functions';

import { Notes } from '@app/model/finance/notes/base';

import { AddNoteToBudgetCommand } from './add-note.command';
import { AddNoteToBudgetResult } from './add-note-result.interface';

/**
 * Generic command handler interface.
 * 
 * @template TCommand The type of command to handle
 */
export interface ICommandHandler<TCommand>
{
  /**
   * Executes the command.
   * 
   * @param command The command to execute
   * @returns Promise that resolves when the command is executed
   */
  execute(command: TCommand): Promise<void>;
}

/**
 * Repository path for budget notes.
 * 
 * @param orgId The organisation ID
 * @param budgetId The budget ID
 * @returns The repository path
 */
const BUDGET_NOTES_REPO = (orgId: string, budgetId: string) => 
  `orgs/${orgId}/budgets/${budgetId}/notes`;

/**
 * Handler for adding a note to a budget.
 * 
 * Validates the command data and adds the note to the budget using the repository.
 */
export class AddNoteToBudgetHandler extends FunctionHandler<AddNoteToBudgetCommand, AddNoteToBudgetResult>
{
  public async execute(
    command: AddNoteToBudgetCommand, 
    context: FunctionContext, 
    tools: HandlerTools
  ): Promise<AddNoteToBudgetResult>
  {
    tools.Logger.log(() => `[AddNoteToBudgetHandler].execute: Adding note to budget ${command.budgetId} for org ${command.orgId}`);

    // Validate command data
    if (!command.content || command.content.trim().length === 0)
    {
      tools.Logger.log(() => `[AddNoteToBudgetHandler].execute: Validation failed - note content is empty`);
      throw new Error('Note content cannot be empty');
    }

    if (!command.budgetId || command.budgetId.trim().length === 0)
    {
      tools.Logger.log(() => `[AddNoteToBudgetHandler].execute: Validation failed - budget ID is empty`);
      throw new Error('Budget ID cannot be empty');
    }

    if (!command.orgId || command.orgId.trim().length === 0)
    {
      tools.Logger.log(() => `[AddNoteToBudgetHandler].execute: Validation failed - organisation ID is empty`);
      throw new Error('Organisation ID cannot be empty');
    }

    // Get repository for budget notes
    const notesRepo = tools.getRepository<Notes>(BUDGET_NOTES_REPO(command.orgId, command.budgetId));

    // Create note object
    const note: Notes = {
      note: command.content.trim()
    };

    // Add note using repository
    tools.Logger.log(() => `[AddNoteToBudgetHandler].execute: Creating note in repository`);
    const createdNote = await notesRepo.create(note);

    tools.Logger.log(() => `[AddNoteToBudgetHandler].execute: Note created with ID ${createdNote.id}`);

    // Return result
    const result: AddNoteToBudgetResult = {
      id: createdNote.id,
      noteId: createdNote.id!,
      budgetId: command.budgetId,
      content: command.content.trim()
    };

    return result;
  }
}

