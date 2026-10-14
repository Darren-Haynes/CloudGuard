using System;
using System.Buffers.Text;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace CloudGuard.Api.Security;

// A login token and the moment it stops working.
public sealed record AccessToken(string Value, DateTimeOffset ExpiresAt);

// Checks the shared password and issues and validates the tokens that prove a visitor knows it.
//
// Tokens are standard HS256 JWTs (header.payload.signature, base64url), built from the framework's
// own HMAC so no package is needed. Validation is strict: the header has to be exactly the one
// issued here (so "alg": "none" and other algorithms are rejected outright), the signature is
// compared in constant time, and the token has to be unexpired.
public sealed class AccessTokenService(AccessControlOptions options, TimeProvider? timeProvider = null)
{
    // Tokens are a few hundred bytes; anything much longer is not one of ours.
    private const int MaxTokenLength = 2048;

    // The fixed header every token carries.
    private static readonly string HeaderSegment =
        Base64Url.EncodeToString("""{"alg":"HS256","typ":"JWT"}"""u8);

    private readonly TimeProvider _time = timeProvider ?? TimeProvider.System;

    public bool IsConfigured => options.IsConfigured;

    // Compares the typed password with the configured one. Both sides are hashed first so the
    // comparison takes the same time whatever the lengths, and is constant-time on the hashes.
    public bool PasswordMatches(string? candidate)
    {
        if (!options.IsConfigured || candidate is null)
        {
            return false;
        }

        var expected = SHA256.HashData(Encoding.UTF8.GetBytes(options.Password!));
        var actual = SHA256.HashData(Encoding.UTF8.GetBytes(candidate));
        return CryptographicOperations.FixedTimeEquals(expected, actual);
    }

    public AccessToken IssueToken()
    {
        if (!options.IsConfigured)
        {
            throw new InvalidOperationException("Access control is not configured, so no token can be issued.");
        }

        var issuedAt = _time.GetUtcNow().ToUnixTimeSeconds();
        var expiresAt = issuedAt + (long)options.TokenLifetime.TotalSeconds;

        var claims = new Claims { Subject = "visitor", IssuedAt = issuedAt, ExpiresAt = expiresAt };
        var signingInput = $"{HeaderSegment}.{Base64Url.EncodeToString(JsonSerializer.SerializeToUtf8Bytes(claims))}";
        var token = $"{signingInput}.{Base64Url.EncodeToString(Sign(signingInput))}";

        return new AccessToken(token, DateTimeOffset.FromUnixTimeSeconds(expiresAt));
    }

    public bool ValidateToken(string? token)
    {
        if (!options.IsConfigured || string.IsNullOrEmpty(token) || token.Length > MaxTokenLength)
        {
            return false;
        }

        var parts = token.Split('.');
        if (parts.Length != 3 || parts[0] != HeaderSegment)
        {
            return false;
        }

        byte[] signature;
        try
        {
            signature = Base64Url.DecodeFromChars(parts[2]);
        }
        catch (FormatException)
        {
            return false;
        }

        if (!CryptographicOperations.FixedTimeEquals(signature, Sign($"{parts[0]}.{parts[1]}")))
        {
            return false;
        }

        // Only a token signed with the real key gets this far, so the payload is ours; it is
        // still parsed defensively. A missing or malformed "exp" reads as 0, which is expired.
        try
        {
            var claims = JsonSerializer.Deserialize<Claims>(Base64Url.DecodeFromChars(parts[1]));
            return claims is not null && claims.ExpiresAt > _time.GetUtcNow().ToUnixTimeSeconds();
        }
        catch (Exception exception) when (exception is FormatException or JsonException)
        {
            return false;
        }
    }

    private byte[] Sign(string signingInput) =>
        HMACSHA256.HashData(Encoding.UTF8.GetBytes(options.SigningKey!), Encoding.UTF8.GetBytes(signingInput));

    private sealed class Claims
    {
        [JsonPropertyName("sub")]
        public string? Subject { get; init; }

        [JsonPropertyName("iat")]
        public long IssuedAt { get; init; }

        [JsonPropertyName("exp")]
        public long ExpiresAt { get; init; }
    }
}
