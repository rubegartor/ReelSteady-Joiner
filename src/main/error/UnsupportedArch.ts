export class UnsupportedArch extends Error {
  private readonly arch: string

  constructor (arch: string, message: string) {
    super(message)

    this.name = this.constructor.name
    this.arch = arch

    Error.captureStackTrace(this, this.constructor);
  }

  toString(): string {
    return `(arch: ${this.arch}) - ${this.stack}`;
  }
}
