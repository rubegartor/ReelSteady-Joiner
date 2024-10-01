export class UnexpededCloseSpawn extends Error {
  private readonly code: number|null

  constructor (code: number|null, message: string) {
    super(message)

    this.name = this.constructor.name
    this.code = code

    Error.captureStackTrace(this, this.constructor);
  }

  toString(): string {
    return `(code: ${this.code}) - ${this.stack}`;
  }
}
