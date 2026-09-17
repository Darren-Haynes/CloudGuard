using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CloudGuard.Api.Models;
using CloudGuard.Api.Services;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Logging;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using Xunit;

namespace CloudGuard.Api.Tests;

public class ResilientAssetServiceDecoratorTests
{
    [Fact]
    public async Task UpdateAssetAsync_RetriesOnTransientSqliteException_AndEventuallySucceeds()
    {
        // Arrange
        var innerServiceMock = Substitute.For<IAssetService>();
        var loggerMock = Substitute.For<ILogger<ResilientAssetServiceDecorator>>();

        var sampleAsset = new ServerAsset { Id = Guid.NewGuid(), ServerName = "test-resilient-01" };

        // Construct a realistic internal SQLite transient lock error (ErrorCode 5 = Busy)
        var transientException = new SqliteException("Database is locked", 5);

        // Configure a 3-strike simulation sequence: throw the lock exception twice, then pass cleanly on the 3rd turn
        innerServiceMock.UpdateAssetAsync(sampleAsset)
            .Returns(
                _ => throw transientException,
                _ => throw transientException,
                _ => Task.CompletedTask
            );

        var decorator = new ResilientAssetServiceDecorator(innerServiceMock, loggerMock);

        // Act
        await decorator.UpdateAssetAsync(sampleAsset);

        // Assert: Verify the decorator retried the operation exactly 3 times total
        await innerServiceMock.Received(3).UpdateAssetAsync(sampleAsset);

        // Verify that our fallback warning logger recorded the connection blips
        loggerMock.ReceivedWithAnyArgs(2).Log(
            LogLevel.Warning,
            Arg.Any<EventId>(),
            Arg.Any<object>(),
            Arg.Any<Exception>(),
            Arg.Any<Func<object, Exception?, string>>());
    }
}
