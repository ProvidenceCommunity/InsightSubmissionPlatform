import axios from "axios";
import { randomUUID } from "crypto";
import debug from "debug";
import { Router } from "express";
import session from "express-session";

const dbg = debug("insight:auth");

export const sessionStore = session({ secret: randomUUID() });

declare module 'express-session' {
    interface SessionData {
        discordId: string;
        tag: string;
    }
}

function getRedirectURI(): string {
    return encodeURIComponent(`${process.env.PUBLIC_ORIGIN}/auth/discord_callback`);
}

export const authRouter = Router();
authRouter.use(sessionStore);

authRouter.get("/discord_callback", async (req, res) => {
    const code = req.query.code;
    const state = req.query.state;
    if (state !== req.sessionID) {
        dbg("Discord callback - bad state");
        res.sendStatus(400);
        return;
    }
    const data = `client_id=${process.env.DISCORD_ID}&` +
                `client_secret=${process.env.DISCORD_SECRET}&` +
                `grant_type=authorization_code&` +
                `code=${code}&` +
                `redirect_uri=${getRedirectURI()}`
    const request = await axios.post("https://discord.com/api/oauth2/token", data, { validateStatus: () => { return true }});
    if (request.status !== 200) {
        dbg("Discord callback - non 200 token code: %d: %o", request.status, request.data);
        res.sendStatus(400);
        return;
    }
    const token = request.data.access_token;
    const user_data = await axios.get("https://discord.com/api/v10/users/@me", { headers: {"Authorization": `Bearer ${token}`}, validateStatus: () => { return true }});
    if (user_data.status !== 200) {
        dbg("Discord callback - @me non 200 code: %d: %o", request.status, request.data);
        res.sendStatus(400);
        return;
    }
    req.session.discordId = user_data.data.id;
    req.session.tag = user_data.data.username + "#" + user_data.data.discriminator;
    dbg("Discord callback - User %s login successful", req.session.tag);
    res.redirect("/");
});

authRouter.get("/discord_login", (req, res) => {
    const discordRedirect = "https://discord.com/api/oauth2/authorize" +
        "?response_type=code" +
        `&client_id=${process.env.DISCORD_ID}` +
        "&scope=identify" +
        `&state=${req.sessionID}` +
        `&redirect_uri=${getRedirectURI()}`
    res.redirect(discordRedirect);
});

authRouter.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/");
    });
});

authRouter.get("/user_name", (req, res) => {
    if (req.session.tag) {
        res.send(req.session.tag);
    } else {
        res.sendStatus(404);
    }
});