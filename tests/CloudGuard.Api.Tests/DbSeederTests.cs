using System;
using System.Linq;
using System.Threading.Tasks;
using CloudGuard.Api.Data;
using CloudGuard.Api.Models;
using Microsoft.AspNetCore.Builder;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NSubstitute;
using Xunit;

namespace CloudGuard.Api.Tests;

public class DbSeederTests
{
    [Fact]
    public async Task SeedData_PopulatesDatabaseWithThreeHundredServers_WhenDatabaseIsEmpty()
    {
        // Arrange
        using var connection = new SqliteConnection("DataSource=:memory:");
        await connection.OpenAsync();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(connection)
            .Options;

        var services = new ServiceCollection();
        services.AddDbContext<AppDbContext>(dbOptions => dbOptions.UseSqlite(connection));
        var serviceProvider = services.BuildServiceProvider();

        var app = Substitute.For<IApplicationBuilder>();
        app.ApplicationServices.Returns(serviceProvider);

        using (var context = new AppDbContext(options))
        {
            await context.Database.EnsureCreatedAsync();
        }

        // Act
        DbSeeder.SeedData(app);

        // Assert
        using (var context = new AppDbContext(options))
        {
            var serverCount = await context.ServerAssets.CountAsync();
            Assert.Equal(427, serverCount); // Verifies the scaled 300 fleet size

            // Verify that regional infrastructure naming patterns are being generated
            Assert.True(await context.ServerAssets.AnyAsync(s => s.ServerName.StartsWith("building1-")));
            Assert.True(await context.ServerAssets.AnyAsync(s => s.ServerName.StartsWith("building3-")));
        }
    }

    [Fact]
    public async Task SeedData_DoesNotPopulateDatabase_WhenDatabaseAlreadyHasData()
    {
        // Arrange
        using var connection = new SqliteConnection("DataSource=:memory:");
        await connection.OpenAsync();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(connection)
            .Options;

        var services = new ServiceCollection();
        services.AddDbContext<AppDbContext>(dbOptions => dbOptions.UseSqlite(connection));
        var serviceProvider = services.BuildServiceProvider();

        var app = Substitute.For<IApplicationBuilder>();
        app.ApplicationServices.Returns(serviceProvider);

        using (var context = new AppDbContext(options))
        {
            await context.Database.EnsureCreatedAsync();
            context.ServerAssets.Add(new ServerAsset
            {
                Id = Guid.NewGuid(),
                ServerName = "pre-existing-server",
                OperatingSystem = "Linux",
                MissingPatches = 0,
                SecurityStatus = "Compliant",
                LastAuditedAt = DateTime.UtcNow
            });
            await context.SaveChangesAsync();
        }

        // Act
        DbSeeder.SeedData(app);

        // Assert
        using (var context = new AppDbContext(options))
        {
            var serverCount = await context.ServerAssets.CountAsync();
            Assert.Equal(1, serverCount);
            Assert.True(await context.ServerAssets.AnyAsync(s => s.ServerName == "pre-existing-server"));
            Assert.False(await context.ServerAssets.AnyAsync(s => s.ServerName.StartsWith("gsy-")));
        }
    }
}
