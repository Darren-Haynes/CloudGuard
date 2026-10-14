using System;
using System.Linq;
using System.Threading.Tasks;
using CloudGuard.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Middleware;

namespace CloudGuard.Functions;

// Records one audit-ledger entry for every HTTP-triggered function.
//
// Functions HTTP triggers never go through the MVC pipeline, so the API's AuditLoggingFilter
// cannot run here. This middleware produces the same entries (via AuditLogEntryFactory).
//
// It relies on being registered after the ASP.NET Core integration's own middleware, which
// puts the HttpContext on the FunctionContext before this runs and only writes the function's
// IActionResult to the response once this has returned. The result has therefore not been
// executed yet, so success is judged by the result's type, exactly as the MVC filter does.
public class AuditLoggingMiddleware(IAuditLogService auditLogService) : IFunctionsWorkerMiddleware
{
    public async Task Invoke(FunctionContext context, FunctionExecutionDelegate next)
    {
        var httpContext = context.GetHttpContext();
        if (httpContext is null)
        {
            // Not an HTTP invocation, so there is no request to audit.
            await next(context);
            return;
        }

        try
        {
            await next(context);
        }
        catch (Exception exception)
        {
            Record(httpContext, null, exception);
            throw;
        }

        var result = context.GetInvocationResult().Value as IActionResult;

        // Anyone can call login without a token, so recording every failed attempt would let a
        // password-guessing script fill the ledger and push out the entries that matter.
        // Only successful logins are recorded.
        if (context.FunctionDefinition.Name == LoginFunction.FunctionName && result is not OkObjectResult)
        {
            return;
        }

        Record(httpContext, result, null);
    }

    private void Record(HttpContext httpContext, IActionResult? result, Exception? exception)
    {
        var request = httpContext.Request;

        // The MVC filter logs the names of the action arguments; the closest equivalent here
        // is the names of the route values and query-string keys the request carried.
        var argumentNames = request.RouteValues.Keys.Concat(request.Query.Keys).Distinct();

        auditLogService.LogSecurityAction(AuditLogEntryFactory.Create(request, argumentNames, result, exception));
    }
}
