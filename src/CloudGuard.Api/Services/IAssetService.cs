using CloudGuard.Api.Models;

namespace CloudGuard.Api.Services;

public interface IAssetService
{
    Task<IEnumerable<ServerAsset>> GetAllAssetsAsync();
}
