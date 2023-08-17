const express = require('express');
const bodyParser = require('body-parser');
const { Builder, By } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

const app = express();

// Middleware to parse POST data
app.use(bodyParser.urlencoded({ extended: true }));

// Set the view engine to ejs
app.set('view engine', 'ejs');

// Serve the form on the root route
app.get('/', (req, res) => {
    res.render('index', { results: null, error: null });
});

// Handle form submission
app.post('/scrape', async (req, res) => {
    let driver;
    try {
        const query = req.body.query;
        const limit = parseInt(req.body.limit, 10);

        let options = new chrome.Options();
        options = options.headless();

        driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();


        let results = [];
        const url = "https://www.giustizia-amministrativa.it/dcsnprr";
        await driver.get(url);

        const advancedSearchElement = await driver.findElement(By.xpath('//div[contains(text(), "Ricerca Avanzata")]'));
        await advancedSearchElement.click();

        const inputElement = await driver.findElement(By.id("_GaSearch_INSTANCE_2NDgCF3zWBwk_searchPhrase"));
        await inputElement.sendKeys(query);

        const searchButton = await driver.findElement(By.id("_GaSearch_INSTANCE_2NDgCF3zWBwk_submitButton"));
        await searchButton.click();

        await driver.sleep(5000);

        const linkElements = await driver.findElements(By.className('visited-provvedimenti'));
        const linkUrls = [];
        for (let link of linkElements) {
            const linkUrl = await link.getAttribute('href');
            linkUrls.push(linkUrl);
        }

        for (let i = 0; i < Math.min(limit, linkUrls.length); i++) {
            await driver.get(linkUrls[i]);
            await driver.sleep(3000);  // Wait for the page to load
            results.push({
                text: `Link ${i + 1}`,
                href: linkUrls[i]
            });
        }
        res.render('index', { results: results, error: null });
    } catch (error) {
        console.error("Error occurred during scraping:", error);
        res.render('index', { results: null, error: "There was an error processing your request. Please try again later." });
    } finally {
        await driver.quit();
    }
});

const PORT = 80;
app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});
