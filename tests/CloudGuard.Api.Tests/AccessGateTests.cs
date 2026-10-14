using System;
using CloudGuard.Api.Security;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace CloudGuard.Api.Tests;

public class AccessGateTests
{
    private static readonly string SigningKey = new('k', 40);

    private sealed class FakeClock : TimeProvider
    {
        public DateTimeOffset Now { get; set; } = new(2026, 10, 14, 12, 0, 0, TimeSpan.Zero);

        public override DateTimeOffset GetUtcNow() => Now;
    }

    private static AccessTokenService Tokens(FakeClock? clock = null, bool configured = true) =>
        new(new AccessControlOptions
        {
            Password = configured ? "a password" : null,
            SigningKey = SigningKey,
        }, clock);

    private static HttpRequest Request(string? authorization = null, string? query = null)
    {
        var request = new DefaultHttpContext().Request;
        if (authorization is not null) request.Headers.Authorization = authorization;
        if (query is not null) request.QueryString = new QueryString(query);
        return request;
    }

    [Fact]
    public void Check_AllowsTheRequest_WithAValidBearerToken()
    {
        var tokens = Tokens();

        var result = AccessGate.Check(Request($"Bearer {tokens.IssueToken().Value}"), tokens);

        Assert.Null(result);
    }

    [Fact]
    public void Check_TreatsTheBearerSchemeAsCaseInsensitive()
    {
        var tokens = Tokens();

        var result = AccessGate.Check(Request($"bearer {tokens.IssueToken().Value}"), tokens);

        Assert.Null(result);
    }

    [Fact]
    public void Check_ReturnsUnauthorized_WithNoAuthorizationHeader()
    {
        var result = AccessGate.Check(Request(), Tokens());

        Assert.IsType<UnauthorizedObjectResult>(result);
    }

    [Theory]
    [InlineData("Bearer not-a-real-token")]
    [InlineData("Bearer")]
    [InlineData("Bearer ")]
    [InlineData("Basic dXNlcjpwYXNz")]
    [InlineData("not even a scheme")]
    public void Check_ReturnsUnauthorized_WithABadAuthorizationHeader(string header)
    {
        var result = AccessGate.Check(Request(header), Tokens());

        Assert.IsType<UnauthorizedObjectResult>(result);
    }

    [Fact]
    public void Check_ReturnsUnauthorized_WithAnExpiredToken()
    {
        var clock = new FakeClock();
        var tokens = Tokens(clock);
        var token = tokens.IssueToken().Value;
        clock.Now = clock.Now.AddHours(13);

        var result = AccessGate.Check(Request($"Bearer {token}"), tokens);

        Assert.IsType<UnauthorizedObjectResult>(result);
    }

    [Fact]
    public void Check_IgnoresATokenSentInTheQueryString()
    {
        // A token in a URL would end up in logs and browser history, so only the header counts.
        var tokens = Tokens();

        var result = AccessGate.Check(Request(query: $"?access_token={tokens.IssueToken().Value}"), tokens);

        Assert.IsType<UnauthorizedObjectResult>(result);
    }

    [Fact]
    public void Check_FailsClosedWithA503_WhenTheLockIsNotConfigured()
    {
        // Even a token that would be valid elsewhere gets nowhere while the settings are missing.
        var validElsewhere = Tokens().IssueToken().Value;

        var result = AccessGate.Check(Request($"Bearer {validElsewhere}"), Tokens(configured: false));

        var response = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, response.StatusCode);
    }

    [Theory]
    [InlineData(null, null)]
    [InlineData("", null)]
    [InlineData("Bearer", null)]
    [InlineData("Bearer ", null)]
    [InlineData("Bearer    ", null)]
    [InlineData("Basic abc", null)]
    [InlineData("Bearerabc", null)]
    [InlineData("Bearer abc", "abc")]
    [InlineData("bearer abc", "abc")]
    [InlineData("BEARER   abc  ", "abc")]
    public void ExtractBearerToken_ReturnsTheTokenOnly_ForAWellFormedBearerHeader(string? header, string? expected)
    {
        Assert.Equal(expected, AccessGate.ExtractBearerToken(header));
    }
}
