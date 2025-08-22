Write a Nodejs script that:

Given:

- the URL to a zip file.
- the maximum age permitted for our project directory in hours.

When 

- Called using the following command: `node <URL_TO_SCRIPT_FILE>`.

Then:

- Checks if the target parent directory (`.aideas/.automate-ideas-to-social-mcp`), exists in the user home directory, or is older than the maximum age permitted for our project directory in hours.

- Downloads and extract the zip file, only if the target directory does not exist, or its age is greater than the maximum age permitted for our project directory in hours.

  - Downloads and extracts the zip file into the target parent directory.

  - Deletes the zip file after extraction.

- Runs the following commands from within the extracted directory which is within the target parent directory.

- `npm install`.

- `npm run build`.

- `node ./build/index.js`.

Technical specifications:

- The script is written in JavaScript (or TypeScript) for Nodejs

- The script does not have any external dependency (like unzipper). 

- The script uses only built-in modules to  unzip/extract the zip file.

