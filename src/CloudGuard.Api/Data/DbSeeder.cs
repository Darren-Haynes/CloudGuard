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
        var random = new Random(42); // Seed kept consistent for test predictability
        var servers = new List<ServerAsset>();
        int serverIndex = 1;

        // Helper action to handle consistent telemetry generation math
        Action<string, string, int> generateFleet = (building, room, count) =>
        {
            for (int i = 0; i < count; i++)
            {
                var os = osOptions[random.Next(osOptions.Length)];
                var patches = random.Next(0, 16);
                string status = "Compliant";
                if (patches >= 10) status = "Critical";
                else if (patches > 0) status = "Vulnerable";

                servers.Add(new ServerAsset
                {
                    Id = Guid.NewGuid(),
                    ServerName = $"{building.Replace(" ", "").ToLower()}-rm{room}-{serverIndex:D3}",
                    OperatingSystem = os,
                    MissingPatches = patches,
                    SecurityStatus = status,
                    LastAuditedAt = DateTime.UtcNow.AddMinutes(-random.Next(1, 60)),
                    BuildingName = building,
                    ServerRoom = $"Room {room}"
                });
                serverIndex++;
            }
        };

        // 🏛️ Building 1: 7 Rooms -> Target 230 Servers (~33 per room, remaining to Room 07)
        for (int r = 1; r <= 7; r++)
            generateFleet("Building 1", r.ToString("D2"), r == 7 ? 32 : 33);

        // 🏛️ Building 2: 3 Rooms -> Target 120 Servers (40 per room)
        for (int r = 1; r <= 3; r++)
            generateFleet("Building 2", r.ToString("D2"), 40);

        // 🏛️ Building 3: 2 Rooms -> Target 77 Servers (38 in Room 1, 39 in Room 2)
        generateFleet("Building 3", "01", 38);
        generateFleet("Building 3", "02", 39);

        context.ServerAssets.AddRange(servers);
        context.SaveChanges();
    }
}
