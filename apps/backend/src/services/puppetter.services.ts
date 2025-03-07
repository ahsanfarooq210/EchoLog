import puppeteer from "puppeteer";
import puppeteerExtra from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { Browser, Page } from "puppeteer";
import fs from "fs";
import path from "path";
import { PuppeteerScreenRecorder } from "puppeteer-screen-recorder";
import { exec } from "child_process";
import { promisify } from "util";
import * as UAParser from "ua-parser-js"; // Add this dependency

// Add stealth plugin to puppeteer-extra with enhanced options
const stealthPlugin = StealthPlugin();
// Enable enhanced evasion techniques
stealthPlugin.enabledEvasions.add('chrome.runtime');
stealthPlugin.enabledEvasions.add('iframe.contentWindow');
stealthPlugin.enabledEvasions.add('media.codecs');
stealthPlugin.enabledEvasions.add('navigator.languages');
stealthPlugin.enabledEvasions.add('navigator.permissions');
stealthPlugin.enabledEvasions.add('navigator.webdriver');
stealthPlugin.enabledEvasions.add('sourceurl');
stealthPlugin.enabledEvasions.add('webgl.vendor');
stealthPlugin.enabledEvasions.add('window.outerdimensions');

puppeteerExtra.use(stealthPlugin);

// Add missing waitForTimeout to Page interface
declare module "puppeteer" {
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
  /** Path to Chrome executable (optional) */
  executablePath?: string | null;
  /** Path to user data directory for persistent sessions */
  userDataDir?: string | null;
  /** Additional browser arguments */
  additionalArgs?: string[];
  /** Random delay between actions (milliseconds) */
  actionDelay?: {min: number, max: number};
  /** Use realistic mouse movements */
  useRealisticMovements?: boolean;
  /** Randomize viewport on each session */
  randomizeViewport?: boolean;
  /** Use a specific locale */
  locale?: string;
  /** Use a specific timezone */
  timezone?: string;
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
 * Class to automate joining and recording Google Meet meetings with enhanced stealth
 */
class GoogleMeetAutomation {
  private options: Required<GoogleMeetOptions> & { guestName: string };
  private browser: Browser | null = null;
  private page: Page | null = null;
  private recorder: PuppeteerScreenRecorder | null = null;
  private isRecording: boolean = false;
  private recordingFile: string | null = null;
  private userAgent: string = "";
  private sessionToken: string = "";

  /**
   * Create a new Google Meet automation instance with enhanced stealth
   * @param options Configuration options
   */
  constructor(options: GoogleMeetOptions = {}) {
    // Generate random session token
    this.sessionToken = Math.random().toString(36).substring(2, 15);
    
    // Set default options with improved stealth settings
    this.options = {
      email: null,
      password: null,
      guestName: `User ${Math.floor(Math.random() * 1000)}`, // Randomized name by default
      recordingPath: path.resolve(process.cwd(), "recordings"),
      cameraEnabled: false,
      micEnabled: false,
      headless: false,
      executablePath: null,
      userDataDir: null,
      additionalArgs: [],
      actionDelay: {min: 500, max: 2000}, // Random delay between actions
      useRealisticMovements: true,
      randomizeViewport: true,
      locale: this._getRandomLocale(),
      timezone: this._getRandomTimezone(),
      ...options,
    };

    // Create recording directory
    if (!fs.existsSync(this.options.recordingPath)) {
      fs.mkdirSync(this.options.recordingPath, { recursive: true });
    }
  }

  /**
   * Get a random realistic browser viewport
   * @private
   */
  private _getRandomViewport(): {width: number, height: number} {
    // Common screen resolutions
    const resolutions = [
      {width: 1366, height: 768},  // Most common
      {width: 1920, height: 1080}, // Full HD
      {width: 1440, height: 900},  // Mac common
      {width: 1536, height: 864},  // Common laptop
      {width: 1280, height: 720},  // HD
      {width: 1680, height: 1050}, // Mac larger
      {width: 1600, height: 900},  // Laptop common
    ];
    
    // Return a random resolution with a slight variation to appear more natural
    const base = resolutions[Math.floor(Math.random() * resolutions.length)];
    // Add slight variation to appear less automated (±20px)
    const variation = Math.floor(Math.random() * 40) - 20;
    
    return {
      width: Math.max(1024, base.width + variation),
      height: Math.max(768, base.height + variation)
    };
  }

  /**
   * Get a realistic random user agent
   * @private
   */
  private _getRandomUserAgent(): string {
    const recentChromeVersions = ['121', '120', '119', '118', '117'];
    const osVersions = {
      'Windows': ['10.0', '11.0'],
      'Macintosh': ['10_15_7', '11_0_0', '12_0_0', '13_0_0'],
      'Linux': ['X11']
    };
    
    // Choose OS
    const osKeys = Object.keys(osVersions);
    const os = osKeys[Math.floor(Math.random() * osKeys.length)];
    
    // Get OS versions for the selected OS
    const versions = osVersions[os as keyof typeof osVersions];
    const osVersion = versions[Math.floor(Math.random() * versions.length)];
    
    // Chrome version and build
    const chromeVersion = recentChromeVersions[Math.floor(Math.random() * recentChromeVersions.length)];
    const chromeBuild = Math.floor(Math.random() * 9999);
    
    // WebKit version (calculated based on Chrome version)
    const webkitVersion = 537 + Math.floor(Math.random() * 36);
    
    // Generate specific user agent based on OS
    let userAgent = '';
    
    if (os === 'Windows') {
      userAgent = `Mozilla/5.0 (Windows NT ${osVersion}; Win64; x64) AppleWebKit/${webkitVersion}.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.${chromeBuild}.${Math.floor(Math.random() * 100)} Safari/${webkitVersion}.36`;
    } else if (os === 'Macintosh') {
      userAgent = `Mozilla/5.0 (Macintosh; Intel Mac OS X ${osVersion}) AppleWebKit/${webkitVersion}.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.${chromeBuild}.${Math.floor(Math.random() * 100)} Safari/${webkitVersion}.36`;
    } else {
      userAgent = `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/${webkitVersion}.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.${chromeBuild}.${Math.floor(Math.random() * 100)} Safari/${webkitVersion}.36`;
    }
    
    return userAgent;
  }

  /**
   * Get a random time zone string
   * @private
   */
  private _getRandomTimezone(): string {
    const timezones = [
      'America/New_York',
      'America/Los_Angeles',
      'America/Chicago',
      'Europe/London',
      'Europe/Paris',
      'Asia/Tokyo',
      'Asia/Singapore',
      'Australia/Sydney',
      'Pacific/Auckland'
    ];
    return timezones[Math.floor(Math.random() * timezones.length)];
  }

  /**
   * Get a random locale string
   * @private
   */
  private _getRandomLocale(): string {
    const locales = [
      'en-US',
      'en-GB',
      'en-CA',
      'en-AU',
      'fr-FR',
      'de-DE',
      'es-ES',
      'it-IT',
      'ja-JP'
    ];
    return locales[Math.floor(Math.random() * locales.length)];
  }

  /**
   * Generate realistic random delay
   * @private
   */
  private async _randomDelay(): Promise<void> {
    const {min, max} = this.options.actionDelay;
    const delay = Math.floor(Math.random() * (max - min + 1) + min);
    await new Promise<void>((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Check if ffmpeg is installed and available
   * @private
   */
  private async _checkFfmpeg(): Promise<boolean> {
    try {
      await execAsync("ffmpeg -version");
      return true;
    } catch (error) {
      console.error("ffmpeg is not installed or not available in PATH");
      console.error("Please install ffmpeg to use the recording feature");
      return false;
    }
  }

  /**
   * Simulates realistic human-like mouse movement to an element
   * @private
   */
  private async _humanLikeClick(selector: string): Promise<void> {
    if (!this.page || !this.options.useRealisticMovements) {
      // If no page or realistic movements disabled, just click directly
      await this.page?.click(selector);
      return;
    }

    // Get element position
    const elementHandle = await this.page.$(selector);
    if (!elementHandle) {
      throw new Error(`Element not found: ${selector}`);
    }

    const box = await elementHandle.boundingBox();
    if (!box) {
      throw new Error(`Cannot get bounding box for element: ${selector}`);
    }

    // Get current mouse position or use a default
    const currentPosition = await this.page.evaluate(() => {
      return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    });

    // Calculate target position (center of element with slight randomness)
    const targetX = box.x + box.width / 2 + (Math.random() * 10 - 5);
    const targetY = box.y + box.height / 2 + (Math.random() * 10 - 5);

    // Generate random bezier curve control points for natural movement
    const control1X = currentPosition.x + (targetX - currentPosition.x) / 3 + (Math.random() * 100 - 50);
    const control1Y = currentPosition.y + (targetY - currentPosition.y) / 3 + (Math.random() * 100 - 50);
    const control2X = currentPosition.x + 2 * (targetX - currentPosition.x) / 3 + (Math.random() * 100 - 50);
    const control2Y = currentPosition.y + 2 * (targetY - currentPosition.y) / 3 + (Math.random() * 100 - 50);

    // Move mouse in small steps along the curve to simulate human movement
    const steps = 10 + Math.floor(Math.random() * 15); // Random number of steps between 10-25

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const t1 = 1 - t;

      // Bezier curve formula for smooth movement
      const x = Math.pow(t1, 3) * currentPosition.x
        + 3 * Math.pow(t1, 2) * t * control1X
        + 3 * t1 * Math.pow(t, 2) * control2X
        + Math.pow(t, 3) * targetX;
      
      const y = Math.pow(t1, 3) * currentPosition.y
        + 3 * Math.pow(t1, 2) * t * control1Y
        + 3 * t1 * Math.pow(t, 2) * control2Y
        + Math.pow(t, 3) * targetY;

      await this.page.mouse.move(x, y);
      
      // Small random delay between movements
      await new Promise<void>(resolve => setTimeout(resolve, Math.random() * 10 + 5));
    }

    // Slight pause before clicking like a human would
    await this._randomDelay();
    
    // Click the element (with random offset within the element)
    await this.page.mouse.click(
      targetX + (Math.random() * 6 - 3),
      targetY + (Math.random() * 6 - 3)
    );
  }

  /**
   * Type text like a human with variable speed and occasional mistakes
   * @private
   */
  private async _humanLikeType(selector: string, text: string): Promise<void> {
    if (!this.page) return;

    // Click on the input field first
    await this._humanLikeClick(selector);
    
    // Clear existing text
    await this.page.click(selector, { clickCount: 3 });
    await this.page.keyboard.press('Backspace');
    
    // Type with variable speed and occasional mistakes
    const chars = text.split('');
    
    for (let i = 0; i < chars.length; i++) {
      // Decide if we'll make a typo (2% chance)
      const makeTypo = Math.random() < 0.02;
      
      if (makeTypo && i < chars.length - 2) {
        // Type a wrong character
        const wrongChar = String.fromCharCode(
          chars[i].charCodeAt(0) + Math.floor(Math.random() * 5) - 2
        );
        await this.page.keyboard.type(wrongChar);
        
        // Wait a bit to "notice" the error
        await new Promise<void>((resolve) => setTimeout(resolve, 500 + Math.random() * 200));
        
        // Delete the wrong character
        await this.page.keyboard.press('Backspace');
        
        // Wait a bit before continuing
        await new Promise<void>((resolve) => setTimeout(resolve, 200 + Math.random() * 300));
      }
      
      // Type the correct character
      await this.page.keyboard.type(chars[i]);
      
      // Random delay between keystrokes (30-200ms)
      const delay = 30 + Math.random() * 170;
      await new Promise<void>((resolve) => setTimeout(resolve, delay));
      
      // Occasionally pause for a longer time (1% chance)
      if (Math.random() < 0.01) {
        await new Promise<void>((resolve) => setTimeout(resolve, 500 + Math.random() * 1000));
      }
    }
  }

  /**
   * Launch the browser with enhanced stealth settings
   */
  public async launchBrowser(): Promise<void> {
    console.log("Launching browser with enhanced stealth...");

    try {
      // Generate a realistic user agent for this session
      this.userAgent = this._getRandomUserAgent();
      console.log(`Using user agent: ${this.userAgent}`);

      // Get random viewport dimensions if enabled
      const viewport = this.options.randomizeViewport ? 
        this._getRandomViewport() : { width: 1920, height: 1080 };

      // Enhanced browser arguments with hardware fingerprint randomization
      const defaultArgs = [
        "--use-fake-ui-for-media-stream",
        "--use-fake-device-for-media-stream",
        "--disable-blink-features=AutomationControlled",
        "--disable-features=IsolateOrigins,site-per-process",
        `--window-size=${viewport.width},${viewport.height}`,
        "--disable-extensions",
        "--disable-translate",
        "--disable-sync",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-infobars", 
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-web-security",
        `--user-agent=${this.userAgent}`,
        `--lang=${this.options.locale}`,
        `--timezone=${this.options.timezone}`,
        "--disable-notifications",
        "--disable-popup-blocking",
        "--start-maximized",
        
        // Hardware fingerprinting protection
        "--disable-2d-canvas-clip-aa",
        "--disable-2d-canvas-image-chromium",
        "--disable-accelerated-2d-canvas",
        "--disable-webgl",
        "--disable-webgl2",
        "--disable-reading-from-canvas",
        
        // Additional fingerprinting protection
        "--disable-features=AudioServiceOutOfProcess",
        "--disable-breakpad",
        "--disable-component-extensions-with-background-pages",
        "--disable-features=TranslateUI",
        "--disable-renderer-backgrounding",
        "--disable-backgrounding-occluded-windows",
      ];

      const args = [...defaultArgs, ...(this.options.additionalArgs || [])];

      const launchOptions: any = {
        headless: this.options.headless,
        args,
        defaultViewport: viewport,
        ignoreDefaultArgs: ["--mute-audio", "--enable-automation"],
        timeout: 120000,
        ignoreHTTPSErrors: true,
      };

      if (this.options.executablePath) {
        launchOptions.executablePath = this.options.executablePath;
      }

      if (this.options.userDataDir) {
        launchOptions.userDataDir = this.options.userDataDir;
      }

      this.browser = await puppeteerExtra.launch(launchOptions);
      
      // Get browser version for more accurate fingerprinting
      const version = await this.browser.version();
      console.log(`Browser version: ${version}`);
      
      this.page = await this.browser.newPage();
      
      // Set viewport
      await this.page.setViewport(viewport);
      
      // Set user agent
      await this.page.setUserAgent(this.userAgent);
      
      // Parse user agent to get more accurate platform information
      const parser = new UAParser.UAParser(this.userAgent);
      const browser = parser.getBrowser();
      const os = parser.getOS();
      const ua = parser.getUA();
      
      // Set more realistic headers
      await this.page.setExtraHTTPHeaders({
        'Accept-Language': `${this.options.locale},en-US;q=0.9,en;q=0.8`,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'max-age=0',
        'Connection': 'keep-alive',
        'Sec-Ch-Ua': `"${browser.name}";v="${browser.major}", "Not A(Brand";v="99"`,
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': `"${os.name}"`,
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      });

      // Set cookies to appear more like a regular user
      // Generate realistic Google cookies
      const cookieExpiryDate = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 days from now
      
      await this.page.setCookie(
        {
          name: "CONSENT",
          value: `YES+cb.${Math.floor(Date.now()/1000)}-${Math.floor(Math.random() * 20)}-p0-s0-v0`,
          domain: ".google.com",
          path: "/",
          expires: cookieExpiryDate / 1000,
        },
        {
          name: "NID",
          value: this._generateRandomNIDValue(),
          domain: ".google.com",
          path: "/",
          expires: cookieExpiryDate / 1000,
        },
        {
          name: "1P_JAR",
          value: `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.${Math.floor(Math.random() * 10000)}`,
          domain: ".google.com",
          path: "/",
          expires: (Date.now() + (7 * 24 * 60 * 60 * 1000)) / 1000, // 7 days
        }
      );

      // Enhanced browser fingerprint masking
      await this.page.evaluateOnNewDocument(() => {
        // --------------------------------
        // Hide WebDriver
        Object.defineProperty(navigator, 'webdriver', {
          get: () => false,
          configurable: true
        });

        // --------------------------------
        // Add Chrome runtime
        // @ts-ignore
        window.chrome = {
          runtime: {
            id: Math.random().toString(36).substring(2, 15),
            connect: () => ({}),
          },
        };

        // --------------------------------
        // Modify plugin behavior
        const originalPlugins = Object.getOwnPropertyDescriptor(Navigator.prototype, 'plugins');
        if (originalPlugins) {
          // Generate random number of plugins between 5-10
          const numPlugins = Math.floor(Math.random() * 6) + 5;
          
          // Create a fake plugins array
          const pluginsData = Array(numPlugins).fill(null).map((_, i) => ({
            name: `Plugin ${i+1}`,
            description: `Description for Plugin ${i+1}`,
            filename: `plugin${i+1}.dll`,
            length: Math.floor(Math.random() * 10) + 1
          }));
          
          // Override plugins with proxy
          Object.defineProperty(Navigator.prototype, 'plugins', {
            get: function() {
              // Return a Proxy that behaves like a PluginArray
              const fakePlugins = Object.create(PluginArray.prototype);
              
              // Add length property
              Object.defineProperty(fakePlugins, 'length', {
                get: () => pluginsData.length,
                enumerable: true,
                configurable: true
              });
              
              // Create methods
              fakePlugins.item = (index: number) => fakePlugins[index];
              fakePlugins.namedItem = (name: string) => {
                const found = pluginsData.find(p => p.name === name);
                return found ? fakePlugins[pluginsData.indexOf(found)] : null;
              };
              fakePlugins.refresh = () => {};
              
              // Add individual plugins
              pluginsData.forEach((plugin, index) => {
                Object.defineProperty(fakePlugins, index, {
                  get: () => {
                    const fakePlugin = Object.create(Plugin.prototype);
                    Object.defineProperty(fakePlugin, 'name', { get: () => plugin.name });
                    Object.defineProperty(fakePlugin, 'description', { get: () => plugin.description });
                    Object.defineProperty(fakePlugin, 'filename', { get: () => plugin.filename });
                    Object.defineProperty(fakePlugin, 'length', { get: () => plugin.length });
                    
                    return fakePlugin;
                  },
                  enumerable: true,
                  configurable: true
                });
                
                Object.defineProperty(fakePlugins, plugin.name, {
                  get: () => fakePlugins[index],
                  enumerable: false,
                  configurable: true
                });
              });
              
              return fakePlugins;
            },
            enumerable: true,
            configurable: true
          });
        }

        // --------------------------------
        // Languages
        const originalLanguages = Object.getOwnPropertyDescriptor(Navigator.prototype, 'languages');
        if (originalLanguages) {
          Object.defineProperty(Navigator.prototype, 'languages', {
            get: function() {
              const preferredLang = navigator.language || 'en-US';
              const langRegion = preferredLang.split('-')[0];
              
              // Create a realistic language list based on preferred language
              const langArray = [
                preferredLang,
                `${langRegion}`,
                'en-US',
                'en'
              ];
              
              return langArray;
            },
            enumerable: true,
            configurable: true
          });
        }

        // --------------------------------
        // Add realistic permissions API behavior
        const originalPermissions = window.navigator.permissions;
        if (originalPermissions) {
          const permissions = {};
          
          // Store permission states for different features
          const permissionState = {
            camera: 'prompt',
            microphone: 'prompt',
            notifications: 'prompt',
            persistentStorage: 'granted',
            geolocation: 'prompt'
          };
          
          // Mock the query method
          window.navigator.permissions.query = function(parameters: PermissionDescriptor) {
            // Return a mock result
            return Promise.resolve({
              state: permissionState[parameters.name as keyof typeof permissionState] || 'prompt',
              name: parameters.name,
              onchange: null,
              addEventListener: () => {},
              removeEventListener: () => {},
              dispatchEvent: () => false,
            } as PermissionStatus);
          };
        }

        // --------------------------------
        // Add natural user timing values
        if (window.performance && window.performance.timing) {
          const now = Date.now();
          const navigationStart = now - Math.floor(Math.random() * 60000) - 10000; // Random start time in the last minute
          
          // Slightly randomize timing values
          // @ts-ignore
          const originalTiming = window.performance.timing;
          const naturalTimingValues = {
            navigationStart: navigationStart,
            unloadEventStart: navigationStart + Math.floor(Math.random() * 5),
            unloadEventEnd: navigationStart + Math.floor(Math.random() * 10) + 5,
            redirectStart: 0,
            redirectEnd: 0,
            fetchStart: navigationStart + Math.floor(Math.random() * 20) + 10,
            domainLookupStart: navigationStart + Math.floor(Math.random() * 30) + 20,
            domainLookupEnd: navigationStart + Math.floor(Math.random() * 40) + 40,
            connectStart: navigationStart + Math.floor(Math.random() * 50) + 80,
            connectEnd: navigationStart + Math.floor(Math.random() * 60) + 120,
            secureConnectionStart: navigationStart + Math.floor(Math.random() * 65) + 125,
            requestStart: navigationStart + Math.floor(Math.random() * 70) + 160,
            responseStart: navigationStart + Math.floor(Math.random() * 80) + 200,
            responseEnd: navigationStart + Math.floor(Math.random() * 90) + 280,
            domLoading: navigationStart + Math.floor(Math.random() * 100) + 320,
            domInteractive: navigationStart + Math.floor(Math.random() * 150) + 380,
            domContentLoadedEventStart: navigationStart + Math.floor(Math.random() * 160) + 540,
            domContentLoadedEventEnd: navigationStart + Math.floor(Math.random() * 170) + 560,
            domComplete: navigationStart + Math.floor(Math.random() * 200) + 600,
            loadEventStart: navigationStart + Math.floor(Math.random() * 210) + 650,
            loadEventEnd: navigationStart + Math.floor(Math.random() * 220) + 700,
          };
          
          // Override timing values
          for (const key in naturalTimingValues) {
            if (Object.prototype.hasOwnProperty.call(naturalTimingValues, key)) {
              // @ts-ignore
              Object.defineProperty(originalTiming, key, {
                // @ts-ignore
                get: () => naturalTimingValues[key],
                configurable: true
              });
            }
          }
        }

        // --------------------------------
        // Add consistent hardware info
        Object.defineProperty(navigator, 'hardwareConcurrency', {
          get: () => {
            // Return a realistic number of CPU cores (4, 6, 8, 12, or 16)
            const cores = [4, 6, 8, 12, 16];
            return cores[Math.floor(Math.random() * cores.length)];
          },
          enumerable: true,
          configurable: true
        });

        Object.defineProperty(navigator, 'deviceMemory', {
          get: () => {
            // Return a realistic amount of RAM (4, 8, 16, or 32)
            const memory = [4, 8, 16, 32];
            return memory[Math.floor(Math.random() * memory.length)];
          },
          enumerable: true,
          configurable: true
        });

        // --------------------------------
        // Media devices
        const originalGetUserMedia = navigator.mediaDevices?.getUserMedia;
        if (originalGetUserMedia) {
          navigator.mediaDevices.getUserMedia = function(constraints) {
            // Add a small delay to simulate real device access
            return new Promise((resolve, reject) => {
              setTimeout(() => {
                if (originalGetUserMedia) {
                  originalGetUserMedia.call(navigator.mediaDevices, constraints)
                    .then(resolve)
                    .catch(reject);
                } else {
                  reject(new Error('getUserMedia is not supported'));
                }
              }, 100 + Math.random() * 200);
            });
          };
        }

        // --------------------------------
        // Override clipboard API
        if (navigator.clipboard) {
          const originalClipboard = navigator.clipboard;
          // @ts-ignore
          navigator.clipboard = {
            ...originalClipboard,
            readText: () => {
              return new Promise(resolve => {
                setTimeout(() => {
                  resolve('');
                }, 100 + Math.random() * 200);
              });
            },
            // Make sure other clipboard methods behave naturally
            writeText: (text: string) => {
              return new Promise(resolve => {
                setTimeout(() => {
                  resolve(void 0);
                }, 100 + Math.random() * 200);
              });
            }
          };
        }

        // --------------------------------
        // Canvas fingerprinting protection
        const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
        const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
        
        // Add very slight noise to canvas data to prevent fingerprinting
        HTMLCanvasElement.prototype.toDataURL = function(type, quality) {
          const result = originalToDataURL.apply(this, [type, quality]);
          
          // Only modify if it's being used for fingerprinting (typically small canvases)
          if (this.width <= 500 && this.height <= 200) {
            // Get the context to check what's been drawn
            const ctx = this.getContext('2d');
            if (ctx) {
              // Check if canvas has content by sampling a few pixels
              const pixelData = ctx.getImageData(0, 0, 1, 1).data;
              const hasContent = pixelData.some(val => val !== 0);
              
              if (hasContent) {
                return result.replace(/.$/, (c) => {
                  // Change the last character slightly to add noise
                  const code = c.charCodeAt(0);
                  return String.fromCharCode(code + (code % 10 === 0 ? 1 : -1));
                });
              }
            }
          }
          return result;
        };
        
        CanvasRenderingContext2D.prototype.getImageData = function(sx, sy, sw, sh) {
          const imageData = originalGetImageData.apply(this, [sx, sy, sw, sh]);
          
          // Only add noise for small regions that might be used for fingerprinting
          if (sw * sh <= 500) {
            const data = imageData.data;
            // Modify 1 in every 1000 pixels slightly
            for (let i = 0; i < data.length; i += 4) {
              if (Math.random() < 0.001) {
                data[i] = Math.max(0, Math.min(255, data[i] + (Math.random() < 0.5 ? 1 : -1)));
                data[i+1] = Math.max(0, Math.min(255, data[i+1] + (Math.random() < 0.5 ? 1 : -1)));
                data[i+2] = Math.max(0, Math.min(255, data[i+2] + (Math.random() < 0.5 ? 1 : -1)));
              }
            }
          }
          
          return imageData;
        };

        // Add natural-looking browser history length
        Object.defineProperty(window.history, 'length', {
          get: () => Math.floor(Math.random() * 30) + 5,
          configurable: true
        });
      });

      console.log("Browser launched with enhanced stealth capabilities");
    } catch (error) {
      console.error("Browser launch failed:", error);
      throw new Error(`Failed to launch browser: ${error}`);
    }
  }

  /**
   * Generate a realistic Google NID cookie value
   * @private
   */
  private _generateRandomNIDValue(): string {
    // Generate a realistic NID cookie value
    const parts = [
      Math.floor(Math.random() * 900) + 100, // 3 digits
      '=',
      this._generateRandomString(10), // 10 random chars
      this._getRandomTimestamp(),
      this._generateRandomString(5),
    ];
    return parts.join('');
  }

  /**
   * Generate a random timestamp for cookie values
   * @private
   */
  private _getRandomTimestamp(): string {
    // Generate a timestamp within the last 30 days
    const now = Date.now();
    const timestamp = now - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000);
    return timestamp.toString().substring(0, 10);
  }

  /**
   * Generate a random alphanumeric string
   * @private
   */
  private _generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => 
      chars.charAt(Math.floor(Math.random() * chars.length))
    ).join('');
  }

  /**
   * Check if the "You can't join this video call" error is present
   * @private
   */
  private async _checkForCantJoinError(): Promise<boolean> {
    if (!this.page) return false;

    try {
      // Look for the error message using multiple detection methods
      const errorDetected = await this.page.evaluate(() => {
        // Method 1: Check for specific text content
        const errorTexts = [
          "You can't join this video call",
          "You can't join this meeting",
          "can't join this meeting",
          "unable to join",
          "meeting access blocked",
          "problem joining",
          "browser is unsupported"
        ];
        
        const pageText = document.body.innerText;
        for (const text of errorTexts) {
          if (pageText.includes(text)) {
            return { detected: true, method: 'text', message: text };
          }
        }
        
        // Method 2: Check for error elements
        const errorElements = document.querySelectorAll('.error-message, .error, [role="alert"]');
        if (errorElements.length > 0) {
          for (const el of errorElements) {
            const text = el.textContent?.trim() || '';
            if (text.length > 0) {
              return { detected: true, method: 'element', message: text };
            }
          }
        }
        
        // Method 3: Check for specific Google Meet error layout
        const meetErrorLayout = document.querySelector('.gvCayf, .NPEfkd, .RLmfJf');
        if (meetErrorLayout) {
          return { 
            detected: true, 
            method: 'layout',
            message: meetErrorLayout.textContent || 'Error layout detected'
          };
        }
        
        return { detected: false };
      });

      if (errorDetected.detected) {
        console.error(`Error detected (method: ${errorDetected.method}): ${errorDetected.message}`);
        
        // Take a screenshot of the error
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        await this.page.screenshot({
          path: path.join(
            this.options.recordingPath,
            `join-error-${timestamp}.png`
          ),
          fullPage: true
        });

        return true;
      }

      return false;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error checking for 'can't join' message:", errorMessage);
      return false;
    }
  }

  /**
   * Join a Google Meet meeting with enhanced stealth
   * @param meetingUrl The Google Meet URL
   * @returns True if successfully joined
   */
  public async joinMeeting(meetingUrl: string): Promise<boolean> {
    try {
      if (!this.browser) {
        await this.launchBrowser();
      }

      if (!this.page) {
        throw new Error("Browser initialization failed");
      }

      console.log(`Joining meeting: ${meetingUrl}`);

      // Randomize the approach strategy
      const strategies = [
        this._directJoinStrategy.bind(this),
        this._preloadStrategy.bind(this),
        this._googleAccountsStrategy.bind(this)
      ];
      
      // Try each strategy in random order until one works
      const shuffledStrategies = [...strategies].sort(() => Math.random() - 0.5);
      
      for (const strategy of shuffledStrategies) {
        try {
          const success = await strategy(meetingUrl);
          if (success) {
            return true;
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.log(`Strategy failed: ${errorMessage}`);
          // Continue to next strategy
        }
      }
      
      // If all strategies fail, try one last direct approach
      console.log("All strategies failed, trying direct approach as last resort");
      return await this._emergencyJoinStrategy(meetingUrl);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Failed to join meeting:", errorMessage);
      // Take error screenshot
      if (this.page) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        await this.page.screenshot({
          path: path.join(
            this.options.recordingPath,
            `join-error-${timestamp}.png`
          ),
          fullPage: true
        });
      }
      return false;
    }
  }

  /**
   * Direct join strategy - go straight to the meeting URL
   * @private
   */
  private async _directJoinStrategy(meetingUrl: string): Promise<boolean> {
    if (!this.page) return false;
    
    console.log("Trying direct join strategy...");
    
    // Go to the meeting URL with normal navigation
    await this.page.goto(meetingUrl, { 
      waitUntil: "networkidle2",
      timeout: 60000
    });
    
    // Add a small random delay to appear more human-like
    await this._randomDelay();
    
    // Check for errors
    const hasError = await this._checkForCantJoinError();
    if (hasError) {
      console.log("Direct strategy detected an error");
      return false;
    }
    
    // Check for login options
    const loginPrompt = await this._checkForLoginOptions();
    
    if (loginPrompt === "google_login") {
      if (this.options.email && this.options.password) {
        await this._handleLogin();
      } else {
        await this._joinAsGuest();
      }
    } else if (loginPrompt === "guest_option") {
      await this._joinAsGuest();
    }
    
    // Wait for meeting preparation screen
    const joinButtonVisible = await this._waitForJoinButton();
    if (!joinButtonVisible) {
      console.log("Join button not visible in direct strategy");
      return false;
    }
    
    // Configure devices
    await this._configureDevices();
    
    // Join the meeting
    await this._clickJoinButton();
    
    // Wait to confirm we're in the meeting
    const inMeeting = await this._confirmInMeeting();
    
    return inMeeting;
  }

  /**
   * Preload strategy - visit Google Meet homepage first, then navigate to the meeting
   * @private
   */
  private async _preloadStrategy(meetingUrl: string): Promise<boolean> {
    if (!this.page) return false;
    
    console.log("Trying preload strategy...");
    
    // First visit Google Meet homepage to set cookies and appear more natural
    await this.page.goto("https://meet.google.com/", { 
      waitUntil: "networkidle2",
      timeout: 30000
    });
    
    // Add random delay
    await new Promise<void>(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
    
    // Interact with the page naturally (scroll, move mouse)
    await this.page.evaluate(() => {
      window.scrollBy(0, 100 + Math.random() * 200);
    });
    
    await this._randomDelay();
    
    // Now navigate to the actual meeting
    console.log("Preloaded, now navigating to meeting URL...");
    await this.page.goto(meetingUrl, { 
      waitUntil: "networkidle2",
      timeout: 60000
    });
    
    // Check for errors
    const hasError = await this._checkForCantJoinError();
    if (hasError) {
      console.log("Preload strategy detected an error");
      return false;
    }
    
    // Check for login options
    const loginPrompt = await this._checkForLoginOptions();
    
    if (loginPrompt === "google_login") {
      if (this.options.email && this.options.password) {
        await this._handleLogin();
      } else {
        await this._joinAsGuest();
      }
    } else if (loginPrompt === "guest_option") {
      await this._joinAsGuest();
    }
    
    // Wait for meeting preparation screen
    const joinButtonVisible = await this._waitForJoinButton();
    if (!joinButtonVisible) {
      console.log("Join button not visible in preload strategy");
      return false;
    }
    
    // Configure devices
    await this._configureDevices();
    
    // Join the meeting
    await this._clickJoinButton();
    
    // Wait to confirm we're in the meeting
    const inMeeting = await this._confirmInMeeting();
    
    return inMeeting;
  }

  /**
   * Google Accounts strategy - go to accounts.google.com first, then to the meeting
   * @private
   */
  private async _googleAccountsStrategy(meetingUrl: string): Promise<boolean> {
    if (!this.page) return false;
    
    console.log("Trying Google Accounts strategy...");
    
    // Only use this strategy if we have credentials
    if (!this.options.email || !this.options.password) {
      console.log("Skipping Google Accounts strategy - no credentials");
      return false;
    }
    
    // Visit accounts.google.com first to establish Google cookies
    await this.page.goto("https://accounts.google.com/", { 
      waitUntil: "networkidle2",
      timeout: 30000
    });
    
    // Log in directly on accounts.google.com
    await this._handleLoginOnAccountsPage();
    
    // Add random delay after login
    await new Promise<void>(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
    
    // Now navigate to the meeting URL
    console.log("Logged in, now navigating to meeting URL...");
    await this.page.goto(meetingUrl, { 
      waitUntil: "networkidle2",
      timeout: 60000
    });
    
    // Check for errors
    const hasError = await this._checkForCantJoinError();
    if (hasError) {
      console.log("Google Accounts strategy detected an error");
      return false;
    }
    
    // Wait for meeting preparation screen
    const joinButtonVisible = await this._waitForJoinButton();
    if (!joinButtonVisible) {
      console.log("Join button not visible in Google Accounts strategy");
      return false;
    }
    
    // Configure devices
    await this._configureDevices();
    
    // Join the meeting
    await this._clickJoinButton();
    
    // Wait to confirm we're in the meeting
    const inMeeting = await this._confirmInMeeting();
    
    return inMeeting;
  }

  /**
   * Emergency join strategy - last resort with minimal stealth but maximum compatibility
   * @private
   */
  private async _emergencyJoinStrategy(meetingUrl: string): Promise<boolean> {
    if (!this.page) {
      // Close the current page and open a new one with basic settings
      if (this.browser) {
        const pages = await this.browser.pages();
        for (const p of pages) {
          await p.close();
        }
        this.page = await this.browser.newPage();
      } else {
        return false;
      }
    }
    
    console.log("Trying emergency join strategy...");
    
    // Set the most basic, universally accepted user agent
    await this.page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    
    // Clear all cookies
    const client = await this.page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');
    
    // Modify meeting code to use the web app approach
    let webAppUrl = meetingUrl;
    if (meetingUrl.includes('meet.google.com/')) {
      // Extract the meeting code
      const matches = meetingUrl.match(/meet\.google\.com\/([a-z0-9-]+)/i);
      if (matches && matches[1]) {
        const code = matches[1];
        webAppUrl = `https://meet.google.com/${code}?authuser=0`;
      }
    }
    
    // Go to the meeting URL with maximum compatibility
    await this.page.goto(webAppUrl, { 
      waitUntil: "networkidle2",
      timeout: 90000
    });
    
    // Generate a very basic guest name
    const emergencyName = `Guest ${Math.floor(Math.random() * 1000)}`;
    this.options.guestName = emergencyName;
    
    // Try to join as guest with basic approach
    await this._joinAsGuestEmergency();
    
    // Wait for any join button and click it
    const joinButtons = await this.page.$('button, div[role="button"], span[role="button"]');
    
    let clicked = false;
    
    if (joinButtons) {
      try {
        const text = await this.page.evaluate(el => el.innerText.toLowerCase(), joinButtons);
        if (text.includes('join') || text.includes('ask to join')) {
          await joinButtons.click();
          clicked = true;
        }
      } catch (e) {
        // continue to next button
      }
    }
    
    if (!clicked) {
      console.log("Could not find join button in emergency strategy");
      return false;
    }
    
    // Wait to see if we got into the meeting
    try {
      await this.page.waitForFunction(
        () => {
          return document.body.innerText.includes("You're in") || 
                 document.body.innerText.includes("You're the only one here") ||
                 document.querySelector('[aria-label*="chat" i]') !== null ||
                 document.querySelector('[aria-label*="participant" i]') !== null;
        },
        { timeout: 60000 }
      );
      
      console.log("Successfully joined with emergency strategy");
      return true;
    } catch (error) {
      console.log("Emergency strategy failed to confirm we're in the meeting");
      return false;
    }
  }

  /**
   * Check what type of login/join options are presented
   * @returns 'google_login', 'guest_option', or 'direct_join'
   * @private
   */
  private async _checkForLoginOptions(): Promise<
    "google_login" | "guest_option" | "direct_join"
  > {
    if (!this.page) throw new Error("Page not initialized");

    // Analyze the page content to detect login options
    return await this.page.evaluate(() => {
      // Check for Google login elements using multiple selectors
      const googleLoginSelectors = [
        'a[href^="https://accounts.google.com/signin/"]',
        'a[href*="accounts.google.com"]',
        'button:contains("Sign in")',
        'div[role="button"]:contains("Sign in")',
        'button:contains("Login")',
        '.login-with-google'
      ];
      
      for (const selector of googleLoginSelectors) {
        try {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            return "google_login";
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      // Check for guest option with multiple detection methods
      const guestCheckMethods = [
        // Method 1: Check for specific text
        () => {
          const guestTexts = ['guest', 'as a guest', 'join as', 'without an account'];
          const elements = Array.from(document.querySelectorAll('button, div[role="button"], a'));
          
          for (const el of elements) {
            const text = el.textContent?.toLowerCase() || '';
            if (guestTexts.some(guestText => text.includes(guestText))) {
              return true;
            }
          }
          return false;
        },
        
        // Method 2: Check for name input field
        () => {
          return document.querySelector('input[type="text"][placeholder*="name" i]') !== null;
        },
        
        // Method 3: Check for specific guest-related elements
        () => {
          return document.querySelector('.guest-option, .join-as-guest, [data-guest-join]') !== null;
        }
      ];
      
      for (const method of guestCheckMethods) {
        if (method()) {
          return "guest_option";
        }
      }

      // If neither is found, check if we might be already at the join screen
      const atJoinScreen = document.querySelector(
        '[aria-label*="join" i], [aria-label*="camera" i], [aria-label*="microphone" i]'
      ) !== null;
      
      return atJoinScreen ? "direct_join" : "google_login"; // Default to google_login if uncertain
    });
  }

  /**
   * Join the meeting as a guest with enhanced reliability
   * @private
   */
  private async _joinAsGuest(): Promise<void> {
    if (!this.page) throw new Error("Page not initialized");

    console.log("Attempting to join as guest...");

    // Look for the guest option button with multiple detection methods
    let guestButtonClicked = await this.page.evaluate(() => {
      // Method 1: Look for buttons with "guest" text
      const guestTexts = ['guest', 'as a guest', 'join without'];
      const buttons = Array.from(document.querySelectorAll('button, div[role="button"], a, span[role="button"]'));
      
      for (let i = 0; i < buttons.length; i++) {
        const el = buttons[i];
        const text = el.textContent?.toLowerCase() || '';
        if (guestTexts.some(guestText => text.includes(guestText))) {
          // Click this button
          (el as HTMLElement).click();
          return true;
        }
      }
      
      // Method 2: Look for specific guest-related elements
      const specificGuestElements = document.querySelectorAll(
        '.guest-option, .join-as-guest, [data-guest-join], [data-test-id*="guest"]'
      );
      
      if (specificGuestElements.length > 0) {
        (specificGuestElements[0] as HTMLElement).click();
        return true;
      }
      
      return false;
    });

    if (!guestButtonClicked) {
      // Try with general selectors
      try {
        const guestButton = await this.page.$('button:contains("guest"), div[role="button"]:contains("guest")');
        if (guestButton) {
          await guestButton.click();
          guestButtonClicked = true;
        }
      } catch (error) {
        console.log("No guest button found via selectors");
      }
    }

    if (!guestButtonClicked) {
      console.log("Guest option not found. May already be at join screen or guest access is not allowed");
      return;
    }

    // Wait for random delay to appear human
    await this._randomDelay();

    // Wait for name input field with multiple approaches
    await this.page.waitForFunction(() => {
      // Check for common input field patterns
      return document.querySelector('input[type="text"]') !== null ||
             document.querySelector('input[placeholder*="name" i]') !== null ||
             document.querySelector('input[aria-label*="name" i]') !== null;
    }, { timeout: 10000 }).catch(() => {
      console.log("Name input field not found. Meeting might allow anonymous access.");
    });

    // Enter guest name if name field exists
    const nameInput = await this.page.$('input[type="text"], input[placeholder*="name" i], input[aria-label*="name" i]');
    if (nameInput) {
      // Type like a human
      await this._humanLikeType('input[type="text"], input[placeholder*="name" i], input[aria-label*="name" i]', this.options.guestName);
      console.log(`Entered guest name: ${this.options.guestName}`);
    }

    // Random delay before clicking join
    await this._randomDelay();

    // Look for "Ask to join" or "Join meeting" button with enhanced methods
    const joinButtonClicked = await this.page.evaluate(() => {
      // Common join button text patterns
      const joinTexts = ['ask to join', 'join meeting', 'join now', 'continue', 'next'];
      
      // Method 1: Check buttons by text content
      const buttons = Array.from(document.querySelectorAll('button, div[role="button"], span[role="button"]'));
      
      for (let i = 0; i < buttons.length; i++) {
        const el = buttons[i];
        const text = el.textContent?.toLowerCase() || '';
        if (joinTexts.some(joinText => text.includes(joinText))) {
          // Click this button
          (el as HTMLElement).click();
          return true;
        }
      }
      
      // Method 2: Check common button classes and attributes
      const joinButtonSelectors = [
        '.join-button', 
        '[data-join-button]',
        'button[type="submit"]',
        '[aria-label*="join" i]',
        '.VfPpkd-LgbsSe'  // Common Google button class
      ];
      
      for (const selector of joinButtonSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          (elements[0] as HTMLElement).click();
          return true;
        }
      }
      
      return false;
    });

    if (!joinButtonClicked) {
      console.log("Join button not found after entering guest name");
    } else {
      console.log("Clicked join button as guest");
    }
  }

  /**
   * Emergency version of join as guest with minimal complexity
   * @private
   */
  private async _joinAsGuestEmergency(): Promise<void> {
    if (!this.page) return;
    
    try {
      // Try clicking any button with "guest" in it
      await this.page.evaluate(() => {
        const elements = document.querySelectorAll('button, div[role="button"], a');
        for (let i = 0; i < elements.length; i++) {
          const el = elements[i];
          if (((el.textContent || '').toLowerCase()).includes('guest')) {
            (el as HTMLElement).click();
          }
        }
      });
      
      // Wait a moment
      await new Promise<void>((resolve) => setTimeout(resolve, 1000));
      
      // Try to find and fill name input
      const nameInput = await this.page.$('input[type="text"]');
      if (nameInput) {
        await nameInput.click({ clickCount: 3 });
        await nameInput.type(this.options.guestName);
      }
      
      // Try to click join
      await this.page.evaluate(() => {
        const elements = document.querySelectorAll('button, div[role="button"], a');
        for (let i = 0; i < elements.length; i++) {
          const el = elements[i];
          const text = (el.textContent || '').toLowerCase();
          if (text.includes('join') || text.includes('continue') || text.includes('next')) {
            (el as HTMLElement).click();
          }
        }
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log("Emergency guest join encountered error:", errorMessage);
    }
  }

  /**
   * Start recording the meeting
   * @param duration Optional duration in minutes (undefined for unlimited)
   * @returns Path to the recording file
   */
  public async startRecording(duration?: number): Promise<string> {
    if (!this.page) {
      throw new Error("Browser not initialized. Call joinMeeting first.");
    }

    if (this.isRecording) {
      console.log("Already recording");
      return this.recordingFile || "";
    }

    // Check if ffmpeg is installed
    const ffmpegAvailable = await this._checkFfmpeg();
    if (!ffmpegAvailable) {
      throw new Error("ffmpeg is required for recording but is not available");
    }

    try {
      // Setup recording configuration
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      this.recordingFile = path.join(
        this.options.recordingPath,
        `meet-recording-${timestamp}.mp4`
      );

      // Create recorder with configuration
      const recorderConfig: RecorderConfig = {
        followNewTab: true,
        fps: 30,
        videoCodec: "h264",
        aspectRatio: "16:9",
        recordDurationLimit:
          duration && duration > 0 ? duration * 60 * 1000 : undefined, // Convert minutes to ms, undefined for unlimited
        ffmpeg_Path: null,
        audioSource: "tab",
      };

      this.recorder = new PuppeteerScreenRecorder(this.page, recorderConfig);

      // Start recording
      console.log("Starting recording...");
      await this.recorder.start(this.recordingFile);
      this.isRecording = true;

      console.log(
        `Recording started ${duration && duration > 0 ? `for ${duration} minutes` : "with no time limit"}`
      );
      return this.recordingFile;
    } catch (error) {
      console.error("Failed to start recording:", error);
      throw error;
    }
  }

  /**
   * Stop the current recording
   * @returns Path to the recording file or null if no recording
   */
  public async stopRecording(): Promise<string | null> {
    if (!this.isRecording || !this.recorder) {
      console.log("Not currently recording");
      return null;
    }

    try {
      const recordingPath = this.recordingFile;
      console.log("Stopping recording...");

      // Set these variables first to prevent race conditions
      const tempRecorder = this.recorder;
      this.recorder = null;
      this.isRecording = false;
      this.recordingFile = null;

      // Stop the recording
      await tempRecorder.stop();

      console.log(`Recording stopped and saved to: ${recordingPath}`);
      return recordingPath;
    } catch (error) {
      console.error("Error stopping recording:", error);
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
      console.log("Browser closed");
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
    const loginButton = await this.page.$(
      'a[href^="https://accounts.google.com/signin/"], button:contains("Sign in")'
    );
    if (!loginButton) {
      return; // No login required
    }

    console.log("Login required");

    if (!this.options.email || !this.options.password) {
      throw new Error("Google login required but credentials not provided");
    }

    // Click the login button with human-like click
    await this._humanLikeClick('a[href^="https://accounts.google.com/signin/"], button:contains("Sign in")');
    await this.page.waitForNavigation({ waitUntil: "networkidle2" });

    // Bypass any "Choose an account" screen if present
    const chooseAccountScreen = await this.page.evaluate(() => {
      return document.body.innerText.includes('Choose an account') ||
             document.querySelector('.y5oSnd') !== null;
    });
    
    if (chooseAccountScreen) {
      console.log("Detected 'Choose an account' screen, continuing to login form");
      await this.page.evaluate(() => {
        // Click "Use another account" option
        const useAnotherButtons = Array.from(document.querySelectorAll('div[role="link"], button, div[role="button"]'));
        for (const button of useAnotherButtons) {
          if ((button.textContent || '').includes('Use another account') || 
              (button.textContent || '').includes('Add another account')) {
            (button as HTMLElement).click();
            return;
          }
        }
      });
      // Wait for navigation after clicking
      await this.page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {
        // Sometimes this doesn't trigger a navigation
        console.log("No navigation after 'Use another account'");
      });
    }

    // Enter email with human-like typing
    const emailSelector = 'input[type="email"], input[name="identifier"]';
    await this.page.waitForSelector(emailSelector, { visible: true, timeout: 30000 });
    await this._humanLikeType(emailSelector, this.options.email!);
    
    // Random delay before clicking next
    await this._randomDelay();
    
    // Look for the "Next" button and click it
    const nextButtonClicked = await this.page.evaluate(() => {
      const nextSelectors = [
        '#identifierNext',
        'button:contains("Next")',
        'div[role="button"]:contains("Next")',
        'button[type="submit"]'
      ];
      
      for (const selector of nextSelectors) {
        try {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            (elements[0] as HTMLElement).click();
            return true;
          }
        } catch (e) {
          // Try next selector
        }
      }
      
      return false;
    });
    
    if (!nextButtonClicked) {
      console.log("Could not find next button on email screen");
      throw new Error("Login process failed at email step");
    }
    
    // Wait for password field to appear
    await this.page.waitForSelector('input[type="password"]', {
      visible: true,
      timeout: 30000
    });
    
    // Random delay before typing password
    await this._randomDelay();
    
    // Enter password with human-like typing
    await this._humanLikeType('input[type="password"]', this.options.password!);
    
    // Random delay before clicking sign in
    await this._randomDelay();
    
    // Click the password next button
    const passwordNextClicked = await this.page.evaluate(() => {
      const nextSelectors = [
        '#passwordNext',
        'button:contains("Sign in")',
        'div[role="button"]:contains("Sign in")',
        'button[type="submit"]'
      ];
      
      for (const selector of nextSelectors) {
        try {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            (elements[0] as HTMLElement).click();
            return true;
          }
        } catch (e) {
          // Try next selector
        }
      }
      
      return false;
    });
    
    if (!passwordNextClicked) {
      console.log("Could not find sign in button on password screen");
      throw new Error("Login process failed at password step");
    }

    // Wait for login to complete
    await this.page.waitForNavigation({ 
      waitUntil: "networkidle2",
      timeout: 60000
    }).catch(e => {
      console.log("Navigation timeout after login, continuing anyway");
    });
    
    // Handle potential 2-step verification or additional prompts
    await this._handleLoginChallenges();
    
    console.log("Login completed");
  }

  /**
   * Handle login directly on accounts.google.com
   * @private
   */
  private async _handleLoginOnAccountsPage(): Promise<void> {
    if (!this.page) return;
    
    if (!this.options.email || !this.options.password) {
      throw new Error("Credentials required for Google Accounts login");
    }
    
    // Enter email
    await this.page.waitForSelector('input[type="email"]');
    await this._humanLikeType('input[type="email"]', this.options.email);
    
    // Click next
    await this.page.evaluate(() => {
      const nextButton = document.querySelector('#identifierNext, button[type="submit"]');
      if (nextButton) {
        (nextButton as HTMLElement).click();
      }
    });
    
    // Wait for password field
    await this.page.waitForSelector('input[type="password"]', { visible: true, timeout: 30000 });
    await this._randomDelay();
    
    // Enter password
    await this._humanLikeType('input[type="password"]', this.options.password);
    
    // Click sign in
    await this.page.evaluate(() => {
      const signInButton = document.querySelector('#passwordNext, button[type="submit"]');
      if (signInButton) {
        (signInButton as HTMLElement).click();
      }
    });
    
    // Wait for login to complete
    await this.page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {
      console.log("No navigation after login, continuing anyway");
    });
    
    // Handle any additional prompts
    await this._handleLoginChallenges();
  }

  /**
   * Handle additional login challenges (2FA, security questions, etc.)
   * @private
   */
  private async _handleLoginChallenges(): Promise<void> {
    if (!this.page) return;
    
    // Wait a moment for any additional screens to load
    await this._randomDelay();
    
    // Check for known challenge screens
    const challengeDetected = await this.page.evaluate(() => {
      const pageText = document.body.innerText.toLowerCase();
      
      // Check for 2-step verification
      if (pageText.includes('2-step verification') || 
          pageText.includes('verify it\'s you') ||
          pageText.includes('authentication app') ||
          pageText.includes('get a verification code')) {
        return { type: '2sv', detected: true };
      }
      
      // Check for "Protect your account" prompt
      if (pageText.includes('protect your account') ||
          pageText.includes('confirm it\'s you')) {
        return { type: 'protect', detected: true };
      }
      
      // Check for "Terms of Service" or "Privacy Policy" updates
      if (pageText.includes('terms of service') ||
          pageText.includes('privacy policy') ||
          pageText.includes('i agree')) {
        return { type: 'terms', detected: true };
      }
      
      // Check for "Get more from your Google Account" prompt
      if (pageText.includes('more from your google account') ||
          pageText.includes('customize your google experience')) {
        return { type: 'more', detected: true };
      }
      
      return { detected: false };
    }) as { type?: string, detected: boolean };
    
    if (challengeDetected.detected) {
      console.log(`Detected challenge screen: ${challengeDetected.type || 'unknown'}`);
      
      // Handle based on the type of challenge
      switch (challengeDetected.type) {
        case 'terms':
          // Accept terms by clicking "I agree" or "Accept"
          await this.page.evaluate(() => {
            const agreeButtons = Array.from(document.querySelectorAll('button, div[role="button"]'));
            for (const button of agreeButtons) {
              const text = (button.textContent || '').toLowerCase();
              if (text.includes('agree') || text.includes('accept') || text.includes('next')) {
                (button as HTMLElement).click();
                return true;
              }
            }
            return false;
          });
          break;
          
        case 'more':
        case 'protect':
          // Skip by clicking "Confirm" or "Skip"
          await this.page.evaluate(() => {
            // Try to find skip button first
            const skipButtons = Array.from(document.querySelectorAll('button, div[role="button"], a'));
            for (const button of skipButtons) {
              const text = (button.textContent || '').toLowerCase();
              if (text.includes('skip') || text.includes('no thanks') || text.includes('later')) {
                (button as HTMLElement).click();
                return true;
              }
            }
            
            // If skip not found, try confirm/next
            const confirmButtons = Array.from(document.querySelectorAll('button, div[role="button"]'));
            for (const button of confirmButtons) {
              const text = (button.textContent || '').toLowerCase();
              if (text.includes('confirm') || text.includes('next') || text.includes('continue')) {
                (button as HTMLElement).click();
                return true;
              }
            }
            
            return false;
          });
          break;
          
        case '2sv':
          // We can't handle 2SV automatically
          console.log("2-step verification detected - cannot proceed automatically");
          
          // Take a screenshot to help diagnose
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
          await this.page.screenshot({
            path: path.join(this.options.recordingPath, `2sv-challenge-${timestamp}.png`),
          });
          
          throw new Error("2-step verification required but not supported");
          
        default:
          console.log("Unknown challenge type, cannot proceed");
          break;
      }
      
      // Wait for navigation after handling challenge
      await this.page.waitForNavigation({ waitUntil: "networkidle2" }).catch((error: Error) => {
        console.log("No navigation after handling challenge:", error.message);
      });
    }
  }

  /**
   * Wait for join button to appear
   * @private
   */
  private async _waitForJoinButton(): Promise<boolean> {
    if (!this.page) return false;
    
    try {
      // Wait for common join button selectors
      const joinButtonVisible = await this.page.waitForFunction(
        () => {
          const selectors = [
            'div[role="button"][aria-label*="join"]',
            'div[role="button"][aria-label*="Join"]',
            'button[aria-label*="join"]',
            'button[aria-label*="Join"]',
            'span[jsname][role="button"]',
            // Text-based detection
            Array.from(document.querySelectorAll('button, div[role="button"]')).some(
              el => (el.textContent || '').toLowerCase().includes('join')
            )
          ];
          
          return selectors.some(selector => {
            if (typeof selector === 'boolean') return selector;
            try {
              return document.querySelector(selector) !== null;
            } catch (e) {
              return false;
            }
          });
        },
        { timeout: 60000 }
      ).then(() => true).catch(() => false);
      
      return joinButtonVisible;
    } catch (error) {
      console.log("Error waiting for join button:", error);
      return false;
    }
  }

  /**
   * Configure camera and microphone settings with enhanced reliability
   * @private
   */
  private async _configureDevices(): Promise<void> {
    if (!this.page) return;

    try {
      // Wait a moment for all device controls to become interactive
      await this._randomDelay();
      
      // Try multiple approaches to toggle camera and mic
      // Method 1: Check data-is-muted attribute
      const deviceStatus = await this.page.evaluate((cameraEnabled: boolean, micEnabled: boolean) => {
        // Helper function to toggle a device
        const toggleDevice = (deviceType: string, shouldBeEnabled: boolean) => {
          // Find all potential device buttons
          const buttonSelectors = [
            `[aria-label*="${deviceType}" i]`,
            `[data-tooltip*="${deviceType}" i]`,
            `[data-is-muted][aria-label*="${deviceType}" i]`
          ];
          
          // Try each selector
          for (const selector of buttonSelectors) {
            try {
              const buttons = document.querySelectorAll(selector);
              for (const btn of buttons) {
                // Check if current state matches desired state
                const isMuted = btn.getAttribute('data-is-muted') === 'true';
                const isEnabled = !isMuted;
                
                // Toggle if needed
                if (isEnabled !== shouldBeEnabled) {
                  (btn as HTMLElement).click();
                  return true;
                }
              }
            } catch (e) {
              // Continue to next selector
            }
          }
          
          return false;
        };
        
        // Toggle camera and mic
        const cameraToggled = toggleDevice('camera', cameraEnabled);
        const micToggled = toggleDevice('microphone', micEnabled);
        
        return { cameraToggled, micToggled };
      }, this.options.cameraEnabled, this.options.micEnabled);
      
      // Method 2: Use more general approach if method 1 failed
      if (!deviceStatus.cameraToggled) {
        // Find camera button by trying different approaches
        const cameraButton = await this.page.$(
          '[aria-label*="camera" i], [aria-label*="Camera" i], [data-tooltip*="camera" i]'
        );
        
        if (cameraButton) {
          const cameraEnabled = await this.page.evaluate(button => {
            // Try to determine current state
            const ariaLabel = button.getAttribute('aria-label') || '';
            const isCurrentlyEnabled = !ariaLabel.includes('off') && !ariaLabel.includes('disabled');
            
            // Click if current state doesn't match desired state
            if (isCurrentlyEnabled !== true) {
              (button as HTMLElement).click();
            }
            
            return true;
          }, cameraButton);
          
          console.log(`Camera ${this.options.cameraEnabled ? 'enabled' : 'disabled'}`);
        }
      }
      
      if (!deviceStatus.micToggled) {
        // Find mic button
        const micButton = await this.page.$(
          '[aria-label*="microphone" i], [aria-label*="Microphone" i], [data-tooltip*="microphone" i], [data-tooltip*="mic" i]'
        );
        
        if (micButton) {
          const micEnabled = await this.page.evaluate(button => {
            // Try to determine current state
            const ariaLabel = button.getAttribute('aria-label') || '';
            const isCurrentlyEnabled = !ariaLabel.includes('off') && !ariaLabel.includes('disabled');
            
            // Click if current state doesn't match desired state
            if (isCurrentlyEnabled !== true) {
              (button as HTMLElement).click();
            }
            
            return true;
          }, micButton);
          
          console.log(`Microphone ${this.options.micEnabled ? 'enabled' : 'disabled'}`);
        }
      }
    } catch (error) {
      console.log("Error configuring devices:", error);
    }
  }

  /**
   * Find and click the join meeting button with enhanced reliability
   * @private
   */
  private async _clickJoinButton(): Promise<boolean> {
    if (!this.page) throw new Error("Page not initialized");

    console.log("Looking for join button...");
    
    // Random delay to appear more human-like
    await this._randomDelay();

    // Try multiple approaches to find and click the join button
    const buttonClicked = await this.page.evaluate(() => {
      // Common join button text patterns
      const joinTextPatterns = ['join', 'join now', 'ask to join', 'join meeting', 'participate'];
      
      // Helper function to check if text matches any pattern
      const matchesJoinPattern = (text: string) => {
        const lowerText = text.toLowerCase();
        return joinTextPatterns.some(pattern => lowerText.includes(pattern));
      };
      
      // Method 1: Try to find buttons with aria-label containing "join"
      const ariaLabelButtons = document.querySelectorAll('[aria-label*="join" i], [aria-label*="Join" i]');
      for (let i = 0; i < ariaLabelButtons.length; i++) {
        try {
          const button = ariaLabelButtons[i];
          (button as HTMLElement).click();
          console.log("Clicked join button via aria-label");
          return true;
        } catch (e) {
          // Continue to next button
        }
      }
      
      // Method 2: Try to find buttons with join text
      const allButtons = document.querySelectorAll('button, div[role="button"], span[role="button"]');
      for (let i = 0; i < allButtons.length; i++) {
        try {
          const button = allButtons[i];
          if (matchesJoinPattern(button.textContent || '')) {
            (button as HTMLElement).click();
            console.log("Clicked join button via text content");
            return true;
          }
        } catch (e) {
          // Continue to next button
        }
      }
      
      // Method 3: Try common Google Meet button classes
      const meetButtons = document.querySelectorAll('.VfPpkd-LgbsSe, .U26fgb');
      for (let i = 0; i < meetButtons.length; i++) {
        try {
          const button = meetButtons[i];
          if (matchesJoinPattern(button.textContent || '')) {
            (button as HTMLElement).click();
            console.log("Clicked join button via class");
            return true;
          }
        } catch (e) {
          // Continue to next button
        }
      }
      
      // Method 4: Last resort, try clicking the largest button on screen
      let largestButton = null;
      let largestArea = 0;
      
      for (let i = 0; i < allButtons.length; i++) {
        try {
          const button = allButtons[i];
          const rect = (button as HTMLElement).getBoundingClientRect();
          const area = rect.width * rect.height;
          
          // Focus on large buttons near the bottom of the screen that might be join buttons
          if (area > largestArea && rect.top > window.innerHeight / 2) {
            largestArea = area;
            largestButton = button;
          }
        } catch (e) {
          // Continue to next button
        }
      }
      
      if (largestButton) {
        try {
          (largestButton as HTMLElement).click();
          console.log("Clicked largest button as fallback");
          return true;
        } catch (e) {
          console.log("Error clicking largest button:", e);
        }
      }
      
      return false;
    });

    if (!buttonClicked) {
      console.log("Could not find join button through JavaScript, trying Puppeteer selectors");
      
      // Try with puppeteer selectors as last resort
      const joinSelectors = [
        'div[role="button"][aria-label*="join"]',
        'div[role="button"][aria-label*="Join"]',
        'button[aria-label*="join"]',
        'button[aria-label*="Join"]'
      ];
      
      for (const selector of joinSelectors) {
        try {
          const button = await this.page.$(selector);
          if (button) {
            await button.click();
            console.log(`Join button found with selector: ${selector}`);
            return true;
          }
        } catch (error) {
          // Try next selector
        }
      }
      
      throw new Error("Could not find any join button");
    }
    
    return true;
  }

  /**
   * Confirm we're successfully in the meeting
   * @private
   */
  private async _confirmInMeeting(): Promise<boolean> {
    if (!this.page) return false;
    
    try {
      // Wait for indicators that we're in the meeting
      const inMeeting = await this.page.waitForFunction(
        () => {
          // Multiple indicators that we're in a meeting
          return (
            // Method 1: Check for common meeting UI elements
            document.querySelector('[aria-label*="people" i], [aria-label*="chat" i], [aria-label*="participant" i]') !== null ||
            
            // Method 2: Check for meeting text cues
            document.body.innerText.includes("You're in") ||
            document.body.innerText.includes("You're the only one here") ||
            
            // Method 3: Check for meeting container class
            document.querySelector('.zWfAib') !== null
          );
        },
        { timeout: 60000 }
      ).then(() => true).catch(() => false);
      
      if (inMeeting) {
        console.log("Successfully joined the meeting");
        return true;
      }
      
      return false;
    } catch (error) {
      console.log("Could not confirm whether we're in the meeting:", error);
      return false;
    }
  }
}

// Example usage
// async function example(): Promise<void> {
//   try {
//     // Enhanced stealth method 1: Join with Google account
//     const meetBotWithLogin = new GoogleMeetAutomation({
//       email: 'your.email@gmail.com',      // Replace with your email
//       password: 'your-password',          // Replace with your password
//       recordingPath: './meet-recordings',
//       cameraEnabled: false,
//       micEnabled: false,
//       useRealisticMovements: true,
//       randomizeViewport: true,
//       actionDelay: {min: 500, max: 2000}
//     });

//     // Enhanced stealth method 2: Join as guest (without login)
//     const meetBotAsGuest = new GoogleMeetAutomation({
//       guestName: `User ${Math.floor(Math.random() * 1000)}`,  // Random guest name
//       recordingPath: './meet-recordings',
//       cameraEnabled: false,
//       micEnabled: false,
//       useRealisticMovements: true,
//       randomizeViewport: true
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