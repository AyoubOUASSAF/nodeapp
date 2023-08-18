const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cheerio = require('cheerio');
const winston = require('winston'); // Add Winston for logging

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;

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
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);

        const results = [];

        $('h3.doctitle').each((index, element) => {
            try {
                const linkElement = $(element).find('.toDocument.pdf');
                const link = linkElement ? "https://www.italgiure.giustizia.it" + decodeURIComponent(linkElement.attr('data-arg')) : null;

                const sectionElement = $(element).find('.risultato[data-role="content"][data-arg="szdec"]');
                const section = sectionElement ? sectionElement.text() : null;

                const typeElement = $(element).find('[data-role="content"][data-arg="tipoprov"]');
                const type = typeElement ? typeElement.text() : null;

                const numberElement = $(element).find('.chkcontent [data-role="content"][data-arg="numcard"]');
                const number = numberElement ? numberElement.text() : null;

                const dateElement = $(element).find('.chkcontent [data-role="content"][data-arg="datdep"]');
                const date = dateElement ? dateElement.text() : null;

                results.push({
                    link,
                    section,
                    type,
                    number,
                    date
                });
            } catch (error) {
                logger.error(`Error processing result: ${error}`);
            }
        });

        res.json({ results });
    } catch (error) {
        logger.error(`Error in search: ${error}`);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

(async () => {
    try {
        await app.listen(PORT);
        console.log(`Server is running on port ${PORT}`);
    } catch (error) {
        logger.error(`Error starting server: ${error}`);
    }
})();
