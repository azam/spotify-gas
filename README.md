# spotify-gas : Spotify history aggregator to Google Sheet

## Installation

(TODO)

1. Create new Google Apps Script project
1. Add sources
1. Set script properties
    * `ClientId`: Spotify Oath2 client ID
    * `ClientSecret`: Spotify Oath2 secret
    * `ClientLanguage`: Language used when fetching track/album/artist data (Some tracks have multilingual data)
    * `ScrapeAfter`: Set empty. Used for maintenance
    * `SheetName`: Sheet name on spreadsheet to record played data
    * `SpreadsheetId`: Spreadsheet to use
1. Set cron trigger to call `scrape`, recommended interval is 30s


## License

MIT License Copyright (c) 2022 Azamshul Azizy
