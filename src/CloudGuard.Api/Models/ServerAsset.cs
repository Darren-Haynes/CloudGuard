using System;

namespace CloudGuard.Api.Models;

public class ServerAsset
{
    public Guid Id { get; set; }
    public string ServerName { get; set; } = string.Empty;
    public string OperatingSystem { get; set; } = string.Empty;
    public int MissingPatches { get; set; }
    public string SecurityStatus { get; set; } = string.Empty;
    public DateTime LastAuditedAt { get; set; }
}
