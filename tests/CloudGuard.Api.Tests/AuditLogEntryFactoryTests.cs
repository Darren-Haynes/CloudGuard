using System;
using System.Collections.Generic;
using CloudGuard.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace CloudGuard.Api.Tests;

public class AuditLogEntryFactoryTests
{
    private static HttpRequest NewRequest(
        string method = "GET",
        string path = "/api/asset",
        string? user = null,
        string? role = null)
    {
        var request = new DefaultHttpContext().Request;
        request.Method = method;
        request.Path = path;
        if (user != null) request.Headers["X-CloudGuard-User"] = user;
        if (role != null) request.Headers["X-CloudGuard-Role"] = role;
        return request;
    }

    [Fact]
    public void Create_RecordsIdentityMethodPathAndArgumentNames_FromTheRequest()
    {
        // Arrange
        var request = NewRequest("POST", "/api/asset/abc/remediate", "sre-lead-operator", "SRE-Admin-Clearance");

        // Act
        var entry = AuditLogEntryFactory.Create(request, new[] { "id" }, new OkObjectResult("done"), null);

        // Assert
        Assert.Equal("sre-lead-operator", entry.Username);
        Assert.Equal("SRE-Admin-Clearance", entry.UserRole);
        Assert.Equal("POST", entry.Action);
        Assert.Equal("/api/asset/abc/remediate", entry.EndpointPath);
        Assert.Equal("id", entry.PayloadData);
        Assert.True(entry.IsSuccess);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_FallsBackToTheGuestIdentity_WhenIdentityHeadersAreMissingOrBlank(string? headerValue)
    {
        // Arrange
        var request = NewRequest(user: headerValue, role: headerValue);

        // Act
        var entry = AuditLogEntryFactory.Create(request, Array.Empty<string>(), new OkResult(), null);

        // Assert
        Assert.Equal("anonymous-operator", entry.Username);
        Assert.Equal("Guest-Clearance", entry.UserRole);
    }

    [Fact]
    public void Create_FallsBackPerHeader_WhenOnlyOneIdentityHeaderIsBlank()
    {
        // Arrange
        var request = NewRequest(user: "   ", role: "SRE-Admin-Clearance");

        // Act
        var entry = AuditLogEntryFactory.Create(request, Array.Empty<string>(), new OkResult(), null);

        // Assert
        Assert.Equal("anonymous-operator", entry.Username);
        Assert.Equal("SRE-Admin-Clearance", entry.UserRole);
    }

    public static TheoryData<IActionResult?, bool> ResultOutcomes => new()
    {
        { new OkObjectResult("ok"), true },
        { new OkResult(), true },
        { new FileContentResult(new byte[] { 1, 2, 3 }, "text/csv"), true },
        { new NotFoundObjectResult("missing"), false },
        { new BadRequestObjectResult("bad"), false },
        { null, false },
    };

    [Theory]
    [MemberData(nameof(ResultOutcomes))]
    public void Create_JudgesSuccessByTheKindOfResultReturned(IActionResult? result, bool expectedSuccess)
    {
        // Act
        var entry = AuditLogEntryFactory.Create(NewRequest(), Array.Empty<string>(), result, null);

        // Assert
        Assert.Equal(expectedSuccess, entry.IsSuccess);
    }

    [Fact]
    public void Create_RecordsAFailure_WhenTheEndpointThrew_EvenIfAResultIsPresent()
    {
        // Act
        var entry = AuditLogEntryFactory.Create(
            NewRequest(),
            Array.Empty<string>(),
            new OkObjectResult("ok"),
            new InvalidOperationException("Simulated perimeter node execution failure."));

        // Assert
        Assert.False(entry.IsSuccess);
    }

    [Fact]
    public void Create_JoinsArgumentNamesIntoPayloadData_AndLeavesItEmptyWhenThereAreNone()
    {
        // Act
        var withArguments = AuditLogEntryFactory.Create(NewRequest(), new List<string> { "building", "room" }, new OkResult(), null);
        var withoutArguments = AuditLogEntryFactory.Create(NewRequest(), Array.Empty<string>(), new OkResult(), null);

        // Assert
        Assert.Equal("building, room", withArguments.PayloadData);
        Assert.Equal(string.Empty, withoutArguments.PayloadData);
    }

    [Fact]
    public void Create_StampsAFreshIdAndAUtcTimestamp()
    {
        // Arrange
        var before = DateTime.UtcNow;

        // Act
        var first = AuditLogEntryFactory.Create(NewRequest(), Array.Empty<string>(), new OkResult(), null);
        var second = AuditLogEntryFactory.Create(NewRequest(), Array.Empty<string>(), new OkResult(), null);

        // Assert
        var after = DateTime.UtcNow;
        Assert.Equal(DateTimeKind.Utc, first.Timestamp.Kind);
        Assert.InRange(first.Timestamp, before, after);
        Assert.NotEqual(Guid.Empty, first.Id);
        Assert.NotEqual(first.Id, second.Id);
    }
}
