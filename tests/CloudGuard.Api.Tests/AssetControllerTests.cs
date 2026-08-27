using CloudGuard.Api.Controllers;
using CloudGuard.Api.Data;
using CloudGuard.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace CloudGuard.Api.Tests;

public class AssetControllerTests
{
    [Fact]
    public async Task GetAssets_ReturnsOkResult_WithListOfAssets()
    {
        // 1. Arrange: Create a pristine, isolated, in-memory SQLite connection
        using var connection = new SqliteConnection("DataSource=:memory:");
        await connection.OpenAsync();

        // 2. Build the DbContext using the active memory stream connection
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(connection)
            .Options;

        // Ensure the table schema is completely generated in memory
        using (var context = new AppDbContext(options))
        {
            await context.Database.EnsureCreatedAsync();

            // Seed clean, strictly mapped test rows mirroring our real models
            context.ServerAssets.AddRange(
                new ServerAsset
                {
                    Id = Guid.NewGuid(),
                    ServerName = "test-server-01",
                    OperatingSystem = "Ubuntu",
                    MissingPatches = 2,
                    SecurityStatus = "Vulnerable",
                    LastAuditedAt = DateTime.UtcNow
                },
                new ServerAsset
                {
                    Id = Guid.NewGuid(),
                    ServerName = "test-server-02",
                    OperatingSystem = "Windows",
                    MissingPatches = 0,
                    SecurityStatus = "Compliant",
                    LastAuditedAt = DateTime.UtcNow
                }
            );
            await context.SaveChangesAsync();
        }

        // 3. Act: Instantiate the controller with our test context and invoke the endpoint
        using (var context = new AppDbContext(options))
        {
            var controller = new AssetController(context);
            var result = await controller.GetAssets();

            // 4. Assert: Verify the server HTTP result wrapper holds our records
            var okResult = Assert.IsType<OkObjectResult>(result.Result);
            var assets = Assert.IsAssignableFrom<IEnumerable<ServerAsset>>(okResult.Value);

            Assert.Equal(2, assets.Count());
        }
    }
}
