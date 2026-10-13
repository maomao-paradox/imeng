function dispatchAndWait(
  eventName: string,
  detail: Record<string, unknown> = {},
  successMessage: string = "Action completed successfully",
  timeoutMs: number = 5000,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const requestId = Math.random().toString(36).substring(2, 15);
    const completionEventName = `tool-completion-${requestId}`;

    const timeoutId = setTimeout(() => {
      window.removeEventListener(completionEventName, handleCompletion);
      reject(
        new Error(
          `Timed out waiting for UI to update (requestId: ${requestId})`,
        ),
      );
    }, timeoutMs);

    const handleCompletion = () => {
      clearTimeout(timeoutId);
      window.removeEventListener(completionEventName, handleCompletion);
      resolve(successMessage);
    };

    window.addEventListener(completionEventName, handleCompletion);

    // Dispatch original event with requestId
    const event = new CustomEvent(eventName, {
      detail: { ...detail, requestId },
    });
    window.dispatchEvent(event);
  });
}

export type Login = {
  email: string;
  password: string;
};

export async function mcpLogin(p: unknown): Promise<string> {
  const params = p as Login;
  if (!params.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    return "ERROR: `email` must be a valid email address.";
  }

  // if (
  //   !params.password.match(
  //     /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{10,}$/,
  //   )
  // ) {
  //   return "ERROR: `password` must be at least 10 characters long and contain at least one uppercase letter, one lowercase letter, and one number.";
  // }

  return dispatchAndWait("mcp-login", params, "Login successful.");
}

export const mcpLoginTool = {
  execute: mcpLogin,
  name: "mcp-login",
  description: "Logs in a user with the given email and password.",
  inputSchema: {
    type: "object",
    properties: {
      email: {
        type: "string",
        description: "The user's email address.",
        format: "email",
      },
      password: {
        type: "string",
        description: "The user's password.",
      },
    },
    required: ["email", "password"],
  },
  outputSchema: {
    type: "string",
    description: "A message describing the result of the login request.",
  },
  annotations: {
    readOnlyHint: false,
  },
};
