using System;
using System.IO;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using CloudGuard.Api.Security;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace CloudGuard.Api.Tests;

public class LoginEndpointTests
{
    private const string Password = "correct horse battery staple";
    private static readonly string SigningKey = new('k', 40);

    // Hands out its bytes one at a time, as a slow network connection might.
    private sealed class TrickleStream(byte[] data) : MemoryStream(data)
    {
        public override ValueTask<int> ReadAsync(Memory<byte> buffer, System.Threading.CancellationToken cancellationToken = default) =>
            base.ReadAsync(buffer[..Math.Min(1, buffer.Length)], cancellationToken);
    }

    private static AccessTokenService Tokens(bool configured = true) =>
        new(new AccessControlOptions { Password = configured ? Password : null, SigningKey = SigningKey });

    private static HttpRequest Post(string body) => Post(Encoding.UTF8.GetBytes(body));

    private static HttpRequest Post(byte[] body, bool trickle = false)
    {
        var request = new DefaultHttpContext().Request;
        request.Method = "POST";
        request.Body = trickle ? new TrickleStream(body) : new MemoryStream(body);
        return request;
    }

    private static string Login(string password) => JsonSerializer.Serialize(new { password });

    [Fact]
    public async Task HandleAsync_ReturnsATokenThatValidates_ForTheCorrectPassword()
    {
        var tokens = Tokens();

        var result = await LoginEndpoint.HandleAsync(Post(Login(Password)), tokens);

        var ok = Assert.IsType<OkObjectResult>(result);
        var body = JsonSerializer.SerializeToElement(ok.Value);
        Assert.True(tokens.ValidateToken(body.GetProperty("token").GetString()));
        Assert.True(body.GetProperty("expiresAt").GetDateTimeOffset() > DateTimeOffset.UtcNow.AddHours(11));
    }

    [Fact]
    public async Task HandleAsync_AcceptsThePasswordPropertyInAnyCase()
    {
        var result = await LoginEndpoint.HandleAsync(Post($$"""{"PASSWORD":"{{Password}}"}"""), Tokens());

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task HandleAsync_ReturnsUnauthorizedWithoutAToken_ForAWrongPassword()
    {
        var result = await LoginEndpoint.HandleAsync(Post(Login("not the password")), Tokens());

        var unauthorized = Assert.IsType<UnauthorizedObjectResult>(result);
        var body = JsonSerializer.SerializeToElement(unauthorized.Value);
        Assert.False(body.TryGetProperty("token", out _));
        Assert.Equal("Incorrect password.", body.GetProperty("message").GetString());
    }

    [Theory]
    [InlineData("")]
    [InlineData("not json")]
    [InlineData("{}")]
    [InlineData("""{"password":null}""")]
    [InlineData("""{"password":123}""")]
    [InlineData("[]")]
    [InlineData("null")]
    [InlineData("\"just a string\"")]
    public async Task HandleAsync_ReturnsBadRequest_WhenThereIsNoUsablePasswordInTheBody(string body)
    {
        var result = await LoginEndpoint.HandleAsync(Post(body), Tokens());

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task HandleAsync_FailsClosedWithA503_WhenTheLockIsNotConfigured()
    {
        // Even the right password cannot log in while the settings are missing.
        var result = await LoginEndpoint.HandleAsync(Post(Login(Password)), Tokens(configured: false));

        var response = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, response.StatusCode);
    }

    [Fact]
    public async Task HandleAsync_ReturnsPayloadTooLarge_WhenTheBodyExceedsTheLimit()
    {
        var oversized = new byte[LoginEndpoint.MaxBodyBytes + 1];
        Array.Fill(oversized, (byte)' ');

        var result = await LoginEndpoint.HandleAsync(Post(oversized), Tokens());

        var response = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status413PayloadTooLarge, response.StatusCode);
    }

    [Fact]
    public async Task HandleAsync_ReadsABodyOfExactlyTheLimit()
    {
        // 4096 bytes of valid JSON: read in full, then rejected for the wrong password, not for its size.
        var overhead = Encoding.UTF8.GetByteCount(Login(string.Empty));
        var body = Login(new string('x', LoginEndpoint.MaxBodyBytes - overhead));
        Assert.Equal(LoginEndpoint.MaxBodyBytes, Encoding.UTF8.GetByteCount(body));

        var result = await LoginEndpoint.HandleAsync(Post(body), Tokens());

        Assert.IsType<UnauthorizedObjectResult>(result);
    }

    [Fact]
    public async Task HandleAsync_ReadsTheWholeBody_WhenItArrivesInTinyPieces()
    {
        var result = await LoginEndpoint.HandleAsync(Post(Encoding.UTF8.GetBytes(Login(Password)), trickle: true), Tokens());

        Assert.IsType<OkObjectResult>(result);
    }
}
