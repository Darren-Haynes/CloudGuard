using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CloudGuard.Api.Filters;
using CloudGuard.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using NSubstitute;
using Xunit;

namespace CloudGuard.Api.Tests;

public class AuditLoggingIntegrationTests
{
    [Fact]
    public async Task FullAuditPipeline_ExecutesConcreteLoggingAndHandlesControllerFallbacks()
    {
        // Arrange: concrete ledger service wired straight into the real filter
        var service = new AuditLogService();
        var filter = new AuditLoggingFilter(service);

        var httpContext = new DefaultHttpContext();
        httpContext.Request.Method = "POST";
        httpContext.Request.Path = "/api/asset/remediate";
        httpContext.Request.Headers["X-CloudGuard-User"] = "integration-sre-operator";
        httpContext.Request.Headers["X-CloudGuard-Role"] = "SecOps-Admin-Tier3";

        var actionContext = new ActionContext(
            httpContext,
            new RouteData(),
            new ActionDescriptor()
        );

        var executingContext = new ActionExecutingContext(
            actionContext,
            new List<IFilterMetadata>(),
            new Dictionary<string, object?>(),
            Substitute.For<Controller>()
        );

        var executedContext = new ActionExecutedContext(actionContext, new List<IFilterMetadata>(), Substitute.For<Controller>())
        {
            Result = new OkObjectResult(new { message = "Success" })
        };

        ActionExecutionDelegate next = () => Task.FromResult(executedContext);

        // Act
        await filter.OnActionExecutionAsync(executingContext, next);

        // Assert: exactly one ledger entry carrying the request identity and route
        var trail = service.GetAuditLedgerTrail().ToList();
        var entry = Assert.Single(trail);
        Assert.Equal("integration-sre-operator", entry.Username);
        Assert.Equal("SecOps-Admin-Tier3", entry.UserRole);
        Assert.Equal("POST", entry.Action);
        Assert.Equal("/api/asset/remediate", entry.EndpointPath);
        Assert.True(entry.IsSuccess);
    }
}
