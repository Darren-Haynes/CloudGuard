using System;

namespace CloudGuard.Api.Security;

// Settings for the shared-password lock on the deployed API.
//
// In the Function App both values are app settings (environment variables). The repository
// never holds a real value: set them with scripts/set-access-secrets.sh or in the Azure portal.
public sealed class AccessControlOptions
{
    public const string PasswordSettingName = "CLOUDGUARD_ACCESS_PASSWORD";
    public const string SigningKeySettingName = "CLOUDGUARD_TOKEN_SIGNING_KEY";

    // A shorter signing key is too easy to guess, so it counts as "not configured".
    public const int MinimumSigningKeyLength = 32;

    // The password visitors type on the lock screen.
    public string? Password { get; init; }

    // Signs the access tokens. It has to be the same on every instance of the app, which is why
    // it is a setting and not generated at start-up: serverless scale-out would otherwise give
    // each instance its own key and they would reject each other's tokens.
    public string? SigningKey { get; init; }

    // How long a login stays valid.
    public TimeSpan TokenLifetime { get; init; } = TimeSpan.FromHours(12);

    // Without both settings the lock cannot work. Callers treat that as "closed", never "open".
    public bool IsConfigured =>
        !string.IsNullOrEmpty(Password) && SigningKey is { Length: >= MinimumSigningKeyLength };

    public static AccessControlOptions FromEnvironment() => new()
    {
        Password = Environment.GetEnvironmentVariable(PasswordSettingName),
        SigningKey = Environment.GetEnvironmentVariable(SigningKeySettingName),
    };
}
