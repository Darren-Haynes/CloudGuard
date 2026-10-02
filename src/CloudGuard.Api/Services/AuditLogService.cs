using System.Collections.Concurrent;
using System.Collections.Generic;
using CloudGuard.Api.Models;

namespace CloudGuard.Api.Services;

public interface IAuditLogService
{
    void LogSecurityAction(AuditLogEntry entry);
    IEnumerable<AuditLogEntry> GetAuditLedgerTrail();
}

public class AuditLogService : IAuditLogService
{
    private readonly ConcurrentQueue<AuditLogEntry> _auditLedger = new();

    public void LogSecurityAction(AuditLogEntry entry)
    {
        _auditLedger.Enqueue(entry);
    }

    public IEnumerable<AuditLogEntry> GetAuditLedgerTrail()
    {
        return _auditLedger.ToArray();
    }
}
