export class GhostApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly ghostType?: string,
  ) {
    super(message);
    this.name = 'GhostApiError';
  }
}
