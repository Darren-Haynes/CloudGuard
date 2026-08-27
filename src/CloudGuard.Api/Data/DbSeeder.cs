using CloudGuard.Api.Models;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;

namespace CloudGuard.Api.Data;

public static class DbSeeder
{
    public static void SeedData(IApplicationBuilder app)
    {
        using var scope = app.ApplicationServices.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        context.Database.EnsureCreated();

        if (context.ServerAssets.Any())
        {
            return;
        }

        context.ServerAssets.AddRange(
            new ServerAsset
            {
                ServerName = "gsy-fin-prod-01",
                OperatingSystem = "Windows Server 2022",
                MissingPatches = 0,
                SecurityStatus = "Compliant",
                LastAuditedAt = DateTime.UtcNow
            },
            new ServerAsset
            {
                ServerName = "gsy-hr-vm-02",
                OperatingSystem = "Ubuntu 22.04 LTS",
                MissingPatches = 4,
                SecurityStatus = "Vulnerable",
                LastAuditedAt = DateTime.UtcNow
            },
            new ServerAsset
            {
                ServerName = "gsy-core-dc-01",
                OperatingSystem = "Windows Server 2019",
                MissingPatches = 12,
                SecurityStatus = "Critical",
                LastAuditedAt = DateTime.UtcNow
            },
            new ServerAsset
            {
                ServerName = "gsy-mail-exch-01",
                OperatingSystem = "Windows Server 2022",
                MissingPatches = 0,
                SecurityStatus = "Compliant",
                LastAuditedAt = DateTime.UtcNow
            },
            new ServerAsset
            {
                ServerName = "jsy-legal-prod-01",
                OperatingSystem = "Windows Server 2025",
                MissingPatches = 1,
                SecurityStatus = "Vulnerable",
                LastAuditedAt = DateTime.UtcNow
            },
            new ServerAsset
            {
                ServerName = "jsy-fund-vm-03",
                OperatingSystem = "Red Hat Enterprise Linux",
                MissingPatches = 0,
                SecurityStatus = "Compliant",
                LastAuditedAt = DateTime.UtcNow
            },
            new ServerAsset
            {
                ServerName = "gsy-web-nginx-01",
                OperatingSystem = "Ubuntu 24.04 LTS",
                MissingPatches = 15,
                SecurityStatus = "Critical",
                LastAuditedAt = DateTime.UtcNow
            },
            new ServerAsset
            {
                ServerName = "gsy-sql-client-02",
                OperatingSystem = "Windows Server 2022",
                MissingPatches = 3,
                SecurityStatus = "Vulnerable",
                LastAuditedAt = DateTime.UtcNow
            },
            new ServerAsset
            {
                ServerName = "jsy-trust-prod-04",
                OperatingSystem = "Windows Server 2019",
                MissingPatches = 0,
                SecurityStatus = "Compliant",
                LastAuditedAt = DateTime.UtcNow
            },
            new ServerAsset
            {
                ServerName = "gsy-backup-nas-01",
                OperatingSystem = "TrueNAS CORE",
                MissingPatches = 7,
                SecurityStatus = "Vulnerable",
                LastAuditedAt = DateTime.UtcNow
            }
        );

        context.SaveChanges();
    }
}
