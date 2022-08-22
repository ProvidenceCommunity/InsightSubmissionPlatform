import debug from "debug";
import { JWT } from "google-auth-library";
import { google, sheets_v4 } from "googleapis";

export interface Submission {
    discordId: string;
    category: number;
    name: string;
    link: string;
    notes: string;
}

const CACHE_TIME = 60000;
const TAB_NAME = "RAW_SUBMISSIONS";
const dbg = debug("insight:sheets");

export default class GoogleAPI {
    static instance: GoogleAPI | null = null;
    readonly auth: JWT;
    readonly sheet: sheets_v4.Sheets;
    readonly sheetId: string;
    cache: Submission[];
    cacheTime: number;

    private constructor() {
        this.auth = new google.auth.JWT({
            email: process.env.GOOGLE_ACCOUNT_EMAIL,
            key: process.env.GOOGLE_ACCOUNT_PRIVATE_KEY,
            scopes: ["https://www.googleapis.com/auth/spreadsheets"]
        });
        this.sheet = google.sheets("v4");
        this.sheetId = process.env.SHEET_ID as string;
        this.cacheTime = 0;
        this.cache = [];
    }

    static getInstance(): GoogleAPI {
        if (this.instance === null) {
            this.instance = new GoogleAPI();
        }
        return this.instance;
    }

    private async fetchSheetData(): Promise<void> {
        const data = await this.sheet.spreadsheets.values.get({
            spreadsheetId: this.sheetId,
            auth: this.auth,
            range: `${TAB_NAME}!A:E`,
            majorDimension: "ROWS"
        });
        this.cache = [];
        for (const raw_submission of data.data.values || []) {
            this.cache.push({
                discordId: raw_submission[0],
                category: parseInt(raw_submission[1]),
                name: raw_submission[2],
                link: raw_submission[3],
                notes: raw_submission[4]
            });
        }
        this.cacheTime = Date.now();
        dbg("Fetched %d submissions @%d", this.cache.length, this.cacheTime);
    }

    private async getSheetData(): Promise<Submission[]> {
        if (Date.now() > this.cacheTime + CACHE_TIME) {
            dbg("Cache expired");
            await this.fetchSheetData();
        }

        return this.cache;
    }

    async getSubmission(discordId: string, category: number): Promise<Submission | undefined> {
        const allSubmissions = await this.getSheetData();
        return allSubmissions.find((submission) => {
            return submission.discordId === discordId && submission.category === category
        });
    }

    private async appendSubmission(submission: Submission): Promise<void> {
        await this.sheet.spreadsheets.values.append({
            spreadsheetId: this.sheetId,
            auth: this.auth,
            range: TAB_NAME,
            valueInputOption: "RAW",
            requestBody: {
                values: [[submission.discordId, submission.category, submission.name, submission.link, submission.notes]]
            }
        });
        dbg("Appended submission %o", submission);
        await this.fetchSheetData();
    }

    private async updateSubmission(submission: Submission): Promise<boolean> {
        const allSubmissions = await this.getSheetData();
        const submissionIndex = allSubmissions.findIndex((s) => {
            return s.discordId === submission.discordId && s.category === submission.category
        });
        if (submissionIndex === undefined) {
            // We should never be here
            dbg("Trying to update an submission without an index!");
            dbg("%o", submission);
            await this.appendSubmission(submission);
            return true;
        }
        await this.sheet.spreadsheets.values.update({
            spreadsheetId: this.sheetId,
            auth: this.auth,
            range: `${TAB_NAME}!A${submissionIndex+1}:E${submissionIndex+1}`,
            valueInputOption: "RAW",
            requestBody: {
                values: [[submission.discordId, submission.category, submission.name, submission.link, submission.notes]]
            }
        })
        dbg("Updating submission(%d) %o", submissionIndex+1, submission);
        await this.fetchSheetData();
        return true;
    }

    async putSubmission(submission: Submission): Promise<boolean> {
        const oldSubmission = await this.getSubmission(submission.discordId, submission.category);
        if (oldSubmission) {
            return await this.updateSubmission(submission);
        } else {
            await this.appendSubmission(submission);
            return true;
        }
    }
}