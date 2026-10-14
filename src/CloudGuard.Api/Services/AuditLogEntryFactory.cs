using System;
using System.Collections.Generic;
using CloudGuard.Api.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CloudGuard.Api.Services;

// Builds the audit-ledger entry for one HTTP request. The API's MVC filter and the Functions
// app's middleware both call it, so both hosts record the same identity defaults and use the
// same definition of success.
public static class AuditLogEntryFactory
{
    private const string AnonymousUser = "anonymous-operator";
    private const string GuestRole = "Guest-Clearance";

    // argumentNames are the names, never the values, of the parameters the request carried.
    // result is what the endpoint returned (null when it returned nothing) and exception is
    // what it threw, if anything.
    public static AuditLogEntry Create(
        HttpRequest request,
        IEnumerable<string> argumentNames,
        IActionResult? result,
        Exception? exception)
    {
        // Identity headers simulate administrative profiles; a caller that sends none is a guest.
        var username = request.Headers["X-CloudGuard-User"].ToString();
        var userRole = request.Headers["X-CloudGuard-Role"].ToString();

        return new AuditLogEntry
        {
            Username = string.IsNullOrWhiteSpace(username) ? AnonymousUser : username,
            UserRole = string.IsNullOrWhiteSpace(userRole) ? GuestRole : userRole,
            Action = request.Method,
            EndpointPath = request.Path,
            PayloadData = string.Join(", ", argumentNames),
            // True success/failure outcome: an exception or any other kind of result is a failure.
            IsSuccess = exception == null && (result is OkObjectResult or OkResult or FileContentResult),
            Timestamp = DateTime.UtcNow
        };
    }
}
