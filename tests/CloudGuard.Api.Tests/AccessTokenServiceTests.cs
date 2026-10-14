using System;
using System.Buffers.Text;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using CloudGuard.Api.Security;
using Xunit;

namespace CloudGuard.Api.Tests;

public class AccessTokenServiceTests
{
    private const string Password = "correct horse battery staple";
    private const string StandardHeader = """{"alg":"HS256","typ":"JWT"}""";
    private static readonly string SigningKey = new('k', 40);

    private sealed class FakeClock : TimeProvider
    {
        public DateTimeOffset Now { get; set; } = new(2026, 10, 14, 12, 0, 0, TimeSpan.Zero);

        public override DateTimeOffset GetUtcNow() => Now;
    }

    private static AccessTokenService Create(
        FakeClock? clock = null,
        string? password = Password,
        string? signingKey = null,
        TimeSpan? lifetime = null)
    {
        var options = new AccessControlOptions
        {
            Password = password,
            SigningKey = signingKey ?? SigningKey,
            TokenLifetime = lifetime ?? TimeSpan.FromHours(12),
        };
        return new AccessTokenService(options, clock);
    }

    private static string Segment(string text) => Base64Url.EncodeToString(Encoding.UTF8.GetBytes(text));

    // Builds a token the way the service does, but from arbitrary pieces, so a test can forge one.
    private static string Forge(string key, string headerJson, string payloadSegment)
    {
        var signingInput = $"{Segment(headerJson)}.{payloadSegment}";
        var signature = HMACSHA256.HashData(Encoding.UTF8.GetBytes(key), Encoding.UTF8.GetBytes(signingInput));
        return $"{signingInput}.{Base64Url.EncodeToString(signature)}";
    }

    private static string PayloadExpiringInTheYear2100 => Segment("""{"sub":"visitor","exp":4102444800}""");

    // ---- password ----

    [Fact]
    public void PasswordMatches_ReturnsTrue_ForTheConfiguredPassword()
    {
        Assert.True(Create().PasswordMatches(Password));
    }

    [Theory]
    [InlineData("wrong")]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData("Correct horse battery staple")]
    [InlineData("correct horse battery staple ")]
    [InlineData("correct horse battery")]
    [InlineData(null)]
    public void PasswordMatches_ReturnsFalse_ForAnythingElse(string? candidate)
    {
        Assert.False(Create().PasswordMatches(candidate));
    }

    [Fact]
    public void PasswordMatches_ReturnsFalse_WhenTheLockIsNotConfigured()
    {
        // The signing key is too short, so the lock is unconfigured even though the password matches.
        var service = Create(signingKey: "too-short");

        Assert.False(service.IsConfigured);
        Assert.False(service.PasswordMatches(Password));
    }

    // ---- issuing ----

    [Fact]
    public void IssueToken_ThrowsInvalidOperation_WhenTheLockIsNotConfigured()
    {
        var service = Create(password: null);

        Assert.Throws<InvalidOperationException>(() => service.IssueToken());
    }

    [Fact]
    public void IssueToken_ReturnsAThreePartJwtWithTheFixedHeader()
    {
        var token = Create().IssueToken().Value;

        var parts = token.Split('.');
        Assert.Equal(3, parts.Length);
        Assert.Equal(StandardHeader, Encoding.UTF8.GetString(Base64Url.DecodeFromChars(parts[0])));
    }

    [Fact]
    public void IssueToken_CarriesIssueAndExpiryTimes_AndReportsTheExpiry()
    {
        var clock = new FakeClock();
        var service = Create(clock);

        var token = service.IssueToken();

        var payload = JsonDocument.Parse(Base64Url.DecodeFromChars(token.Value.Split('.')[1])).RootElement;
        Assert.Equal(clock.Now.ToUnixTimeSeconds(), payload.GetProperty("iat").GetInt64());
        Assert.Equal(clock.Now.AddHours(12).ToUnixTimeSeconds(), payload.GetProperty("exp").GetInt64());
        Assert.Equal(clock.Now.AddHours(12), token.ExpiresAt);
    }

    [Fact]
    public void IssueToken_UsesTheConfiguredLifetime()
    {
        var clock = new FakeClock();
        var service = Create(clock, lifetime: TimeSpan.FromMinutes(5));

        var token = service.IssueToken();

        Assert.Equal(clock.Now.AddMinutes(5), token.ExpiresAt);
        clock.Now = clock.Now.AddMinutes(4);
        Assert.True(service.ValidateToken(token.Value));
        clock.Now = clock.Now.AddMinutes(1);
        Assert.False(service.ValidateToken(token.Value));
    }

    [Fact]
    public void Lifetime_DefaultsToTwelveHours()
    {
        Assert.Equal(TimeSpan.FromHours(12), new AccessControlOptions().TokenLifetime);
    }

    // ---- validating: the happy path and expiry ----

    [Fact]
    public void ValidateToken_ReturnsTrue_ForAFreshlyIssuedToken()
    {
        var service = Create();

        Assert.True(service.ValidateToken(service.IssueToken().Value));
    }

    [Fact]
    public void ValidateToken_AcceptsTheTokenUntilItExpires_ThenRejectsIt()
    {
        var clock = new FakeClock();
        var service = Create(clock);
        var token = service.IssueToken().Value;

        clock.Now = clock.Now.AddHours(12).AddSeconds(-1);
        Assert.True(service.ValidateToken(token));

        clock.Now = clock.Now.AddSeconds(1); // exactly the expiry moment
        Assert.False(service.ValidateToken(token));

        clock.Now = clock.Now.AddDays(1);
        Assert.False(service.ValidateToken(token));
    }

    [Fact]
    public void ValidateToken_AcceptsAHandBuiltToken_ProvingTheForgeHelperMatchesTheService()
    {
        // Control for the forgery tests below: a correctly built token passes, so when a
        // deliberately broken one fails it is the breakage that is being rejected.
        var forged = Forge(SigningKey, StandardHeader, PayloadExpiringInTheYear2100);

        Assert.True(Create().ValidateToken(forged));
    }

    // ---- validating: forgeries and garbage ----

    [Fact]
    public void ValidateToken_ReturnsFalse_ForATokenSignedWithAnotherKey()
    {
        var token = Create(signingKey: new string('x', 40)).IssueToken().Value;

        Assert.False(Create().ValidateToken(token));
    }

    [Fact]
    public void ValidateToken_ReturnsFalse_WhenTheSigningKeyIsRotated()
    {
        var before = Create();
        var token = before.IssueToken().Value;

        var after = Create(signingKey: new string('r', 40));

        Assert.True(before.ValidateToken(token));
        Assert.False(after.ValidateToken(token));
    }

    [Fact]
    public void ValidateToken_ReturnsFalse_WhenThePayloadIsChanged()
    {
        var clock = new FakeClock();
        var service = Create(clock);
        var parts = service.IssueToken().Value.Split('.');
        var longerLived = Segment("""{"sub":"visitor","exp":4102444800}""");

        var tampered = $"{parts[0]}.{longerLived}.{parts[2]}";

        Assert.False(service.ValidateToken(tampered));
    }

    [Fact]
    public void ValidateToken_ReturnsFalse_WhenTheSignatureIsChanged()
    {
        var service = Create();
        var parts = service.IssueToken().Value.Split('.');
        // Change the first character: the last one of a base64url signature carries spare bits.
        var first = parts[2][0] == 'A' ? 'B' : 'A';

        var tampered = $"{parts[0]}.{parts[1]}.{first}{parts[2][1..]}";

        Assert.False(service.ValidateToken(tampered));
    }

    [Fact]
    public void ValidateToken_ReturnsFalse_ForAnUnsignedAlgNoneToken()
    {
        var unsigned = $"{Segment("""{"alg":"none","typ":"JWT"}""")}.{PayloadExpiringInTheYear2100}.";

        Assert.False(Create().ValidateToken(unsigned));
    }

    [Fact]
    public void ValidateToken_ReturnsFalse_ForAnotherAlgorithmEvenWhenSignedWithTheRealKey()
    {
        var forged = Forge(SigningKey, """{"alg":"HS384","typ":"JWT"}""", PayloadExpiringInTheYear2100);

        Assert.False(Create().ValidateToken(forged));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData("not-a-token")]
    [InlineData("a.b")]
    [InlineData("a.b.c")]
    [InlineData("a.b.c.d")]
    [InlineData("...")]
    public void ValidateToken_ReturnsFalse_ForMalformedInput(string? token)
    {
        Assert.False(Create().ValidateToken(token));
    }

    [Fact]
    public void ValidateToken_ReturnsFalse_WhenTheSignatureIsNotBase64Url()
    {
        var header = Segment(StandardHeader);

        Assert.False(Create().ValidateToken($"{header}.{PayloadExpiringInTheYear2100}.!!!not base64!!!"));
    }

    [Fact]
    public void ValidateToken_ReturnsFalse_ForAnOverlongToken()
    {
        var padded = Forge(SigningKey, StandardHeader, Segment(new string('x', 3000)));

        Assert.False(Create().ValidateToken(padded));
    }

    [Theory]
    [InlineData("""{"sub":"visitor"}""")]               // no exp: reads as expired
    [InlineData("""{"sub":"visitor","exp":"later"}""")] // exp is not a number
    [InlineData("""{"sub":"visitor","exp":1}""")]       // long expired
    [InlineData("null")]
    [InlineData("not json")]
    [InlineData("[]")]
    public void ValidateToken_ReturnsFalse_ForCorrectlySignedButUnusablePayloads(string payloadJson)
    {
        var forged = Forge(SigningKey, StandardHeader, Segment(payloadJson));

        Assert.False(Create().ValidateToken(forged));
    }

    [Fact]
    public void ValidateToken_ReturnsFalse_ForCorrectlySignedPayloadThatIsNotBase64Url()
    {
        var forged = Forge(SigningKey, StandardHeader, "!!!not base64!!!");

        Assert.False(Create().ValidateToken(forged));
    }

    [Fact]
    public void ValidateToken_ReturnsFalse_WhenTheLockIsNotConfigured()
    {
        var token = Create().IssueToken().Value;

        Assert.False(Create(password: null).ValidateToken(token));
        Assert.False(Create(signingKey: "short").ValidateToken(token));
    }
}
