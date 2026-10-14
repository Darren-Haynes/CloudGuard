using System;
using CloudGuard.Api.Security;
using Xunit;

namespace CloudGuard.Api.Tests;

public class AccessControlOptionsTests
{
    private static readonly string LongEnoughKey = new('k', AccessControlOptions.MinimumSigningKeyLength);

    [Fact]
    public void IsConfigured_IsTrue_WithAPasswordAndASigningKeyOfTheMinimumLength()
    {
        var options = new AccessControlOptions { Password = "p", SigningKey = LongEnoughKey };

        Assert.True(options.IsConfigured);
    }

    [Theory]
    [InlineData(null, true)]
    [InlineData("", true)]
    [InlineData("p", false)]
    public void IsConfigured_IsFalse_WithoutAUsablePassword_OrWithoutAKey(string? password, bool keyPresent)
    {
        var options = new AccessControlOptions
        {
            Password = password,
            SigningKey = keyPresent ? LongEnoughKey : null,
        };

        Assert.False(options.IsConfigured);
    }

    [Fact]
    public void IsConfigured_IsFalse_WhenTheSigningKeyIsOneCharacterTooShort()
    {
        var options = new AccessControlOptions
        {
            Password = "p",
            SigningKey = new string('k', AccessControlOptions.MinimumSigningKeyLength - 1),
        };

        Assert.False(options.IsConfigured);
    }

    [Fact]
    public void FromEnvironment_ReadsBothSettings_AndLeavesTheLockClosedWhenTheyAreAbsent()
    {
        var originalPassword = Environment.GetEnvironmentVariable(AccessControlOptions.PasswordSettingName);
        var originalKey = Environment.GetEnvironmentVariable(AccessControlOptions.SigningKeySettingName);
        try
        {
            Environment.SetEnvironmentVariable(AccessControlOptions.PasswordSettingName, null);
            Environment.SetEnvironmentVariable(AccessControlOptions.SigningKeySettingName, null);
            Assert.False(AccessControlOptions.FromEnvironment().IsConfigured);

            Environment.SetEnvironmentVariable(AccessControlOptions.PasswordSettingName, "from-the-environment");
            Environment.SetEnvironmentVariable(AccessControlOptions.SigningKeySettingName, LongEnoughKey);
            var options = AccessControlOptions.FromEnvironment();

            Assert.Equal("from-the-environment", options.Password);
            Assert.Equal(LongEnoughKey, options.SigningKey);
            Assert.True(options.IsConfigured);
        }
        finally
        {
            Environment.SetEnvironmentVariable(AccessControlOptions.PasswordSettingName, originalPassword);
            Environment.SetEnvironmentVariable(AccessControlOptions.SigningKeySettingName, originalKey);
        }
    }
}
