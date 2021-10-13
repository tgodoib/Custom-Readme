const express = require("express");
const nodeHtmlToImage = require('node-html-to-image');
var fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000


app.get('/top-languages', async (req, res) => {

    let data = JSON.parse(fs.readFileSync('src/data.json'));
    let languages = data["top-languages"]["data"];

    if ((new Date().getTime() / 1000) - data["top-languages"]["last_updated"] > 24 * 60 * 60) {
        console.log("Updating top-languages data");
        const { Octokit, App, Action } = require("octokit");
        let octokit = new Octokit();

        let languages_raw = {};

        let repos = await octokit.request('GET /users/tgodoib/repos');
        repos = repos.data.filter(v => v.fork === false)
        repos = repos.map(v => v.name);

        for (let i = 0; i < repos.length; i++) {
            let repo = repos[i];
            await octokit.request(`GET /repos/tgodoib/${repo}/languages`).then(langs => {
                Object.keys(langs.data).forEach(lang => {
                    if (!(lang in languages_raw)) languages_raw[lang] = 0;
                    languages_raw[lang] += langs.data[lang];
                });
            });
        }

        let byte_total = 0;
        Object.keys(languages_raw).forEach(lang => byte_total += languages_raw[lang]);
        Object.keys(languages_raw).forEach(lang => languages_raw[lang] /= byte_total / 100);

        languages = Object.keys(languages_raw).map(key => [key, languages_raw[key]]).sort((f, s) => s[1] - f[1]);

        data["top-languages"]["data"] = languages;
        data["top-languages"]["last_updated"] = Math.floor(new Date().getTime() / 1000)
        fs.writeFileSync('data.json', JSON.stringify(data));
    }

    fs.readFile('./src/widgets/top-languages.html', 'utf8', async function (err, html_file) {
        if (err) throw err;

        html_file = html_file.replace("'languages_placeholder'", JSON.stringify(languages));

        // res.status(200).send(html_file);

        const image = await nodeHtmlToImage({
            transparent: true,
            waitUtil: "domcontentloaded",
            html: html_file,
            puppeteerArgs: { args: ['--no-sandbox'] }
        });

        res.writeHead(200, { 'Content-Type': 'image/png' });
        res.end(image, 'binary');
    });

});

app.listen(PORT, () => console.log(`Listening on ${PORT}`));