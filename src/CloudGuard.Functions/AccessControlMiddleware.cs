using System.Threading.Tasks;
using CloudGuard.Api.Security;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Middleware;

namespace CloudGuard.Functions;

// The lock: every HTTP function except login needs a valid access token.
//
// It is secure by default. A function is protected unless it is named here, so a function added
// later cannot be left open by forgetting a check. The decision itself is AccessGate.Check
// (CloudGuard.Api), which is unit-tested.
//
// It has to be registered after the ASP.NET Core integration's middleware (which puts the
// HttpContext on the FunctionContext) and before AuditLoggingMiddleware. Setting the invocation
// result and not calling next means the function never runs, and the integration still writes
// that result to the response. Because the audit middleware sits behind this one, rejected
// requests never reach the ledger: anyone hammering the API without a token cannot push real
// entries out of its 500-entry limit.
public class AccessControlMiddleware(AccessTokenService tokens) : IFunctionsWorkerMiddleware
{
    public async Task Invoke(FunctionContext context, FunctionExecutionDelegate next)
    {
        var httpContext = context.GetHttpContext();

        // Not an HTTP invocation (so there is no caller to check), or the login function itself.
        if (httpContext is null || context.FunctionDefinition.Name == LoginFunction.FunctionName)
        {
            await next(context);
            return;
        }

        var denied = AccessGate.Check(httpContext.Request, tokens);
        if (denied is null)
        {
            await next(context);
            return;
        }

        context.GetInvocationResult().Value = denied;
    }
}
