using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CloudGuard.Api.Models;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Polly;
using Polly.Retry;

namespace CloudGuard.Api.Services;

public class ResilientAssetServiceDecorator : IAssetService
{
    private readonly IAssetService _innerService;
    private readonly ILogger<ResilientAssetServiceDecorator> _logger;
    private readonly AsyncRetryPolicy _retryPolicy;

    public ResilientAssetServiceDecorator(IAssetService innerService, ILogger<ResilientAssetServiceDecorator> _logger)
    {
        _innerService = innerService;
        this._logger = _logger;

        // 🛡️ Define a robust 3-strike transient exception retry policy with exponential backoff
        _retryPolicy = Policy
            .Handle<DbUpdateException>()
            .Or<SqliteException>(ex => ex.SqliteErrorCode == 5) // Error 5 = SQLITE_BUSY (Temporary Database Lock)
            .WaitAndRetryAsync(
                retryCount: 3,
                sleepDurationProvider: attempt => TimeSpan.FromMilliseconds(Math.Pow(2, attempt) * 100),
                onRetry: (exception, timeSpan, retryCount, context) =>
                {
                    _logger.LogWarning(
                        exception,
                        "⚠️ Transient database fault detected on attempt {Count}. Retrying in {Delay}ms...",
                        retryCount,
                        timeSpan.TotalMilliseconds
                    );
                });
    }

    public async Task<IEnumerable<ServerAsset>> GetAllAssetsAsync()
    {
        return await _retryPolicy.ExecuteAsync(() => _innerService.GetAllAssetsAsync());
    }

    public async Task UpdateAssetAsync(ServerAsset asset)
    {
        await _retryPolicy.ExecuteAsync(() => _innerService.UpdateAssetAsync(asset));
    }

    public async Task<IEnumerable<ServerAsset>> GetScopedAssetsAsync(string? building, string? room)
    {
        return await _retryPolicy.ExecuteAsync(() => _innerService.GetScopedAssetsAsync(building, room));
    }
}
