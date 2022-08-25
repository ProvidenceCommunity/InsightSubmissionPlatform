import debug from "debug";
import { Router } from "express";
import { authRouter } from "./auth";
import GoogleAPI from "./gdrive_api";

const ALLOWED_CATEGORIES = [1];
const dbg = debug("insight:router");

const router = Router();
router.use(authRouter);
export default router;

router.get("/api/submission", async (req, res) => {
    const discordId = req.session.discordId as string;
    const category = parseInt(req.query['category'] as string);

    const submission = await GoogleAPI.getInstance().getSubmission(discordId, category);
    if (submission) {
        res.json(submission);
    } else {
        res.sendStatus(404);
    }
});

router.patch("/api/submission", async (req, res) => {
    const discordId = req.session.discordId as string;
    const name = req.session.tag;
    const shortenedSubmission = req.body.submission;

    if (!ALLOWED_CATEGORIES.includes(shortenedSubmission.category)) {
        dbg("Tried to patch an invalid category! %d", shortenedSubmission.category);
        res.sendStatus(400);
        return;
    }

    shortenedSubmission.discordId = discordId;
    shortenedSubmission.name = name;

    await GoogleAPI.getInstance().putSubmission(shortenedSubmission);

    res.sendStatus(201);
});