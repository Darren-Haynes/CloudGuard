using CloudGuard.Api.Models;

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
            });

        context.SaveChanges();
    }
}
