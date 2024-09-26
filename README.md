# forex-scraper

This project scrapes historical foreign exchange data from Yahoo Finance, stores it in an in-memory SQLite database, and provides a REST API to retrieve the data. It also includes a cron job to automatically scrape and store data daily at midnight.

## Features

- Scrapes historical exchange rate data from Yahoo Finance.
- Stores exchange rates (open, high, low, close, volume) in an SQLite database.
- Provides an API to query stored data based on currency pairs and periods.
- Cron job to scrape data daily at midnight.

## Prerequisites

- Node.js (v14 or later)
- npm

## Setup

1. **Install dependencies**:
    ```bash
    npm install
    ```

2. **Start the server **:
    ```bash
    node app.js
    ```

    The server will be accessible at `http://localhost:3001`.

3. **API Endpoints**:

    - **POST /api/forex-data**: Retrieves exchange rate data based on specified currency pair and period.
      - Request:
        ```json
        {
          "from": "GBP",
          "to": "INR",
          "period": "1M"
        }
        ```
        - `from`: Base currency (e.g., `GBP`)
        - `to`: Target currency (e.g., `INR`)
        - `period`: Time period for data (options: `1M`, `3M`)

      - Example response:
        ```json
        [
          {
            "timestamp": 1672531200,
            "open": 88.123,
            "high": 89.234,
            "low": 87.789,
            "close": 88.900,
            "volume": 1000000,
            "currency_pair": "GBPINR=X"
          }
        ]
        ```

4. **Scheduled Cron Job**: 
    - The cron job scrapes exchange rates daily at midnight for the following currency pairs:
        - `GBP/INR`
        - `AED/INR`
    - It fetches data for periods: `1W`, `1M`, `3M`, `6M`, `1Y`.

5. **Database Schema**: 
    - SQLite database stores exchange rates in the `exchange_rates` table with the following fields:
      - `timestamp`: Unix timestamp (primary key)
      - `open`: Opening price
      - `high`: Highest price
      - `low`: Lowest price
      - `close`: Closing price
      - `volume`: Trade volume
      - `currency_pair`: Currency pair identifier (e.g., `GBPINR=X`)

## Dependencies

- axios
- sqlite3
- express
- body-parser
- cron

## License

This project is licensed under the MIT License.
