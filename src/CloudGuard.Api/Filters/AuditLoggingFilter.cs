using System;
using System.Threading.Tasks;
using CloudGuard.Api.Models;
using CloudGuard.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace CloudGuard.Api.Filters;

public class AuditLoggingFilter(IAuditLogService auditLogService) : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        // 1. Extract cryptographic identity headers to track simulated administrative profiles
        var username = context.HttpContext.Request.Headers["X-CloudGuard-User"].ToString();
        var userRole = context.HttpContext.Request.Headers["X-CloudGuard-Role"].ToString();

        if (string.IsNullOrWhiteSpace(username)) username = "anonymous-operator";
        if (string.IsNullOrWhiteSpace(userRole)) userRole = "Guest-Clearance";

        // 2. Execute the inner controller endpoint action core logic loop
        var executedContext = await next();

        // 3. Evaluate the result pipeline state to log true success/failure outcomes
        bool isSuccess = executedContext.Exception == null &&
                         (executedContext.Result is OkObjectResult ||
                          executedContext.Result is OkResult ||
                          executedContext.Result is FileContentResult);

        // 4. Populate our thread-safe immutable security logging frame
        var entry = new AuditLogEntry
        {
            Username = username,
            UserRole = userRole,
            Action = context.HttpContext.Request.Method,
            EndpointPath = context.HttpContext.Request.Path,
            PayloadData = string.Join(", ", context.ActionArguments.Keys),
            IsSuccess = isSuccess,
            Timestamp = DateTime.UtcNow
        };

        // 5. Commit the entry securely to our non-blocking singleton memory ledger trail
        auditLogService.LogSecurityAction(entry);
    }
}
