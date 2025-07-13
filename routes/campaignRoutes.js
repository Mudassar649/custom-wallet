import express from 'express';
import { 
    createCampaign, 
    getCampaigns, 
    applyCampaign, 
    getCampaignApplications, 
    respondToApplication,
    submitContent,
    reviewContent
} from '../controllers/campaignController.js';
import { authenticateToken, requireAdvertiser, requireContentCreator } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticateToken, requireAdvertiser, createCampaign);
router.get('/', getCampaigns);
router.post('/:campaignId/apply', authenticateToken, requireContentCreator, applyCampaign);
router.get('/:campaignId/applications', authenticateToken, requireAdvertiser, getCampaignApplications);
router.put('/applications/:applicationId/respond', authenticateToken, requireAdvertiser, respondToApplication);
router.post('/:campaignId/submit', authenticateToken, requireContentCreator, submitContent);
router.put('/submissions/:submissionId/review', authenticateToken, requireAdvertiser, reviewContent);

export default router;