import { Router } from "express";
import GoogleAPI from "./gdrive_api";

const router = Router();
export default router;

router.get("/api/submission", async (req, res) => {
    const discordId = req.headers['authorization'] as string;
    const category = parseInt(req.query['category'] as string);

    const submission = await GoogleAPI.getInstance().getSubmission(discordId, category);
    if (submission) {
        res.json(submission);
    } else {
        res.sendStatus(404);
    }
});

router.patch("/api/submission", async (req, res) => {
    const discordId = req.headers['authorization'] as string;
    const name = "Testing name";
    const shortenedSubmission = req.body.submission;
    shortenedSubmission.discordId = discordId;
    shortenedSubmission.name = name;

    await GoogleAPI.getInstance().putSubmission(shortenedSubmission);

    res.sendStatus(201);
});