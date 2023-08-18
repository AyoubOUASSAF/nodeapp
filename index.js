const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const winston = require('winston'); // Add Winston for logging

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const PORT = 3000;

// Configure Winston logging
const logger = winston.createLogger({
    level: 'error', // Set your desired log level
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(info => {
            return `${info.timestamp} - ${info.level}: ${info.message}`;
        })
    ),
    transports: [
        new winston.transports.Console(), // Log to console
        new winston.transports.File({ filename: 'error.log' }) // Log to file
    ]
});

app.get('/', (req, res) => {
    res.render('index');
});

app.post('/search', async (req, res) => {
    const searchTerm = req.body.term;
    const url = 'https://www.italgiure.giustizia.it/sncass/';

    try {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();

        await page.goto(url);

        await page.type('#searchterm', searchTerm);
        await page.click('button[title="Avvia ricerca"]');

        await page.waitForTimeout(5000);

        const results = await page.$$eval('h3.doctitle', h3Elements => {
            return h3Elements.map(h3 => {
                try {
                    const linkElement = h3.querySelector('.toDocument.pdf');
                    const link = linkElement ? "https://www.italgiure.giustizia.it" + decodeURIComponent(linkElement.getAttribute('data-arg')) : null;

                    const sectionElement = h3.querySelector('.risultato[data-role="content"][data-arg="szdec"]');
                    const section = sectionElement ? sectionElement.textContent : null;

                    const typeElement = h3.querySelector('[data-role="content"][data-arg="tipoprov"]');
                    const type = typeElement ? typeElement.textContent : null;

                    const numberElement = h3.querySelector('.chkcontent [data-role="content"][data-arg="numcard"]');
                    const number = numberElement ? numberElement.textContent : null;

                    const dateElement = h3.querySelector('.chkcontent [data-role="content"][data-arg="datdep"]');
                    const date = dateElement ? dateElement.textContent : null;

                    return {
                        link,
                        section,
                        type,
                        number,
                        date
                    };
                } catch (error) {
                    logger.error(`Error processing result: ${error}`);
                    return null; // Skip this result in case of error
                }
            });
        });

        await browser.close();

        res.json({ results });
    } catch (error) {
        logger.error(`Error in search: ${error}`);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
