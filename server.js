//  fetching dependencies or packages from node. 

const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const express = require('express');
const bodyParser = require('body-parser');
const cron = require('cron'); 

const app = express();
app.use(bodyParser.json());

// initializing the db and creating the table named exchange_rates.
let db = new sqlite3.Database(':memory:', (err) => {
    if (err) {
        console.error('Error opening SQLite database:', err.message);
    } else {
        console.log('Connected to the in-memory SQLite database.');

        // specifying the data and its type for tabel creation . 
        db.run(`CREATE TABLE IF NOT EXISTS exchange_rates (
            timestamp INTEGER PRIMARY KEY,
            open REAL,
            high REAL,
            low REAL,
            close REAL,
            volume INTEGER,
            currency_pair TEXT
        )`);
    }
});


// Fetching the historical data by calling out the api using axios. 
async function fetchHistoricalExchangeData(quote, fromDate, toDate) {
    
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${quote}?period1=${fromDate}&period2=${toDate}&interval=1d`;

    try {
        const response = await axios.get(url);
        return response.data; 
    } catch (error) {
        console.error('Error fetching data:', error.message);
        return null;
    }
}

// Primary Task 1 : to fetch and store data in in-memory database ( sqlite )

function saveDataToDatabase(data, quote) {
    db.serialize(() => {
        const stmt = db.prepare(`INSERT INTO exchange_rates (timestamp, open, high, low, close, volume, currency_pair) VALUES (?, ?, ?, ?, ?, ?, ?)`);
        const quotes = data.chart.result[0].indicators.quote[0];
        const timestamps = data.chart.result[0].timestamp;

        for (let i = 0; i < timestamps.length; i++) {
            stmt.run(
                timestamps[i],
                quotes.open[i],
                quotes.high[i],
                quotes.low[i],
                quotes.close[i],
                quotes.volume[i],
                quote
            );
        }

        stmt.finalize();

        db.all("SELECT * FROM exchange_rates", [], (err, rows) => {
            if (err) {
                throw err;
            }
            console.log("Stored Exchange Rates:", rows.length);
        });
    
       
    });


}

// Primary TASK 2 --> SUB Task 1 : to create an API with /api/forex-data with from sqlite database . We fetch data based on 
// fromDate : starting date 
// toDate : current date 
// period : 1Monthor 3 Month , fromDate will be 1M or 3M before toDate( current date ). 

app.post('/api/forex-data', (req, res) => {
    const { from, to, period } = req.body; // Extracting the arguments from request body 

    // if any of the above arguments are not present return an error with status code 400 ( Bad request)
    if (!from || !to || !period) {
        return res.status(400).json({ error: "Please provide 'from', 'to', and 'period' parameters." });
    }

    // modify the quote for querying the db.
    const quote = `${from}${to}=X`;
    
    // initializing fromDate and toDate. 
    let toDate = Math.floor(Date.now() / 1000); 
    let fromDate;
    const currentDate = new Date();

    if (period === '1M') {
        fromDate = Math.floor(new Date(currentDate.setMonth(currentDate.getMonth() - 1)).getTime() / 1000);
    } else if (period === '3M') {
        fromDate = Math.floor(new Date(currentDate.setMonth(currentDate.getMonth() - 3)).getTime() / 1000);
    } else {
        return res.status(400).json({ error: "Unsupported period. Use '1M' or '3M'." });
    }

    // Quering the sqlite db . to fetch results . 
    db.all(`SELECT * FROM exchange_rates WHERE currency_pair = ? AND timestamp BETWEEN ? AND ?`, [quote, fromDate, toDate], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (rows.length === 0) {
            return res.status(404).json({ message: "No data found for the specified period." });
        }
        console.log(res.json(rows));
    });
});

// Functional method that calls fetchHistoricalExchangeData method to fetch the data using arguments ( quote , fromDate , toDate)
async function scrapeAndStoreData(quote, fromDate, toDate) {
    const historicalData = await fetchHistoricalExchangeData(quote, fromDate, toDate);
    
    if (historicalData) {
        saveDataToDatabase(historicalData, quote); // method that saves the historical data to the database.
        console.log(`Data successfully scraped and stored for ${quote}.`);
    }
}

function calculateUnixTimeRange(period) {
    let toDate = Math.floor(Date.now() / 1000); 
    const currentDate = new Date();
    let fromDate;

    switch (period) {
        case '1W':
            fromDate = Math.floor(new Date(currentDate.setDate(currentDate.getDate() - 7)).getTime() / 1000);
            break;
        case '1M':
            fromDate = Math.floor(new Date(currentDate.setMonth(currentDate.getMonth() - 1)).getTime() / 1000);
            break;
        case '3M':
            fromDate = Math.floor(new Date(currentDate.setMonth(currentDate.getMonth() - 3)).getTime() / 1000);
            break;
        case '6M':
            fromDate = Math.floor(new Date(currentDate.setMonth(currentDate.getMonth() - 6)).getTime() / 1000);
            break;
        case '1Y':
            fromDate = Math.floor(new Date(currentDate.setFullYear(currentDate.getFullYear() - 1)).getTime() / 1000);
            break;
        default:
            throw new Error('Invalid period specified.');
    }

    return { fromDate, toDate };
}
// Task2 : SUB task 2 = creating a CRON job to periodically scrap and store the data in sqlite database . 
const job = new cron.CronJob('0 0 * * *', async () => {
    console.log('Starting scheduled scraping job...');

    const currencyPairs = [
        { from: 'GBP', to: 'INR' },
        { from: 'AED', to: 'INR' }
    ];

    const periods = ['1W', '1M', '3M', '6M', '1Y'];

    for (const pair of currencyPairs) {
        const quote = `${pair.from}${pair.to}=X`;
        for (const period of periods) {
            const { fromDate, toDate } = calculateUnixTimeRange(period);
            await scrapeAndStoreData(quote, fromDate, toDate);
        }
    }

    console.log('Scheduled scraping job completed.');
});


job.start();

// server start logic 
app.listen(3001, async () => {

    const quote = 'EURUSD=X'; 
    const fromDate = Math.floor(new Date('2023-01-01').getTime() / 1000); 
    const toDate = Math.floor(new Date('2023-12-31').getTime() / 1000); 

   //  Scraping and storing the data as soon as the server starts , after which job.start() will look into this requirement .  
    await(scrapeAndStoreData(quote,fromDate,toDate));

    console.log('Server is running on http://localhost:3001');
    console.log('Scraping will happen daily at midnight.');
});
