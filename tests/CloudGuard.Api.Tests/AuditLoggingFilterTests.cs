using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CloudGuard.Api.Filters;
using CloudGuard.Api.Models;
using CloudGuard.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using NSubstitute;
using Xunit;

namespace CloudGuard.Api.Tests;

public class AuditLoggingFilterTests
{
    [Fact]
    public async Task OnActionExecutionAsync_LogsSecurityAction_WithIdentityHeadersFromContext()
    {
        // Arrange
        var auditLogServiceMock = Substitute.For<IAuditLogService>();
        var filter = new AuditLoggingFilter(auditLogServiceMock);

        var httpContext = new DefaultHttpContext();
        httpContext.Request.Method = "POST";
        httpContext.Request.Path = "/api/asset/remediate";
        httpContext.Request.Headers["X-CloudGuard-User"] = "sre-lead-operator";
        httpContext.Request.Headers["X-CloudGuard-Role"] = "SRE-Admin-Clearance";

        var actionContext = new ActionContext(
            httpContext,
            new RouteData(),
            new ActionDescriptor()
        );

        var actionExecutingContext = new ActionExecutingContext(
            actionContext,
            new List<IFilterMetadata>(),
            new Dictionary<string, object?>(),
            Substitute.For<Controller>()
        );

        // Simulate a successful action execution that returns an OkObjectResult
        var actionExecutedContext = new ActionExecutedContext(actionContext, new List<IFilterMetadata>(), Substitute.For<Controller>())
        {
            Result = new OkObjectResult(new { message = "Success" })
        };

        ActionExecutionDelegate next = () => Task.FromResult(actionExecutedContext);

        // Act
        await filter.OnActionExecutionAsync(actionExecutingContext, next);

        // Assert
        auditLogServiceMock.Received(1).LogSecurityAction(Arg.Is<AuditLogEntry>(entry =>
            entry.Username == "sre-lead-operator" &&
            entry.UserRole == "SRE-Admin-Clearance" &&
            entry.Action == "POST" &&
            entry.EndpointPath == "/api/asset/remediate" &&
            entry.IsSuccess == true
        ));
    }

    [Fact]
    public async Task OnActionExecutionAsync_FallsBackToAnonymous_WhenIdentityHeadersAreAbsent()
    {
        // Arrange
        var auditLogServiceMock = Substitute.For<IAuditLogService>();
        var filter = new AuditLoggingFilter(auditLogServiceMock);

        var httpContext = new DefaultHttpContext();
        httpContext.Request.Method = "GET";
        httpContext.Request.Path = "/api/asset";
        // Leave request headers empty to verify default fallback gates!

        var actionContext = new ActionContext(
            httpContext,
            new RouteData(),
            new ActionDescriptor()
        );

        var actionExecutingContext = new ActionExecutingContext(
            actionContext,
            new List<IFilterMetadata>(),
            new Dictionary<string, object?>(),
            Substitute.For<Controller>()
        );

        var actionExecutedContext = new ActionExecutedContext(actionContext, new List<IFilterMetadata>(), Substitute.For<Controller>())
        {
            Result = new OkObjectResult(new { message = "Success" })
        };

        ActionExecutionDelegate next = () => Task.FromResult(actionExecutedContext);

        // Act
        await filter.OnActionExecutionAsync(actionExecutingContext, next);

        // Assert
        auditLogServiceMock.Received(1).LogSecurityAction(Arg.Is<AuditLogEntry>(entry =>
            entry.Username == "anonymous-operator" &&
            entry.UserRole == "Guest-Clearance" &&
            entry.Action == "GET" &&
            entry.EndpointPath == "/api/asset" &&
            entry.IsSuccess == true
        ));
    }

    // 👇 COVERS THE ISNULLORWHITESPACE TRUE PATHWAY FOR COLOURED CODECOV BLOCKS
    [Fact]
    public async Task OnActionExecutionAsync_FallsBackToAnonymous_WhenIdentityHeadersAreWhitespace()
    {
        // Arrange
        var auditLogServiceMock = Substitute.For<IAuditLogService>();
        var filter = new AuditLoggingFilter(auditLogServiceMock);

        var httpContext = new DefaultHttpContext();
        httpContext.Request.Method = "GET";
        httpContext.Request.Path = "/api/asset";
        httpContext.Request.Headers["X-CloudGuard-User"] = "   "; // 🔥 Explicit whitespace string!
        httpContext.Request.Headers["X-CloudGuard-Role"] = "   ";

        var actionContext = new ActionContext(httpContext, new RouteData(), new ActionDescriptor());
        var actionExecutingContext = new ActionExecutingContext(
            actionContext,
            new List<IFilterMetadata>(),
            new Dictionary<string, object?>(),
            Substitute.For<Controller>()
        );

        var actionExecutedContext = new ActionExecutedContext(actionContext, new List<IFilterMetadata>(), Substitute.For<Controller>())
        {
            Result = new OkObjectResult(new { message = "Success" })
        };

        ActionExecutionDelegate next = () => Task.FromResult(actionExecutedContext);

        // Act
        await filter.OnActionExecutionAsync(actionExecutingContext, next);

        // Assert
        auditLogServiceMock.Received(1).LogSecurityAction(Arg.Is<AuditLogEntry>(entry =>
            entry.Username == "anonymous-operator" &&
            entry.UserRole == "Guest-Clearance"
        ));
    }
}
