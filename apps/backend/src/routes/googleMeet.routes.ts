import express from 'express';
import { GoogleMeetController } from '../controllers/googleMeet.controller';

const router = express.Router();

router.post('/join', GoogleMeetController.joinMeeting);
router.post('/record/start', GoogleMeetController.startRecording);
router.post('/record/stop', GoogleMeetController.stopRecording);
router.post('/leave', GoogleMeetController.leaveMeeting);
router.get('/status', GoogleMeetController.getMeetingStatus);
router.post('/join-and-record', GoogleMeetController.joinAndRecord);

export default router;