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

        // Mock Shell command libraries categorized by Operating System kernel type
        var bashCommands = new[] { "sudo apt-get update", "systemctl status sshd", "df -h", "tail -n 50 /var/log/auth.log", "top -b -n 1", "netstat -tuln", "docker ps", "ufw status", "uname -a", "history | tail -10" };
        var powershellCommands = new[] { "Get-Service wuauserv", "Get-EventLog -LogName Security -Newest 10", "Get-Disk", "Get-Process | Sort-Object CPU", "ipconfig /all", "Test-NetConnection", "Invoke-WebApplication", "Clear-BccCache", "Get-HotFix", "Restart-Service Spooler" };

        var random = new Random(42);
        var servers = new List<ServerAsset>();
        int serverIndex = 1;

        Action<string, string, int> generateFleet = (building, room, count) =>
        {
            for (int i = 0; i < count; i++)
            {
                var os = osOptions[random.Next(osOptions.Length)];
                var isWindows = os.StartsWith("Windows");

                var patches = random.Next(0, 16);
                string status = "Compliant";
                if (patches >= 10) status = "Critical";
                else if (patches > 0) status = "Vulnerable";

                // Generate highly realistic architectural baseline metrics
                var cores = new[] { 4, 8, 16, 32, 64 }[random.Next(5)];
                var ram = new[] { 16, 32, 64, 128, 256, 512 }[random.Next(6)];
                var freeRam = Math.Round(ram * random.NextDouble() * 0.4, 2); // Randomly drift free RAM bounds

                // Pull distinct mock command trailing sequences based on OS flavor
                var commandsPool = isWindows ? powershellCommands : bashCommands;
                var shuffledCommands = commandsPool.OrderBy(_ => random.Next()).Take(5);
                var shellLogBlock = string.Join("\n", shuffledCommands);

                servers.Add(new ServerAsset
                {
                    Id = Guid.NewGuid(),
                    ServerName = $"{building.Replace(" ", "").ToLower()}-rm{room}-{serverIndex:D3}",
                    OperatingSystem = os,
                    MissingPatches = patches,
                    SecurityStatus = status,
                    LastAuditedAt = DateTime.UtcNow.AddMinutes(-random.Next(1, 60)),
                    BuildingName = building,
                    ServerRoom = $"Room {room}",

                    // Hardware Specifications
                    CpuCoreCount = cores,
                    InstalledRamGb = ram,
                    IpAddress = $"10.{random.Next(1, 4)}.{random.Next(10, 254)}.{random.Next(10, 254)}",
                    MacAddress = $"{random.Next(0,255):X2}:{random.Next(0,255):X2}:{random.Next(0,255):X2}:{random.Next(0,255):X2}:{random.Next(0,255):X2}:{random.Next(0,255):X2}",

                    // Telemetry and Age Degradation Profile
                    UptimeSeconds = random.Next(3600, 2592000), // Up to 30 days of clean uptime ticks
                    FreeRamGb = freeRam,
                    CpuAgeMonths = random.Next(1, 48), // Intentional drift over the 36-month enterprise ceiling
                    RamAgeMonths = random.Next(1, 48),
                    DiskAgeMonths = random.Next(1, 48),

                    // Time-Series Simulation Aggregates
                    AvgCpuLoad24H = Math.Round(random.NextDouble() * 100, 1),
                    AvgCpuLoad1W = Math.Round(random.NextDouble() * 100, 1),
                    AvgCpuLoad1M = Math.Round(random.NextDouble() * 100, 1),
                    AvgRamLoad24H = Math.Round(random.NextDouble() * 100, 1),
                    AvgRamLoad1W = Math.Round(random.NextDouble() * 100, 1),
                    AvgRamLoad1M = Math.Round(random.NextDouble() * 100, 1),

                    LastShellCommands = shellLogBlock
                });
                serverIndex++;
            }
        };

        for (int r = 1; r <= 7; r++) generateFleet("Building 1", r.ToString("D2"), r == 7 ? 32 : 33);
        for (int r = 1; r <= 3; r++) generateFleet("Building 2", r.ToString("D2"), 40);
        generateFleet("Building 3", "01", 38);
        generateFleet("Building 3", "02", 39);

        context.ServerAssets.AddRange(servers);
        context.SaveChanges();
    }
}
