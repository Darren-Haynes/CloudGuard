using System;
using System.Linq;
using System.Threading.Tasks;
using CloudGuard.Api.Data;
using CloudGuard.Api.Models;
using CloudGuard.Api.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace CloudGuard.Api.Tests;

public class AssetServiceTests
{
    [Fact]
    public async Task GetAllAssetsAsync_ReturnsAllStoredAssets()
    {
        // Arrange
        using var connection = new SqliteConnection("DataSource=:memory:");
        await connection.OpenAsync();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(connection)
            .Options;

        using var context = new AppDbContext(options);
        await context.Database.EnsureCreatedAsync();

        var firstAsset = new ServerAsset
        {
            Id = Guid.NewGuid(),
            ServerName = "test-server-01",
            OperatingSystem = "Ubuntu",
            MissingPatches = 1,
            SecurityStatus = "Vulnerable",
            LastAuditedAt = DateTime.UtcNow
        };

        var secondAsset = new ServerAsset
        {
            Id = Guid.NewGuid(),
            ServerName = "test-server-02",
            OperatingSystem = "Windows",
            MissingPatches = 0,
            SecurityStatus = "Compliant",
            LastAuditedAt = DateTime.UtcNow
        };

        context.ServerAssets.AddRange(firstAsset, secondAsset);
        await context.SaveChangesAsync();

        var service = new AssetService(context);

        // Act
        var assets = await service.GetAllAssetsAsync();

        // Assert
        var assetList = assets.ToList();
        Assert.Equal(2, assetList.Count);
        Assert.Contains(assetList, asset => asset.Id == firstAsset.Id);
        Assert.Contains(assetList, asset => asset.Id == secondAsset.Id);
    }
}
