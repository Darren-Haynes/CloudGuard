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
}
