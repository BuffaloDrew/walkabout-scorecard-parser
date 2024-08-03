# Walkabout Scorecard Parser

This command-line application parses Walkabout mini golf scorecard images using Anthropic's Claude API and outputs the data in a specified JSON format. It uses ES modules for improved modularity and future compatibility.

## Demo

https://github.com/user-attachments/assets/2cdfc49f-67f6-42f3-84ca-4390d5e44239



## Prerequisites

- Node.js (v14.8.0 or later, as ES modules support is required)
- npm (Node Package Manager)
- An Anthropic API key

## Installation

1. Clone this repository or download the source code.
2. Navigate to the project directory in your terminal.
3. Run `npm install` to install the required dependencies.

## Configuration

1. Create a `.env` file in the project root directory.
2. Add your Anthropic API key to the `.env` file:
   ```
   ANTHROPIC_API_KEY=your_api_key_here
   ```

## Usage

Run the script with the following command:

```
node parse.js <path_to_scorecard.png> [options]
```

Replace `<path_to_scorecard.png>` with the actual path to your scorecard image file.

### Options

- `-f, --format`: Format the output JSON (default: false)
- `-n, --no-animation`: Disable the loading animation (default: false)
- `-h, --help`: Show help

Examples:

```
node parse.js scorecard.png
node parse.js scorecard.png --format
node parse.js scorecard.png --no-animation
node parse.js scorecard.png -f -n
```

The script will output the parsed data in JSON format to the console.

## Output Format

The script will generate JSON output in the following format:

```json
{
  "course": {
    "name": "Course Name",
    "holes": [par1, par2, ..., par18]
  },
  "players": {
    "player1": [score1, score2, ..., score18],
    "player2": [score1, score2, ..., score18],
    ...
  }
}
```

## Troubleshooting

- Ensure your Anthropic API key is correctly set in the `.env` file.
- Make sure the image file path is correct and the file exists.
- If you encounter any errors, check the console output for error messages.
- Ensure you're using a Node.js version that supports ES modules (v14.8.0 or later).

## License

This project is open-source and available under the MIT License.
