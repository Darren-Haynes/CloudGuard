using System.Threading.Tasks;
using CloudGuard.Api.Services;
using Microsoft.AspNetCore.Mvc.Filters;

namespace CloudGuard.Api.Filters;

public class AuditLoggingFilter(IAuditLogService auditLogService) : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        // 1. Execute the inner controller endpoint action core logic loop
        var executedContext = await next();

        // 2. Build the ledger entry (identity headers, route, and true success/failure outcome)
        var entry = AuditLogEntryFactory.Create(
            context.HttpContext.Request,
            context.ActionArguments.Keys,
            executedContext.Result,
            executedContext.Exception);

        // 3. Commit the entry securely to our non-blocking singleton memory ledger trail
        auditLogService.LogSecurityAction(entry);
    }
}
