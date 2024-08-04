import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import ora from 'ora';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

dotenv.config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const argv = yargs(hideBin(process.argv))
  .option('format', {
    alias: 'f',
    type: 'boolean',
    description: 'Format the output JSON',
    default: false,
  })
  .option('no-animation', {
    alias: 'n',
    type: 'boolean',
    description: 'Disable the loading animation',
    default: false,
  })
  .help()
  .alias('help', 'h')
  .parse();

function getMediaType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  switch (extension) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    default:
      throw new Error(`Unsupported image format: ${extension}`);
  }
}

async function validateAndConvertImage(imagePath) {
  const mediaType = getMediaType(imagePath);
  let imageBuffer = await sharp(imagePath).toBuffer();

  // If it's a PNG, try converting to JPEG
  if (mediaType === 'image/png') {
    try {
      imageBuffer = await sharp(imageBuffer).jpeg().toBuffer();
      return { buffer: imageBuffer, mediaType: 'image/jpeg' };
    } catch (error) {
      console.warn(
        'Failed to convert PNG to JPEG. Proceeding with original PNG.',
      );
    }
  }

  return { buffer: imageBuffer, mediaType };
}

async function parseScorecard(imagePath) {
  let imageData;
  try {
    imageData = await validateAndConvertImage(imagePath);
  } catch (error) {
    console.error('Error processing image:', error);
    process.exit(1);
  }

  const base64Image = imageData.buffer.toString('base64');

  const prompt = `Parse the following Walkabout mini golf scorecard image and output the data in this JSON format:

{
  "course": {
    "name": "Course Name", // course name parsed from screenshot
    "holes": [par1, par2, ..., par18] // pars for the holes
  },
  "players": {
    "player1": [score1, score2, ..., score18],
    "player2": [score1, score2, ..., score18],
    // ... additional players if present
  }
}

Ensure the JSON is correctly formatted and includes all visible data from the scorecard. Only include JSON in your response.`;

  try {
    const spinner = ora('Parsing scorecard...').start();
    if (argv.noAnimation) {
      spinner.stop();
    }

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 2500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: imageData.mediaType,
                data: base64Image,
              },
            },
          ],
        },
      ],
    });

    if (!argv.noAnimation) {
      spinner.succeed('Scorecard parsed successfully!');
    }

    const parsedData = JSON.parse(response.content[0].text);
    return argv.format
      ? JSON.stringify(parsedData, null, 2)
      : JSON.stringify(parsedData);
  } catch (error) {
    if (!argv.noAnimation) {
      ora().fail('Error parsing scorecard');
    }
    console.error('Error details:', error);
    process.exit(1);
  }
}

async function main() {
  if (argv._.length !== 1) {
    console.error('Usage: node parse.js <path_to_scorecard_image> [options]');
    process.exit(1);
  }

  const imagePath = argv._[0];
  if (!fs.existsSync(imagePath)) {
    console.error(`File not found: ${imagePath}`);
    process.exit(1);
  }

  try {
    const result = await parseScorecard(imagePath);
    console.log(result);
  } catch (error) {
    console.error('An error occurred:', error);
    process.exit(1);
  }
}

main();
