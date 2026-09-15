using System.Collections.Generic;
using System.Threading.Tasks;
using CloudGuard.Api.Models;

namespace CloudGuard.Api.Services;

public interface IAssetService
{
    Task<IEnumerable<ServerAsset>> GetAllAssetsAsync();
    Task UpdateAssetAsync(ServerAsset asset);

    // CONTEXT-AWARE AUDIT RETRIEVAL METHOD SIGNATURE
    Task<IEnumerable<ServerAsset>> GetScopedAssetsAsync(string? building, string? room);
}
