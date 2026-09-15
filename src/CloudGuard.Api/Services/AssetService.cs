using CloudGuard.Api.Data;
using CloudGuard.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CloudGuard.Api.Services;

public class AssetService(AppDbContext context) : IAssetService
{
    public async Task<IEnumerable<ServerAsset>> GetAllAssetsAsync()
    {
        var assets = await context.ServerAssets.ToListAsync();
        return assets;
    }

    public async Task UpdateAssetAsync(ServerAsset asset)
    {
        context.ServerAssets.Attach(asset);
        context.Entry(asset).State = EntityState.Modified;
        await context.SaveChangesAsync();
    }

    public async Task<IEnumerable<ServerAsset>> GetScopedAssetsAsync(string? building, string? room)
    {
        IQueryable<ServerAsset> query = context.ServerAssets;

        if (!string.IsNullOrWhiteSpace(building))
        {
            query = query.Where(s => s.BuildingName == building);
        }

        if (!string.IsNullOrWhiteSpace(room))
        {
            query = query.Where(s => s.ServerRoom == room);
        }

        return await query.ToListAsync();
    }
}
