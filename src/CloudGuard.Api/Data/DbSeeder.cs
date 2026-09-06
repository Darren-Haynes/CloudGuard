using CloudGuard.Api.Models;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Collections.Generic;
using System.Linq;

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

        var osOptions = new[] { "Windows Server 2022", "Ubuntu 22.04 LTS", "Red Hat Enterprise Linux", "Windows Server 2025", "Ubuntu 24.04 LTS" };
        var regions = new[] { "gsy", "jsy" };
        var depts = new[] { "fin", "hr", "core", "mail", "legal", "fund", "web", "sql", "trust", "backup" };
        var random = new Random(42); // Hardcoded seed to keep test suites deterministic!

        var servers = new List<ServerAsset>();

        for (int i = 1; i <= 300; i++)
        {
            var region = regions[random.Next(regions.Length)];
            var dept = depts[random.Next(depts.Length)];
            var os = osOptions[random.Next(osOptions.Length)];

            // Randomly drift compliance thresholds
            var patches = random.Next(0, 16);
            string status = "Compliant";
            if (patches >= 10) status = "Critical";
            else if (patches > 0) status = "Vulnerable";

            servers.Add(new ServerAsset
            {
                Id = Guid.NewGuid(),
                ServerName = $"{region}-{dept}-prod-{i:D3}",
                OperatingSystem = os,
                MissingPatches = patches,
                SecurityStatus = status,
                LastAuditedAt = DateTime.UtcNow.AddMinutes(-random.Next(1, 60))
            });
        }

        context.ServerAssets.AddRange(servers);
        context.SaveChanges();
    }
}
