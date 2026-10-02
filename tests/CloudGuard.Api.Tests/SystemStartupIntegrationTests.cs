using System;
using System.IO;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using CloudGuard.Api.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace CloudGuard.Api.Tests;

public class SystemStartupIntegrationTests
{
    [Fact]
    public async Task ApplicationStartup_InvokesControllersAndExecutesAuditMiddleware()
    {
        // Arrange: boot the real startup pipeline against an isolated throwaway SQLite file
        var dbPath = Path.Combine(Path.GetTempPath(), $"cloudguard-test-{Guid.NewGuid():N}.db");

        try
        {
            await using var factory = new WebApplicationFactory<Program>()
                .WithWebHostBuilder(builder =>
                {
                    builder.UseSetting("ConnectionStrings:DefaultConnection", $"Data Source={dbPath}");
                });

            using var client = factory.CreateClient();

            // Act
            var response = await client.GetAsync("api/asset");

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            // The seeded fleet is served through the full controller + service stack
            var assets = await response.Content.ReadFromJsonAsync<ServerAsset[]>(
                new JsonSerializerOptions(JsonSerializerDefaults.Web));
            Assert.NotNull(assets);
            Assert.NotEmpty(assets);

            // The global audit filter should have recorded the request above
            var trailResponse = await client.GetAsync("api/asset/security/audit-trail");
            Assert.Equal(HttpStatusCode.OK, trailResponse.StatusCode);

            var trail = await trailResponse.Content.ReadFromJsonAsync<AuditLogEntry[]>(
                new JsonSerializerOptions(JsonSerializerDefaults.Web));
            Assert.NotNull(trail);
            Assert.Contains(trail, entry =>
                entry.Username == "anonymous-operator" &&
                entry.UserRole == "Guest-Clearance" &&
                entry.Action == "GET" &&
                entry.EndpointPath == "/api/asset" &&
                entry.IsSuccess);
        }
        finally
        {
            // Release pooled SQLite handles before deleting the temp files
            Microsoft.Data.Sqlite.SqliteConnection.ClearAllPools();
            foreach (var suffix in new[] { "", "-shm", "-wal" })
            {
                try { File.Delete(dbPath + suffix); } catch (IOException) { }
            }
        }
    }
}
