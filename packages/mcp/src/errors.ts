/**
 * Custom error classes for the MCP server.
 */

export class UserInputError extends Error {
  public readonly hints?: string[];

  constructor(message: string, hints?: string[]) {
    super(message);
    this.name = "UserInputError";
    this.hints = hints;
  }

  toFormattedMessage(): string {
    let msg = `**Input Error:** ${this.message}`;
    if (this.hints && this.hints.length > 0) {
      msg += "\n\n**Hints:**\n" + this.hints.map((h) => `- ${h}`).join("\n");
    }
    return msg;
  }
}

export function isUserInputError(error: unknown): error is UserInputError {
  return error instanceof UserInputError;
}
