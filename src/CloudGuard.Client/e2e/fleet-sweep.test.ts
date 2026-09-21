import { test, expect } from '@playwright/test';

test.describe('CloudGuard Full-Stack Fleet Remediation E2E Sweep', () => {
  test('should sequentially remediate all vulnerable nodes in Building 4 and verify the folder flips green', async ({ page }) => {
    // 1. Navigate straight to our active local Vite development web server
    await page.goto('http://localhost:5173/');
    await expect(page).toHaveTitle(/CloudGuard/i);


    // 2. Click on the 'Building 4' sidebar accordion header row securely using our new Test ID
    const building4Header = page.getByTestId('sidebar-building-building4');
    await expect(building4Header).toBeVisible();
    await building4Header.click();

    console.log('🏁 Initiating automated infrastructure remediation sweep over Building 4 sandbox perimeters...');

    // 💡 FILTER STABILIZATION LOCK: Wait for stale Building 1 servers to vanish from the view
    // This forces Playwright to pause until the frontend updates the grid to our selected building!
    const staleServerRow = page.locator('tr:has-text("building1-")');
    await expect(staleServerRow).toHaveCount(0, { timeout: 5000 });

    // 3. Keep looping as long as there is a row displaying a Building 4 server needing patches
    while (true) {
      // Locate the first visible Building 4 row containing threat markers (Critical or Vulnerable)
      // 🔥 Restricting the text locator strictly to 'building4-' ensures it can never leak back into other rooms!
      const dynamicVulnerableRow = page.locator('tr:has-text("building4-"):has-text("Critical"), tr:has-text("building4-"):has-text("Vulnerable")').first();

      // If no vulnerable or critical server rows remain visible for Building 4, our sweep is successful!
      if (await dynamicVulnerableRow.count() === 0) {
        break;
      }

      // Capture the unique text name link identifier of the target server node
      const serverNameCell = dynamicVulnerableRow.locator('td').first();
      const serverName = (await serverNameCell.innerText()).trim();
      console.log(`🛡️ Automated Drill-down: Launching patch matrices for ${serverName}...`);

      // Click the server cell to route straight into its deep dive panel layout
      await serverNameCell.click();

      // Wait for the Standalone Alert Action Banner button to mount cleanly onto the DOM layer
      const remediateButton = page.locator('text=Execute Active Patch Remediation');
      await expect(remediateButton).toBeVisible();

      // Click the execution button to trigger the asynchronous backend endpoint mutation over port 5003
      await remediateButton.click();

      // Verify that the UI state successfully updates and transforms the alert banner to green
      const complianceBanner = page.locator('text=Fully Patched & Compliant');
      await expect(complianceBanner).toBeVisible();

      console.log(`✅ ${serverName} successfully patched to full compliance.`);

      // Click the back navigation trigger element to return straight back out to the Building 4 list
      const backButton = page.locator('text=Back to Master Overview');
      await backButton.click();

      // EXPLICIT SYNC LOCK: Locate the row with our exact server name, and wait for its badge to hit Compliant!
      const targetUpdatedRow = page.locator(`tr:has-text("${serverName}")`);
      await expect(targetUpdatedRow.locator('text=Compliant')).toBeVisible({ timeout: 5000 });

      // Give the layout canvas a brief moment to stabilize state
      await page.waitForTimeout(100);
    }

    console.log('🎉 Fleet sweep completed! Verifying sidebar structural rollup light states...');

    // 4. Locate Building 4's status tracking indicator node icon element precisely inside its test ID
    // 🔥 Targeting the explicit Test ID bypasses the multi-element strict mode violation completely!
    const building4Status = page.getByTestId('sidebar-building-building4').locator('text=🟢');

    // Assert absolute victory: the folder rollup light must turn 100% compliant green live on screen!
    await expect(building4Status).toBeVisible();
    console.log('🏆 Victory! Building 4 navigation indicator has successfully flipped to Green (🟢).');
  });
});
