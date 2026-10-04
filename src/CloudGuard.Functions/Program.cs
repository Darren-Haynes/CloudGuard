using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using CloudGuard.Api.Data;
using CloudGuard.Api.Services;
using CloudGuard.Api.Filters;

var host = new HostBuilder()
    .ConfigureFunctionsWebApplication(builder =>
    {
        // Globally registers our custom corporate security audit filter across all serverless endpoints
        builder.Services.AddControllers(options =>
        {
            options.Filters.Add<AuditLoggingFilter>();
        });
    })
    .ConfigureServices(services =>
    {
        // 💾 EXPLICIT LOCAL ARCHITECTURE: Look for the database right beside the executing binary!
        services.AddDbContext<AppDbContext>(options =>
            options.UseSqlite("Data Source=cloudguard.db"));

        // Inject our high-performance data tier interfaces and singletons
        services.AddScoped<IAssetService, AssetService>();
        services.AddSingleton<IAuditLogService, AuditLogService>();
    })
    .Build();

host.Run();
