import express from "express";
import debug from "debug";
import router from "./router";
import bodyParser from "body-parser";
import "dotenv/config";
import { authRouter, sessionStore } from "./auth";

async function main() {
    const dbg = debug("insight:main");
    const app = express();

    app.use(bodyParser.json());
    app.use(sessionStore);
    app.use(router);
    app.use("/auth/", authRouter);
    app.use("/assets/", express.static("assets"));

    app.get("/", (req, res) => {
        if (req.session.discordId === undefined) {
            res.sendFile(__dirname + "/html/login.html");
            return;
        }
        res.sendFile(__dirname + "/html/submissions-page.html");
    });

    app.listen(process.env.PORT, () => {
        dbg("Listening.");
    });
}

void main();