import express from "express";
import debug from "debug";
import router from "./router";
import bodyParser from "body-parser";
import "dotenv/config";

async function main() {
    const dbg = debug("insight:main");
    const app = express();

    app.use(bodyParser.json());
    app.use(router);

    app.get("/", (req, res) => {
        res.sendFile(__dirname + "/html/index.html");
    });

    app.listen(process.env.PORT, () => {
        dbg("Listening.");
    });
}

void main();