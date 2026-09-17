using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CloudGuard.Api.Models;
using CloudGuard.Api.Services;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Logging;
using NSubstitute;
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
        var transientException = new SqliteException("Database is locked", 5);

        innerServiceMock.UpdateAssetAsync(sampleAsset)
            .Returns(
                _ => throw transientException,
                _ => throw transientException,
                _ => Task.CompletedTask
            );

        var decorator = new ResilientAssetServiceDecorator(innerServiceMock, loggerMock);

        // Act
        await decorator.UpdateAssetAsync(sampleAsset);

        // Assert
        await innerServiceMock.Received(3).UpdateAssetAsync(sampleAsset);
        loggerMock.ReceivedWithAnyArgs(2).Log(
            LogLevel.Warning,
            Arg.Any<EventId>(),
            Arg.Any<object>(),
            Arg.Any<Exception>(),
            Arg.Any<Func<object, Exception?, string>>());
    }

    // 👇 ADDED TO EXECUTE GETALLASSETSASYNC OVER POLLY WRAPPERS
    [Fact]
    public async Task GetAllAssetsAsync_ExecutesInnerServiceCleanly()
    {
        // Arrange
        var innerServiceMock = Substitute.For<IAssetService>();
        var loggerMock = Substitute.For<ILogger<ResilientAssetServiceDecorator>>();
        var expectedAssets = new List<ServerAsset> { new() { ServerName = "s1" } };

        innerServiceMock.GetAllAssetsAsync().Returns(Task.FromResult<IEnumerable<ServerAsset>>(expectedAssets));
        var decorator = new ResilientAssetServiceDecorator(innerServiceMock, loggerMock);

        // Act
        var result = await decorator.GetAllAssetsAsync();

        // Assert
        Assert.Equal(expectedAssets, result);
        await innerServiceMock.Received(1).GetAllAssetsAsync();
    }

    // 👇 ADDED TO EXECUTE GETSCOPEDASSETSASYNC OVER POLLY WRAPPERS
    [Fact]
    public async Task GetScopedAssetsAsync_ExecutesInnerServiceCleanly()
    {
        // Arrange
        var innerServiceMock = Substitute.For<IAssetService>();
        var loggerMock = Substitute.For<ILogger<ResilientAssetServiceDecorator>>();
        var expectedAssets = new List<ServerAsset> { new() { ServerName = "s2" } };

        innerServiceMock.GetScopedAssetsAsync("Building 1", "Room 01")
            .Returns(Task.FromResult<IEnumerable<ServerAsset>>(expectedAssets));
        var decorator = new ResilientAssetServiceDecorator(innerServiceMock, loggerMock);

        // Act
        var result = await decorator.GetScopedAssetsAsync("Building 1", "Room 01");

        // Assert
        Assert.Equal(expectedAssets, result);
        await innerServiceMock.Received(1).GetScopedAssetsAsync("Building 1", "Room 01");
    }
}
