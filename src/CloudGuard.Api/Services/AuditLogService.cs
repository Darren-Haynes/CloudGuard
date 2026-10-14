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
    // The ledger lives in memory and every request adds to it, so only the newest entries
    // are kept. That bounds the memory used and the size of each audit-trail response.
    public const int MaxEntries = 500;

    private readonly ConcurrentQueue<AuditLogEntry> _auditLedger = new();

    public void LogSecurityAction(AuditLogEntry entry)
    {
        _auditLedger.Enqueue(entry);

        // Drop the oldest entries once the ledger is over its limit. Under heavy concurrency
        // this can briefly trim one or two entries more than strictly needed.
        while (_auditLedger.Count > MaxEntries)
        {
            _auditLedger.TryDequeue(out _);
        }
    }

    public IEnumerable<AuditLogEntry> GetAuditLedgerTrail()
    {
        return _auditLedger.ToArray();
    }
}
