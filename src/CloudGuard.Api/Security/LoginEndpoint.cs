using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CloudGuard.Api.Security;

// POST /api/login: trade the shared password for a short-lived access token.
//
// The Functions app's LoginFunction calls this; keeping the logic here makes it unit-testable.
public static class LoginEndpoint
{
    // A password is tiny, so a larger body is not a login attempt and is not read any further.
    public const int MaxBodyBytes = 4096;

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private sealed record LoginRequest(string? Password);

    public static async Task<IActionResult> HandleAsync(HttpRequest request, AccessTokenService tokens)
    {
        if (!tokens.IsConfigured)
        {
            return AccessGate.NotConfigured();
        }

        // Read one byte more than the limit so an oversized body is detected without buffering it all.
        var buffer = new byte[MaxBodyBytes + 1];
        var length = await ReadUpToAsync(request.Body, buffer);
        if (length > MaxBodyBytes)
        {
            return new ObjectResult(new { message = "The request body is too large." })
            {
                StatusCode = StatusCodes.Status413PayloadTooLarge,
            };
        }

        LoginRequest? login;
        try
        {
            login = JsonSerializer.Deserialize<LoginRequest>(buffer.AsSpan(0, length), JsonOptions);
        }
        catch (JsonException)
        {
            login = null;
        }

        if (login?.Password is null)
        {
            return new BadRequestObjectResult(new { message = "Send the password as JSON: {\"password\": \"...\"}." });
        }

        if (!tokens.PasswordMatches(login.Password))
        {
            return new UnauthorizedObjectResult(new { message = "Incorrect password." });
        }

        var token = tokens.IssueToken();
        return new OkObjectResult(new { token = token.Value, expiresAt = token.ExpiresAt });
    }

    private static async Task<int> ReadUpToAsync(Stream stream, byte[] buffer)
    {
        var total = 0;
        while (total < buffer.Length)
        {
            var read = await stream.ReadAsync(buffer.AsMemory(total));
            if (read == 0)
            {
                break;
            }

            total += read;
        }

        return total;
    }
}
