using System.Threading.Tasks;
using CloudGuard.Api.Security;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;

namespace CloudGuard.Functions;

// POST /api/login: the one endpoint that works without a token. All of the logic is in
// LoginEndpoint (CloudGuard.Api), which is unit-tested; this only exposes it as a function.
public class LoginFunction(AccessTokenService tokens)
{
    // AccessControlMiddleware lets this function, and no other, through without a token.
    public const string FunctionName = "LoginFunction";

    [Function(FunctionName)]
    public Task<IActionResult> Login(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "login")] HttpRequest req)
    {
        return LoginEndpoint.HandleAsync(req, tokens);
    }
}
