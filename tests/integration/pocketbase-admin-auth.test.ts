import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import PocketBase from 'pocketbase';
import { exec, ChildProcess } from 'node:child_process'; // Import ChildProcess for typing
import util from 'node:util';
import { Console } from 'node:console';

const execAsync = util.promisify(exec);

// PocketBase instance URL (default from setup script)
const PB_URL = 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || 'testadmin@example.com';
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD || 'password12345';

// Skip in CI environment where PocketBase binary is not available
const isCI = process.env.CI === 'true';

// Custom console to avoid Vitest intercepting all logs
const customConsole = new Console(process.stdout, process.stderr);

describe.skipIf(isCI)('PocketBase Admin Authentication (T205)', () => {
  let pb: PocketBase;
  let pbProcess: ChildProcess | null = null; // Use ChildProcess type and allow null

  beforeAll(async () => {
    customConsole.log('Starting PocketBase for admin auth tests...');

    // Attempt to start PocketBase
    // Ensure the command runs PocketBase from the correct directory
    pbProcess = exec('npm run pocketbase:serve', { cwd: process.cwd() }); // Using npm run script

    pbProcess.stdout?.on('data', (data: string) => {
        // customConsole.log(`PocketBase stdout: ${data.trim()}`);
    });
    pbProcess.stderr?.on('data', (data: string) => {
        customConsole.error(`PocketBase stderr: ${data.trim()}`);
    });

    // Wait for PocketBase to be ready
    let pbReady = false;
    let attempts = 0;
    while (!pbReady && attempts < 15) { // Increased attempts for robustness
        try {
            const { stdout } = await execAsync(`curl -s ${PB_URL}/api/health`);
            if (stdout.includes('"code":200')) { // Check for a successful health response
                pbReady = true;
            } else {
                throw new Error('Health check failed');
            }
        } catch (error) {
            customConsole.log(`Waiting for PocketBase to start (attempt ${attempts + 1})...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        attempts++;
    }
    if (!pbReady) {
        customConsole.error('PocketBase did not start in time. Check logs for errors.');
        if (pbProcess && !pbProcess.killed) {
            pbProcess.kill('SIGKILL'); // Force kill if not started
        }
        throw new Error('PocketBase did not start in time.');
    }
    customConsole.log('PocketBase is ready.');

    pb = new PocketBase(PB_URL);

    // Ensure an admin user exists for testing
    try {
        const authData = await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        customConsole.log('Admin already exists and logged in during beforeAll.');
        // Explicitly check authStore after successful auth
        expect(pb.authStore.isValid).toBe(true);
        expect(pb.authStore.token).toBeDefined();
        // Check pb.authStore.model for admin details
        expect(pb.authStore.model).toBeDefined();
        expect(pb.authStore.model?.email).toBe(ADMIN_EMAIL);
    } catch (error: any) {
        customConsole.error('Error during initial admin auth check in beforeAll:', error.message, error.status);
        if (error.status === 400 || error.status === 404 || error.status === 401) { // 401 for invalid credentials / admin not found
            customConsole.log('Admin not found or invalid credentials, attempting to create one...');
            try {
                // Clear any lingering auth state if credentials were just wrong
                pb.authStore.clear(); 
                await pb.admins.create({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, passwordConfirm: ADMIN_PASSWORD });
                customConsole.log('Admin created successfully. Attempting to log in...');
                await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
                customConsole.log('Admin logged in after creation.');
                // Explicitly check authStore after successful auth
                expect(pb.authStore.isValid).toBe(true);
                expect(pb.authStore.token).toBeDefined();
                // Check pb.authStore.model for admin details
                expect(pb.authStore.model).toBeDefined();
                expect(pb.authStore.model?.email).toBe(ADMIN_EMAIL);
            } catch (createError: any) {
                customConsole.error('Failed to create or log in admin in beforeAll:', createError.message);
                throw createError;
            }
        } else {
            customConsole.error('Unexpected error during initial admin auth check in beforeAll:', error.message);
            throw error;
        }
    }
  }, 45000); // Increased timeout to 45 seconds for robustness (starting PB and creating admin)

  afterAll(async () => {
    // Kill the PocketBase child process
    if (pbProcess && !pbProcess.killed) { // Check if process is still alive
        customConsole.log('Stopping PocketBase...');
        try {
            // Send SIGTERM to the process group (if it's the leader)
            // or directly to the process itself
            process.kill(pbProcess.pid!, 'SIGTERM'); // pid! because we checked pbProcess
            // Wait a bit for graceful shutdown
            await new Promise(resolve => setTimeout(resolve, 2000));
            // If it's still running, force kill
            if (pbProcess && !pbProcess.killed) { // Re-check pbProcess exists and is not killed
                 customConsole.log('PocketBase still running, forcing kill...');
                 process.kill(pbProcess.pid!, 'SIGKILL');
            }
        } catch (error: any) {
            customConsole.error(`Error killing PocketBase process (PID: ${pbProcess.pid}): ${error.message}`);
        }
        customConsole.log('PocketBase stop attempt completed.');
    } else {
        customConsole.log('PocketBase process already stopped or not found.');
    }
  });

  it('should allow admin to authenticate with valid credentials', async () => {
    // We expect pb.authStore.model to be populated from beforeAll auth
    expect(pb.authStore.isValid).toBe(true);
    expect(pb.authStore.model).toBeDefined();
    expect(pb.authStore.model?.email).toBe(ADMIN_EMAIL);

    // Test a fresh authentication
    pb.authStore.clear(); // Clear previous auth
    const authData = await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    expect(authData.token).toBeDefined();
    expect(authData.admin).toBeDefined(); // This is correct from authData directly
    expect(authData.admin.email).toBe(ADMIN_EMAIL);
    expect(pb.authStore.isValid).toBe(true); // Should be true after fresh auth
    expect(pb.authStore.model?.email).toBe(ADMIN_EMAIL); // Should be populated after fresh auth
  });

  it('should NOT allow admin to authenticate with invalid credentials', async () => {
    pb.authStore.clear(); // Clear previous auth
    await expect(pb.admins.authWithPassword(ADMIN_EMAIL, 'wrong_password')).rejects.toThrow();
    expect(pb.authStore.isValid).toBe(false);
  });

  it('should maintain admin session after authentication', async () => {
    // Authenticate first
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    expect(pb.authStore.isValid).toBe(true);
    expect(pb.authStore.model).toBeDefined(); // Ensure model is populated

    // Refresh token using pb.admins.authRefresh()
    const refreshedAuth = await pb.admins.authRefresh(); // CORRECTED: Use pb.admins.authRefresh()
    expect(refreshedAuth.token).toBeDefined();
    expect(refreshedAuth.admin).toBeDefined();
    expect(refreshedAuth.admin.email).toBe(ADMIN_EMAIL);
    expect(pb.authStore.isValid).toBe(true);
    expect(pb.authStore.model?.email).toBe(ADMIN_EMAIL); // Ensure model is populated after refresh
  });
});
