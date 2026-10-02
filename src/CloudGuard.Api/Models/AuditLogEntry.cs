using System;

namespace CloudGuard.Api.Models;

public class AuditLogEntry
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Username { get; set; } = string.Empty;
    public string UserRole { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string EndpointPath { get; set; } = string.Empty;
    public string PayloadData { get; set; } = string.Empty;
    public bool IsSuccess { get; set; } = true;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
