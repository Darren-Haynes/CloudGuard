using CloudGuard.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CloudGuard.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<ServerAsset> ServerAssets => Set<ServerAsset>();
}
