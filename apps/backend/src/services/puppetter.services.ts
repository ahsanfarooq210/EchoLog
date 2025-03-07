/**
 * Google Meet Automation Class in TypeScript
 * 
 * A clean, typed approach to join and record Google Meet meetings using Puppeteer
 * With support for both authenticated and guest access
 */
import puppeteer from 'puppeteer';
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { PuppeteerScreenRecorder } from 'puppeteer-screen-recorder';
import { exec } from 'child_process';
import { promisify } from 'util';

// Add stealth plugin to puppeteer-extra
puppeteerExtra.use(StealthPlugin());

// Add missing waitForTimeout to Page interface
declare module 'puppeteer' {
    interface Page {
        waitForTimeout(timeout: number): Promise<void>;
    }
}

const execAsync = promisify(exec);

/**
 * Configuration options for the GoogleMeetAutomation class
 */
interface GoogleMeetOptions {
    /** Google account email for login (if required) */
    email?: string | null;
    /** Google account password for login (if required) */
    password?: string | null;
    /** Guest name to use when joining without authentication */
    guestName?: string;
    /** Directory path where recordings will be saved */
    recordingPath?: string;
    /** Whether to enable the camera when joining the meeting */
    cameraEnabled?: boolean;
    /** Whether to enable the microphone when joining the meeting */
    micEnabled?: boolean;
    /** Whether to run the browser in headless mode */
    headless?: boolean;
}

/**
 * Configuration for the screen recorder
 */
interface RecorderConfig {
    followNewTab: boolean;
    fps: number;
    videoCodec: string;
    aspectRatio: string;
    recordDurationLimit?: number;
    ffmpeg_Path: string | null;
    audioSource: string;
}

/**
 * Class to automate joining and recording Google Meet meetings
 */
class GoogleMeetAutomation {
    private options: Required<GoogleMeetOptions> & { guestName: string };
    private browser: Browser | null = null;
    private page: Page | null = null;
    private recorder: PuppeteerScreenRecorder | null = null;
    private isRecording: boolean = false;
    private recordingFile: string | null = null;

    /**
     * Create a new Google Meet automation instance
     * @param options Configuration options
     */
    constructor(options: GoogleMeetOptions = {}) {
        // Set default options
        this.options = {
            email: null,
            password: null,
            guestName: "EchoLog's Note Taker", // Default guest name
            recordingPath: path.resolve(process.cwd(), 'recordings'), // Make path absolute
            cameraEnabled: false,
            micEnabled: false,
            headless: false,
            ...options
        };

        // Create recording directory
        if (!fs.existsSync(this.options.recordingPath)) {
            fs.mkdirSync(this.options.recordingPath, { recursive: true });
        }
    }

    /**
     * Check if ffmpeg is installed and available
     * @private
     */
    private async _checkFfmpeg(): Promise<boolean> {
        try {
            await execAsync('ffmpeg -version');
            return true;
        } catch (error) {
            console.error('ffmpeg is not installed or not available in PATH');
            console.error('Please install ffmpeg to use the recording feature');
            return false;
        }
    }

    /**
     * Launch the browser with proper settings for media access
     */
    public async launchBrowser(): Promise<void> {
        console.log('Launching browser...');

        try {
            this.browser = await puppeteerExtra.launch({
                headless: this.options.headless,
                args: [
                    '--use-fake-ui-for-media-stream',         // Auto-accept camera/mic permissions
                    '--use-fake-device-for-media-stream',     // Use fake device if needed
                    '--disable-features=site-per-process',    // Needed for audio access
                    '--autoplay-policy=no-user-gesture-required',
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-infobars',
                    '--disable-blink-features=AutomationControlled',
                    '--disable-web-security',
                    '--disable-features=IsolateOrigins,site-per-process',
                    '--window-size=1920,1080',                // Set window size
                    '--disable-gpu',                          // Disable GPU acceleration
                    '--disable-dev-shm-usage',                // Overcome limited resource problems
                    '--lang=en-US,en',                        // Set language
                    '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' // Set a common user agent
                ],
                defaultViewport: null,                     // Use full window size
                ignoreDefaultArgs: ['--mute-audio'],       // Allow audio capture
                timeout: 60000                             // Increase timeout to 60 seconds
            });

            this.page = await this.browser.newPage();

            // Set additional page configurations
            await this.page.setExtraHTTPHeaders({
                'Accept-Language': 'en-US,en;q=0.9'
            });

            // Set cookies to appear more like a regular user
            await this.page.setCookie({
                name: 'CONSENT',
                value: 'YES+',
                domain: '.google.com',
                path: '/'
            });

            console.log('Browser launched with stealth mode');
        } catch (error) {
            console.error('Browser launch failed:', error);
            throw new Error(`Failed to launch browser: ${error}`);
        }
    }



    /**
     * Check if the "You can't join this video call" error is present
     * @private
     */
    private async _checkForCantJoinError(): Promise<boolean> {
        if (!this.page) return false;

        try {
            // Look for the error message text
            const errorText = await this.page.evaluate(() => {
                const elements = Array.from(document.querySelectorAll('div, span, p'));
                for (const el of elements) {
                    const text = el.textContent?.trim() || '';
                    if (text.includes("You can't join this video call") ||
                        text.includes("You can't join this meeting")) {
                        return true;
                    }
                }
                return false;
            });

            if (errorText) {
                // Take a screenshot of the error
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                await this.page.screenshot({
                    path: path.join(this.options.recordingPath, `cant-join-error-${timestamp}.png`)
                });

                // Try refreshing the page once to see if it helps
                console.log("Detected join error, attempting to refresh the page...");
                await this.page.reload({ waitUntil: 'networkidle2' });

                // Check again after refresh
                const errorAfterRefresh = await this.page.evaluate(() => {
                    const elements = Array.from(document.querySelectorAll('div, span, p'));
                    for (const el of elements) {
                        const text = el.textContent?.trim() || '';
                        if (text.includes("You can't join this video call") ||
                            text.includes("You can't join this meeting")) {
                            return true;
                        }
                    }
                    return false;
                });

                return errorAfterRefresh;
            }

            return false;
        } catch (error) {
            console.error("Error checking for 'can't join' message:", error);
            return false;
        }
    }

    /**
     * Join a Google Meet meeting
     * @param meetingUrl The Google Meet URL
     * @returns True if successfully joined
     */
    public async joinMeeting(meetingUrl: string): Promise<boolean> {
        try {
            if (!this.browser) {
                await this.launchBrowser();
            }

            if (!this.page) {
                throw new Error('Browser initialization failed');
            }

            console.log(`Joining meeting: ${meetingUrl}`);

            // Go to the meeting URL
            await this.page.goto(meetingUrl, { waitUntil: 'networkidle2' });
            console.log('Loaded meeting page');

            const cantJoinError = await this._checkForCantJoinError();
            if (cantJoinError) {
                console.error("Detected 'You can't join this video call' error");
                return false;
            }

            // Check for different join options (as guest or with Google account)
            const loginPrompt = await this._checkForLoginOptions();

            if (loginPrompt === 'google_login') {
                // Handle Google login if needed and credentials are provided
                if (this.options.email && this.options.password) {
                    await this._handleLogin();
                } else {
                    // If Google login is required but no credentials, try joining as guest
                    await this._joinAsGuest();
                }
            } else if (loginPrompt === 'guest_option') {
                // Join as guest directly
                await this._joinAsGuest();
            }
            // If no login prompt detected, we can proceed directly to the meeting screen

            // Wait for meeting preparation screen
            await this.page.waitForSelector([
                'div[role="button"][aria-label*="join"]',
                'div[role="button"][aria-label*="Join"]'
            ].join(', '), { visible: true, timeout: 60000 });
            console.log('Meeting preparation screen loaded');

            // Configure camera and microphone
            await this._configureDevices();

            // Join the meeting
            await this._clickJoinButton();

            // Wait to confirm we're in the meeting
            await this.page.waitForFunction(() => {
                return document.querySelector('[aria-label*="people" i], [aria-label*="chat" i], [aria-label*="participants" i]') !== null;
            }, { timeout: 60000 });

            console.log('Successfully joined the meeting');
            return true;
        }
        catch (error) {
            console.error('Failed to join meeting:', error);
            // Take error screenshot
            if (this.page) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                await this.page.screenshot({
                    path: path.join(this.options.recordingPath, `join-error-${timestamp}.png`)
                });

                // Try to close browser on error
                await this.close();
            }
            return false;
        }
    }

    /**
     * Check what type of login/join options are presented
     * @returns 'google_login', 'guest_option', or 'direct_join'
     * @private
     */
    private async _checkForLoginOptions(): Promise<'google_login' | 'guest_option' | 'direct_join'> {
        if (!this.page) throw new Error('Page not initialized');

        // Look for Google login elements
        const googleLoginButton = await this.page.$('a[href^="https://accounts.google.com/signin/"]');
        if (googleLoginButton) {
            return 'google_login';
        }

        // Look for "Join as a guest" option
        const guestText = await this.page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('button, div[role="button"]'));
            for (const el of elements) {
                const text = el.textContent?.toLowerCase() || '';
                if (text.includes('guest') || text.includes('as a guest')) {
                    return true;
                }
            }
            return false;
        });

        if (guestText) {
            return 'guest_option';
        }

        // If neither is found, we might be already at the join screen
        return 'direct_join';
    }

    /**
     * Join the meeting as a guest
     * @private
     */
    private async _joinAsGuest(): Promise<void> {
        if (!this.page) throw new Error('Page not initialized');

        console.log('Attempting to join as guest...');

        // Look for the guest option button
        const guestButton = await this.page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('button, div[role="button"]'));
            for (const el of elements) {
                const text = el.textContent?.toLowerCase() || '';
                if (text.includes('guest') || text.includes('as a guest')) {
                    // Click this button
                    (el as HTMLElement).click();
                    return true;
                }
            }
            return false;
        });

        if (!guestButton) {
            console.log('Guest option not found. May already be at join screen or guest access is not allowed');
            return;
        }

        // Wait for name input field
        await this.page.waitForSelector('input[type="text"]', { visible: true, timeout: 10000 })
            .catch(() => console.log('Name input field not found. Meeting might allow anonymous access.'));

        // Enter guest name if name field exists
        const nameInput = await this.page.$('input[type="text"]');
        if (nameInput) {
            await nameInput.click({ clickCount: 3 }); // Select all text in the field
            await nameInput.type(this.options.guestName);
            console.log(`Entered guest name: ${this.options.guestName}`);
        }

        // Look for "Ask to join" or "Join" button
        const joinButton = await this.page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('button, div[role="button"]'));
            for (const el of elements) {
                const text = el.textContent?.toLowerCase() || '';
                if (text.includes('ask to join') || text.includes('join meeting')) {
                    // Click this button
                    (el as HTMLElement).click();
                    return true;
                }
            }
            return false;
        });

        if (!joinButton) {
            console.log('Join button not found after entering guest name');
        } else {
            console.log('Clicked join button as guest');

            // Wait a moment for the join process to start
            // Using a custom delay since waitForTimeout might not be available in all Puppeteer versions
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    /**
     * Start recording the meeting
     * @param duration Optional duration in minutes (undefined for unlimited)
     * @returns Path to the recording file
     */
    public async startRecording(duration?: number): Promise<string> {
        if (!this.page) {
            throw new Error('Browser not initialized. Call joinMeeting first.');
        }

        if (this.isRecording) {
            console.log('Already recording');
            return this.recordingFile || '';
        }

        // Check if ffmpeg is installed
        const ffmpegAvailable = await this._checkFfmpeg();
        if (!ffmpegAvailable) {
            throw new Error('ffmpeg is required for recording but is not available');
        }

        try {
            // Setup recording configuration
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            this.recordingFile = path.join(
                this.options.recordingPath,
                `meet-recording-${timestamp}.mp4`
            );

            // Create recorder with configuration
            const recorderConfig: RecorderConfig = {
                followNewTab: true,
                fps: 30,
                videoCodec: 'h264',
                aspectRatio: '16:9',
                recordDurationLimit: duration && duration > 0 ? duration * 60 * 1000 : undefined,// Convert minutes to ms, undefined for unlimited
                ffmpeg_Path: null,
                audioSource: 'tab'
            };

            this.recorder = new PuppeteerScreenRecorder(this.page, recorderConfig);

            // Start recording
            console.log('Starting recording...');
            await this.recorder.start(this.recordingFile);
            this.isRecording = true;

            console.log(`Recording started ${(duration && duration > 0) ? `for ${duration} minutes` : 'with no time limit'}`);
            return this.recordingFile;
        }
        catch (error) {
            console.error('Failed to start recording:', error);
            throw error;
        }
    }

    /**
     * Stop the current recording
     * @returns Path to the recording file or null if no recording
     */
    public async stopRecording(): Promise<string | null> {
        if (!this.isRecording || !this.recorder) {
            console.log('Not currently recording');
            return null;
        }

        try {
            const recordingPath = this.recordingFile;
            console.log('Stopping recording...');

            // Set these variables first to prevent race conditions
            const tempRecorder = this.recorder;
            this.recorder = null;
            this.isRecording = false;
            this.recordingFile = null;

            // Stop the recording
            await tempRecorder.stop();

            console.log(`Recording stopped and saved to: ${recordingPath}`);
            return recordingPath;
        }
        catch (error) {
            console.error('Error stopping recording:', error);
            return null;
        }
    }

    /**
     * Close the browser and clean up
     */
    public async close(): Promise<void> {
        if (this.isRecording) {
            await this.stopRecording();
        }

        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
            console.log('Browser closed');
        }
    }

    // -------------------- PRIVATE METHODS -------------------- //

    /**
     * Handle Google login if needed
     * @private
     */
    private async _handleLogin(): Promise<void> {
        if (!this.page) return;

        // Check if login is required
        const loginButton = await this.page.$('a[href^="https://accounts.google.com/signin/"]');
        if (!loginButton) {
            return; // No login required
        }

        console.log('Login required');

        if (!this.options.email || !this.options.password) {
            throw new Error('Google login required but credentials not provided');
        }

        // Click the login button
        await loginButton.click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle2' });

        // Enter email
        await this.page.waitForSelector('input[type="email"]');
        await this.page.type('input[type="email"]', this.options.email);
        await this.page.click('#identifierNext');

        // Enter password
        await this.page.waitForSelector('input[type="password"]', { visible: true });
        await this.page.type('input[type="password"]', this.options.password);
        await this.page.click('#passwordNext');

        // Wait for login to complete
        await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
        console.log('Login completed');
    }

    /**
     * Configure camera and microphone settings
     * @private
     */
    private async _configureDevices(): Promise<void> {
        if (!this.page) return;

        // Handle camera toggle
        const cameraToggle = await this.page.$('[data-is-muted="false"][aria-label*="camera" i], [data-is-muted="false"][aria-label*="Camera" i]');
        if (this.options.cameraEnabled !== !!cameraToggle) {
            const cameraButton = await this.page.$('[aria-label*="camera" i], [aria-label*="Camera" i]');
            if (cameraButton) {
                await cameraButton.click();
                console.log(`Camera ${this.options.cameraEnabled ? 'enabled' : 'disabled'}`);
            }
        }

        // Handle microphone toggle
        const micToggle = await this.page.$('[data-is-muted="false"][aria-label*="microphone" i], [data-is-muted="false"][aria-label*="Microphone" i]');
        if (this.options.micEnabled !== !!micToggle) {
            const micButton = await this.page.$('[aria-label*="microphone" i], [aria-label*="Microphone" i]');
            if (micButton) {
                await micButton.click();
                console.log(`Microphone ${this.options.micEnabled ? 'enabled' : 'disabled'}`);
            }
        }
    }

    /**
     * Find and click the join meeting button
     * @private
     */
    private async _clickJoinButton(): Promise<boolean> {
        if (!this.page) throw new Error('Page not initialized');

        console.log('Looking for join button...');

        // List of possible join button selectors
        const joinSelectors = [
            'div[role="button"][aria-label*="join"]',
            'div[role="button"][aria-label*="Join"]',
            'button[aria-label*="join"]',
            'button[aria-label*="Join"]',
            'span[jsname][role="button"]'
        ];

        // Try each selector
        for (const selector of joinSelectors) {
            const buttons = await this.page.$$(selector);

            for (const button of buttons) {
                try {
                    await button.click();
                    console.log('Join button clicked');
                    return true;
                } catch (err) {
                    // Continue to next button
                }
            }
        }

        // Fallback: look for buttons by text content
        console.log('Trying to find join button by text content...');
        const buttons = await this.page.$$('button, div[role="button"], span[role="button"]');

        for (const button of buttons) {
            const text = await this.page.evaluate(el => el.innerText.toLowerCase(), button);
            if (text.includes('join') || text.includes('ask to join')) {
                await button.click();
                console.log('Join button found through text content');
                return true;
            }
        }

        throw new Error('Could not find any join button');
    }
}

// Example usage
// async function example(): Promise<void> {
//   try {
//     // Method 1: Join with Google account
//     const meetBotWithLogin = new GoogleMeetAutomation({
//       email: 'your.email@gmail.com',      // Replace with your email
//       password: 'your-password',          // Replace with your password
//       recordingPath: './meet-recordings',
//       cameraEnabled: false,
//       micEnabled: false
//     });

//     // Method 2: Join as guest (without login)
//     const meetBotAsGuest = new GoogleMeetAutomation({
//       guestName: 'John Visitor',          // Name to display in the meeting
//       recordingPath: './meet-recordings',
//       cameraEnabled: false,
//       micEnabled: false
//     });

//     // Choose which one to use
//     const meetBot = meetBotAsGuest; // or meetBotWithLogin

//     // Join a meeting
//     const meetingUrl = 'https://meet.google.com/abc-defg-hij'; // Replace with actual meeting link
//     const joined = await meetBot.joinMeeting(meetingUrl);

//     if (joined) {
//       // Start recording without time limit (unlimited)
//       await meetBot.startRecording();

//       // If you want to stop recording after a specific time:
//       await new Promise(resolve => setTimeout(resolve, 30 * 60 * 1000)); // Wait 30 minutes
//       await meetBot.stopRecording();
//     }

//     // Close everything when done
//     await meetBot.close();
//   } 
//   catch (error) {
//     console.error('Error in example:', error);
//   }
// }

// Export the class
export default GoogleMeetAutomation;