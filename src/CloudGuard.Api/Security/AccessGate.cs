using System;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CloudGuard.Api.Security;

// The decision behind the lock: may this request through?
//
// The Functions app calls it from its middleware for every function except login. It lives here,
// next to the token logic, so it is unit-tested; the middleware only wires it in.
public static class AccessGate
{
    // Returns null when the request may proceed, or the response to send instead.
    // With the lock not configured the answer is always "no": a missing setting must never
    // leave the API open.
    public static IActionResult? Check(HttpRequest request, AccessTokenService tokens)
    {
        if (!tokens.IsConfigured)
        {
            return NotConfigured();
        }

        var token = ExtractBearerToken(request.Headers.Authorization.ToString());
        if (token is not null && tokens.ValidateToken(token))
        {
            return null;
        }

        return new UnauthorizedObjectResult(new { message = "A valid access token is required. Log in first." });
    }

    public static IActionResult NotConfigured() =>
        new ObjectResult(new { message = "Access control is not configured on the server." })
        {
            StatusCode = StatusCodes.Status503ServiceUnavailable,
        };

    // Pulls the token out of an "Authorization: Bearer <token>" header value.
    public static string? ExtractBearerToken(string? authorizationHeader)
    {
        const string prefix = "Bearer ";

        if (authorizationHeader is null || !authorizationHeader.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var token = authorizationHeader[prefix.Length..].Trim();
        return token.Length == 0 ? null : token;
    }
}
