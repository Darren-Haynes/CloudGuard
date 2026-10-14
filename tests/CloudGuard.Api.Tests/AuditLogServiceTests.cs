using System.Linq;
using System.Threading.Tasks;
using CloudGuard.Api.Models;
using CloudGuard.Api.Services;
using Xunit;

namespace CloudGuard.Api.Tests;

public class AuditLogServiceTests
{
    private static AuditLogEntry EntryNumber(int number) => new() { EndpointPath = $"/api/asset/{number}" };

    [Fact]
    public void GetAuditLedgerTrail_ReturnsAnEmptyTrail_BeforeAnythingIsLogged()
    {
        // Arrange
        var service = new AuditLogService();

        // Act & Assert
        Assert.Empty(service.GetAuditLedgerTrail());
    }

    [Fact]
    public void GetAuditLedgerTrail_ReturnsEntriesOldestFirst()
    {
        // Arrange
        var service = new AuditLogService();

        // Act
        for (var number = 1; number <= 3; number++)
        {
            service.LogSecurityAction(EntryNumber(number));
        }

        // Assert
        var paths = service.GetAuditLedgerTrail().Select(entry => entry.EndpointPath).ToArray();
        Assert.Equal(new[] { "/api/asset/1", "/api/asset/2", "/api/asset/3" }, paths);
    }

    [Fact]
    public void LogSecurityAction_KeepsEveryEntry_WhenTheLedgerIsExactlyFull()
    {
        // Arrange
        var service = new AuditLogService();

        // Act
        for (var number = 1; number <= AuditLogService.MaxEntries; number++)
        {
            service.LogSecurityAction(EntryNumber(number));
        }

        // Assert
        var trail = service.GetAuditLedgerTrail().ToArray();
        Assert.Equal(AuditLogService.MaxEntries, trail.Length);
        Assert.Equal("/api/asset/1", trail[0].EndpointPath);
    }

    [Fact]
    public void LogSecurityAction_KeepsOnlyTheNewestEntries_OnceTheLimitIsExceeded()
    {
        // Arrange
        const int overflow = 25;
        var service = new AuditLogService();

        // Act
        for (var number = 1; number <= AuditLogService.MaxEntries + overflow; number++)
        {
            service.LogSecurityAction(EntryNumber(number));
        }

        // Assert: the oldest entries were dropped and the order is preserved
        var trail = service.GetAuditLedgerTrail().ToArray();
        Assert.Equal(AuditLogService.MaxEntries, trail.Length);
        Assert.Equal($"/api/asset/{overflow + 1}", trail[0].EndpointPath);
        Assert.Equal($"/api/asset/{AuditLogService.MaxEntries + overflow}", trail[^1].EndpointPath);
    }

    [Fact]
    public void LogSecurityAction_NeverHoldsMoreThanTheLimit_UnderConcurrentWriters()
    {
        // Arrange
        var service = new AuditLogService();

        // Act
        Parallel.For(0, AuditLogService.MaxEntries * 4, number => service.LogSecurityAction(EntryNumber(number)));

        // Assert
        var count = service.GetAuditLedgerTrail().Count();
        Assert.InRange(count, 1, AuditLogService.MaxEntries);
    }
}
