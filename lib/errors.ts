export class AppError extends Error {
  constructor(
    message: string,
    public readonly status = 500,
    public readonly code = "APP_ERROR",
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function getErrorMessage(error: unknown) {
  if (error instanceof AppError) {
    return {
      message: error.message,
      status: error.status,
      code: error.code,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      status: 500,
      code: "UNEXPECTED_ERROR",
    };
  }

  return {
    message: "Something went wrong.",
    status: 500,
    code: "UNEXPECTED_ERROR",
  };
}
