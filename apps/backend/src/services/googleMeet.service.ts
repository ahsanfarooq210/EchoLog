import GoogleMeetAutomation from './puppetter.services';
import { AppError } from '../utils/AppError';
import path from 'path';

/**
 * Options for Google Meet operations
 */
interface GoogleMeetServiceOptions {
  meetingUrl: string;
  guestName?: string;
  recordingPath?: string;
  cameraEnabled?: boolean;
  micEnabled?: boolean;
  headless?: boolean;
  recordingDuration?: number; // in minutes
}

/**
 * Service for Google Meet operations
 * Provides a higher-level abstraction over the puppeteer automation
 */
export class GoogleMeetService {
  private static instance: GoogleMeetService;
  private meetAutomation: GoogleMeetAutomation | null = null;
  private isInMeeting: boolean = false;
  private meetingUrl: string | null = null;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}

  /**
   * Get the singleton instance of GoogleMeetService
   */
  public static getInstance(): GoogleMeetService {
    if (!GoogleMeetService.instance) {
      GoogleMeetService.instance = new GoogleMeetService();
    }
    return GoogleMeetService.instance;
  }

  /**
   * Initialize the Google Meet automation with options
   * @param options Configuration options
   */
  private initializeAutomation(options: Partial<GoogleMeetServiceOptions> = {}): GoogleMeetAutomation {
    if (!this.meetAutomation) {
      this.meetAutomation = new GoogleMeetAutomation({
        guestName: options.guestName || "EchoLog's Note Taker",
        recordingPath: options.recordingPath || path.resolve(process.cwd(), 'recordings'),
        cameraEnabled: options.cameraEnabled || false,
        micEnabled: options.micEnabled || false,
        headless: options.headless !== undefined ? options.headless : false
      });
      
    }
    return this.meetAutomation;
  }

  /**
   * Join a Google Meet meeting
   * @param options Meeting options including URL
   * @returns Promise resolving to success status
   */
  public async joinMeeting(options: GoogleMeetServiceOptions): Promise<boolean> {
    try {
      if (!options.meetingUrl) {
        throw new AppError('Meeting URL is required', 400);
      }

      // Initialize automation with options
      const automation = this.initializeAutomation(options);
      
      // Join the meeting
      const success = await automation.joinMeeting(options.meetingUrl);
      
      if (success) {
        this.isInMeeting = true;
        this.meetingUrl = options.meetingUrl;
        return true;
      } else {
        throw new AppError('Failed to join the meeting', 500);
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Error joining meeting: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Start recording the current meeting
   * @param duration Optional recording duration in minutes
   * @returns Path to the recording file
   */
  public async startRecording(duration?: number): Promise<string> {
    try {
      if (!this.meetAutomation || !this.isInMeeting) {
        throw new AppError('Not in a meeting. Join a meeting first.', 400);
      }

      const recordingPath = await this.meetAutomation.startRecording(duration);
      return recordingPath;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Error starting recording: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Stop the current recording
   * @returns Path to the recording file or null if no recording
   */
  public async stopRecording(): Promise<string | null> {
    try {
      if (!this.meetAutomation || !this.isInMeeting) {
        throw new AppError('Not in a meeting', 400);
      }

      const recordingPath = await this.meetAutomation.stopRecording();
      return recordingPath;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Error stopping recording: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Leave the meeting and close the browser
   */
  public async leaveMeeting(): Promise<void> {
    try {
      if (this.meetAutomation) {
        await this.meetAutomation.close();
        this.meetAutomation = null;
        this.isInMeeting = false;
        this.meetingUrl = null;
      }
    } catch (error) {
      throw new AppError(`Error leaving meeting: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Get the current meeting status
   * @returns Meeting status information
   */
  public getMeetingStatus(): { isInMeeting: boolean; meetingUrl: string | null } {
    return {
      isInMeeting: this.isInMeeting,
      meetingUrl: this.meetingUrl
    };
  }

  /**
   * Join a meeting and start recording in one operation
   * @param options Meeting options
   * @returns Recording path if successful
   */
  public async joinAndRecord(options: GoogleMeetServiceOptions): Promise<string> {
    const joined = await this.joinMeeting(options);
    
    if (!joined) {
      throw new AppError('Failed to join the meeting', 500);
    }
    
    return this.startRecording(options.recordingDuration);
  }
}

export default GoogleMeetService.getInstance();