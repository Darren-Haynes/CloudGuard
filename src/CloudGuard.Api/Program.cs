using CloudGuard.Api.Data;
using CloudGuard.Api.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add standard Web API Controller parsing support to the service container
builder.Services.AddControllers();

// Configure native OpenAPI v3.1 document generation metrics
builder.Services.AddOpenApi();

// Inject our centralized Entity Framework SQLite infrastructure mapping layer
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

// Register our asynchronous vulnerability simulator engine to run continuously
builder.Services.AddHostedService<CloudGuard.Api.Services.VulnerabilityWorker>();
// builder.Services.AddHostedService<VulnerabilityWorker>();

// Establish secure Cross-Origin Resource Sharing rules for the local React interface
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// Configure the HTTP request delivery pipeline
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

// Enforce the CORS middleware layer ahead of downstream request evaluations
app.UseCors("AllowReactApp");

app.UseAuthorization();

// Map your controller routes automatically (bridges traffic straight to AssetController)
app.MapControllers();

DbSeeder.SeedData(app);

app.Run();
