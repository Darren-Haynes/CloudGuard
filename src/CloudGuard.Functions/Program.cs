using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Azure.Storage.Blobs;
using System;
using System.IO;
using CloudGuard.Api.Data;
using CloudGuard.Api.Services;
using CloudGuard.Api.Filters;

var host = new HostBuilder()
    .ConfigureFunctionsWebApplication(builder =>
    {
        builder.Services.AddControllers(options =>
        {
            options.Filters.Add<AuditLoggingFilter>();
        });
    })
    .ConfigureServices(services =>
    {
        // 🌐 CLOUD PERSISTENCE ENVELOPE: Fetch the SQLite file from Blob Storage on cold start
        var connectionString = Environment.GetEnvironmentVariable("AzureWebJobsStorage");
        var tempDbPath = Path.Combine(Path.GetTempPath(), "cloudguard.db");

        if (!string.IsNullOrEmpty(connectionString) && connectionString != "UseDevelopmentStorage=true")
        {
            try
            {
                var blobServiceClient = new BlobServiceClient(connectionString);
                var containerClient = blobServiceClient.GetBlobContainerClient("deployments");
                var blobClient = containerClient.GetBlobClient("cloudguard.db");

                if (!File.Exists(tempDbPath))
                {
                    blobClient.DownloadTo(tempDbPath);
                }
            }
            catch (Exception)
            {
                // Fallback baseline map if storage sync encounters transient networking lag
            }
        }
        else
        {
            // Local fallback path for workstation emulator development
            tempDbPath = "cloudguard.db";
        }

        services.AddDbContext<AppDbContext>(options =>
            options.UseSqlite($"Data Source={tempDbPath}"));

        services.AddScoped<IAssetService, AssetService>();
        services.AddSingleton<IAuditLogService, AuditLogService>();
    })
    .Build();

host.Run();
