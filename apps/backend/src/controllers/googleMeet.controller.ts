import { NextFunction, Request, Response } from 'express';
import GoogleMeetService from '../services/googleMeet.service';
import { AppError } from '../utils/AppError';

/**
 * Controller for Google Meet operations
 */
export class GoogleMeetController {
    /**
     * Join a Google Meet meeting
     */
    public static async joinMeeting(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { meetingUrl, options } = req.body;

            if (!meetingUrl) {
                throw new AppError('Meeting URL is required', 400);
            }

            const joined = await GoogleMeetService.joinMeeting({
                meetingUrl,
                ...options
            });

            res.status(200).json({
                success: true,
                message: 'Successfully joined the meeting',
                data: { meetingUrl }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Start recording the current meeting
     */
    public static async startRecording(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { duration } = req.body;
            const recordingPath = await GoogleMeetService.startRecording(duration);

            res.status(200).json({
                success: true,
                message: 'Recording started',
                data: { recordingPath }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Stop the current recording
     */
    public static async stopRecording(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const recordingPath = await GoogleMeetService.stopRecording();

            res.status(200).json({
                success: true,
                message: 'Recording stopped',
                data: { recordingPath }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Leave meeting and close the browser
     */
    public static async leaveMeeting(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await GoogleMeetService.leaveMeeting();

            res.status(200).json({
                success: true,
                message: 'Successfully left the meeting'
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get current meeting status
     */
    public static async getMeetingStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const status = GoogleMeetService.getMeetingStatus();

            res.status(200).json({
                success: true,
                data: status
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Join meeting and start recording in one operation
     */
    public static async joinAndRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { meetingUrl, options } = req.body;

            if (!meetingUrl) {
                throw new AppError('Meeting URL is required', 400);
            }

            const recordingPath = await GoogleMeetService.joinAndRecord({
                meetingUrl,
                ...options
            });

            res.status(200).json({
                success: true,
                message: 'Successfully joined meeting and started recording',
                data: { meetingUrl, recordingPath }
            });
        } catch (error) {
            next(error);
        }
    }
}